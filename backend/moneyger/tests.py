from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from moneyger.parsers import parse_capture, parse_boleto, parse_quick_text, parse_receipt, parse_pix_emv
from moneyger.matching import find_payment_matches, apply_payment_match
from moneyger.models import (
    Transaction, InstallmentPlan, Account, RecurringRule,
    TransactionStatus, TransactionSource, InboxStatus,
)
from moneyger import persona
from users.access import user_has_moneyger_access, apps_payload_for_user

User = get_user_model()


class AccessTests(TestCase):
    def test_allowlist_renanrds(self):
        user = User.objects.create_user(
            username='renanrds', email='renan@example.com', password='x',
        )
        self.assertTrue(user_has_moneyger_access(user))
        self.assertTrue(apps_payload_for_user(user)['moneyger'])

    def test_other_user_denied(self):
        user = User.objects.create_user(
            username='other', email='other@example.com', password='x',
        )
        self.assertFalse(user_has_moneyger_access(user))

    def test_superuser_allowed(self):
        user = User.objects.create_superuser(
            username='admin', email='admin@example.com', password='x',
        )
        self.assertTrue(user_has_moneyger_access(user))


class ParserTests(TestCase):
    def test_quick_text(self):
        r = parse_quick_text('45,90 mercado pix')
        self.assertEqual(r.amount, Decimal('45.90'))
        self.assertEqual(r.payment_method, 'pix')
        self.assertIn('mercado', r.description.lower())

    def test_boleto_linha_47(self):
        # Synthetic 47-digit line (not a real bank slip) — parser should accept length
        digits = '23793381286000000000000000000000000000000000000'
        self.assertEqual(len(digits), 47)
        r = parse_boleto(digits)
        self.assertIsNotNone(r)
        self.assertEqual(r.payment_method, 'boleto')

    def test_parse_capture_routes_quick(self):
        r = parse_capture('120 aluguel')
        self.assertEqual(r.amount, Decimal('120.00'))

    def test_receipt_comprovante(self):
        text = (
            'Comprovante de pagamento\n'
            'PIX enviado com sucesso\n'
            'Valor: R$ 150,00\n'
            'Para: Companhia de Luz\n'
            'Autenticação: E2E1234567890ABCD\n'
            'Data: 18/09/2026'
        )
        r = parse_receipt(text)
        self.assertIsNotNone(r)
        self.assertEqual(r.amount, Decimal('150.00'))
        self.assertEqual(r.hints.get('kind'), 'receipt')
        self.assertIn('Companhia', r.hints.get('merchant', ''))

    def test_boleto_pdf_ocr_is_pending_bill_not_receipt(self):
        text = (
            'BANCO DO BRASIL\n001-9\nRECIBO DO SACADO\n'
            'ATIVOS S.A.\nSecuritizadora de Créditos Financeiros\n'
            'PARCELA 1/8\nACORDO Nº. 47127186\n'
            'Nosso número Número do documento\n28172280994596431 994596431\n'
            'Espécie =) Valor do Documento\nR$ R$ 137,07\n'
            'Sacado:\nRENAN RIBEIRO DA SILVA\n'
            'Autenticação Mecânica\n'
            'FICHA DE COMPENSAÇÃO\n'
            'BANCO DO BRASIL 001-9 00190.00009 02817.228097 94596.431174 1 15770000013707\n'
            'Local de Pagamento Vencimento\n22/09/2026\n'
            'Após a data de vencimento cobrar multa de 2%.\n'
        )
        r = parse_capture(text)
        self.assertEqual(r.hints.get('kind'), 'bill')
        self.assertTrue(r.hints.get('is_bill'))
        self.assertEqual(r.hints.get('transaction_status'), 'pending')
        self.assertEqual(r.payment_method, 'boleto')
        self.assertEqual(r.amount, Decimal('137.07'))
        self.assertNotEqual(r.hints.get('kind'), 'receipt')
        self.assertIn('Acordo', r.description)
        self.assertEqual(r.hints.get('current_installment'), 1)
        self.assertEqual(r.hints.get('total_installments'), 8)
        self.assertEqual(r.hints.get('agreement_id'), '47127186')
        self.assertEqual(r.due_on.isoformat(), '2026-09-22')
        self.assertEqual(r.hints.get('due_on'), '2026-09-22')
        self.assertEqual(r.hints.get('due_source'), 'ocr')

    def test_boleto_factor_uses_new_febraban_cycle(self):
        # fator 1577 no ciclo antigo = ~2002; no novo ciclo FEBRABAN = 22/09/2026
        digits = '00190000090281722809794596431174115770000013707'
        self.assertEqual(len(digits), 47)
        r = parse_boleto(digits)
        self.assertIsNotNone(r)
        self.assertEqual(r.amount, Decimal('137.07'))
        self.assertEqual(r.due_on.isoformat(), '2026-09-22')

    def test_nubank_receipt_extracts_payee_not_label(self):
        text = (
            'Comprovante de pagamento\n18 SET 2026 - 08:14:59\n'
            'Valor ID da transação\nR$ 137,07 E18236120202609181114s06a9a3fcc1\n'
            'Tipo de transferência\nPix\n'
            'Destino\nNome Instituição\nCONSUMIDOR POSITIVO LTDA CELCOIN IP S.A.\n'
            'Nome do recebedor\nAcordo Certo\n'
            'ID da transação: E18236120202609181114s06a9a3fcc1\n'
            'Vencimento\n22/09/2026\n'
        )
        r = parse_capture(text)
        self.assertEqual(r.hints.get('kind'), 'receipt')
        self.assertEqual(r.amount, Decimal('137.07'))
        self.assertIn('Acordo Certo', r.hints.get('merchant', ''))
        self.assertNotIn('Instituição', r.hints.get('merchant', ''))
        self.assertEqual(r.occurred_on.isoformat(), '2026-09-18')

    def test_pix_emv_extracts_merchant(self):
        def tlv(tag: str, value: str) -> str:
            return f'{tag}{len(value):02d}{value}'

        # Payload format indicator + merchant account + amount + country + name + city
        mai = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', 'chave-teste@pix.com')
        emv = (
            tlv('00', '01')
            + tlv('26', mai)
            + tlv('52', '0000')
            + tlv('53', '986')
            + tlv('54', '100.00')
            + tlv('58', 'BR')
            + tlv('59', 'Loja Exemplo')
            + tlv('60', 'SAO PAULO')
            + tlv('62', tlv('05', 'TXID123'))
            + '6304ABCD'
        )
        r = parse_pix_emv(emv)
        self.assertIsNotNone(r)
        self.assertEqual(r.payment_method, 'pix')
        self.assertEqual(r.amount, Decimal('100.00'))
        self.assertEqual(r.hints.get('merchant'), 'Loja Exemplo')
        self.assertEqual(r.hints.get('city'), 'SAO PAULO')

    def test_persona_snippets(self):
        self.assertIn('Gastôncio', persona.greet_need_code())
        self.assertIn('Pronto', persona.linked_ok('Renan'))
        self.assertIn('/saldo', persona.help_text())
        preview = persona.capture_preview({
            'amount': '45.00', 'description': 'mercado', 'type': 'expense',
            'payment_method': 'pix', 'confidence': 0.8,
            'hints': {'category_name': 'Mercado'},
        })
        self.assertIn('R$ 45,00', preview)
        self.assertIn('Mercado', preview)
        self.assertNotIn('confiança', preview.lower())
        keys = [b['callback_data'] for row in persona.nav_markup()['inline_keyboard'] for b in row]
        self.assertIn('mg:nav:saldo', keys)


class MatchingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='renanrds', email='renan@example.com', password='x',
        )
        self.account = Account.objects.create(
            user=self.user, name='Geral', account_type='checking', initial_balance=Decimal('1000'),
        )

    def test_receipt_matches_pending_boleto_tx(self):
        from datetime import date
        from moneyger.matching import apply_payment_match, find_payment_matches

        pending = Transaction.objects.create(
            user=self.user,
            account=self.account,
            type='expense',
            amount=Decimal('137.07'),
            occurred_on=date(2026, 9, 22),
            description='Acordo Certo · parcela 1/8',
            payment_method='boleto',
            external_ref='28172280994596431',
            source=TransactionSource.TELEGRAM,
            status=TransactionStatus.PENDING,
        )
        matches = find_payment_matches(
            self.user, Decimal('137.07'), date(2026, 9, 18),
        )
        self.assertTrue(matches)
        self.assertEqual(matches[0]['kind'], 'pending_tx')
        self.assertEqual(matches[0]['id'], pending.id)
        result = apply_payment_match(
            user=self.user,
            match=matches[0],
            occurred_on=date(2026, 9, 18),
            receipt_ref='E18236120202609181114s06a9a3fcc1',
        )
        self.assertTrue(result['ok'])
        pending.refresh_from_db()
        self.assertEqual(pending.status, TransactionStatus.CONFIRMED)

    def test_boleto_creates_installment_plan(self):
        from datetime import date
        from moneyger.services import register_bill_expense

        payload = {
            'description': 'Acordo Certo · parcela 1/8 · acordo 47127186',
            'amount': '137.07',
            'hints': {
                'kind': 'bill',
                'is_bill': True,
                'current_installment': 1,
                'total_installments': 8,
                'agreement_id': '47127186',
            },
        }
        tx, plan = register_bill_expense(
            user=self.user,
            account=self.account,
            payload=payload,
            occurred_on=date(2026, 9, 22),
            amount=Decimal('137.07'),
            description=payload['description'],
            payment_method='boleto',
            external_ref='28172280994596431',
            source=TransactionSource.TELEGRAM,
        )
        self.assertEqual(tx.status, TransactionStatus.PENDING)
        self.assertIsNotNone(plan)
        self.assertEqual(plan.total_installments, 8)
        self.assertEqual(plan.paid_installments, 0)
        self.assertEqual(plan.installment_amount, Decimal('137.07'))
        self.assertEqual(plan.total_amount, Decimal('137.07') * 8)
        self.assertEqual(plan.next_due_on, date(2026, 9, 22))
        self.assertIn('acordo:47127186', plan.notes)
        self.assertIn(f'parcelamento:{plan.id}', tx.notes)

        tx2, plan2 = register_bill_expense(
            user=self.user,
            account=self.account,
            payload=payload,
            occurred_on=date(2026, 9, 22),
            amount=Decimal('137.07'),
            description=payload['description'],
            payment_method='boleto',
            source=TransactionSource.TELEGRAM,
        )
        self.assertEqual(plan2.id, plan.id)
        self.assertEqual(InstallmentPlan.objects.filter(user=self.user).count(), 1)

        matches = find_payment_matches(self.user, Decimal('137.07'), date(2026, 9, 18))
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]['kind'], 'installment')
        self.assertEqual(matches[0]['id'], plan.id)
        self.assertEqual(matches[0].get('pending_tx_id'), tx.id)
        self.assertIn('parcela 1/8', matches[0]['label'])
        self.assertFalse(any(m['kind'] == 'pending_tx' for m in matches))

        from moneyger.matching import find_document_duplicates
        bill_payload = {
            **payload,
            'external_ref': '28172280994596431',
            'hints': {
                **payload['hints'],
                'nosso_numero': '28172280994596431',
                'is_bill': True,
                'kind': 'bill',
            },
        }
        dups = find_document_duplicates(self.user, bill_payload)
        self.assertTrue(dups)
        self.assertEqual(dups[0]['kind'], 'transaction')

        result = apply_payment_match(
            user=self.user,
            match=matches[0],
            occurred_on=date(2026, 9, 18),
            receipt_ref='E18236120202609181114s06a9a3fcc1',
        )
        self.assertTrue(result['ok'])
        paid = Transaction.objects.get(pk=result['transaction_id'])
        plan.refresh_from_db()
        self.assertEqual(paid.status, TransactionStatus.CONFIRMED)
        self.assertEqual(plan.paid_installments, 1)
        self.assertEqual(Transaction.objects.filter(user=self.user, status=TransactionStatus.CONFIRMED).count(), 1)

        receipt_payload = {
            'amount': '137.07',
            'external_ref': 'E18236120202609181114s06a9a3fcc1',
            'hints': {
                'kind': 'receipt',
                'is_payment_receipt': True,
                'auth_code': 'E18236120202609181114s06a9a3fcc1',
            },
        }
        receipt_dups = find_document_duplicates(self.user, receipt_payload)
        self.assertTrue(receipt_dups)
        self.assertEqual(receipt_dups[0]['kind'], 'transaction')

    def test_match_and_abate_installment(self):
        from datetime import date
        plan = InstallmentPlan.objects.create(
            user=self.user,
            account=self.account,
            description='Notebook',
            total_amount=Decimal('1200'),
            installment_amount=Decimal('100.00'),
            total_installments=12,
            paid_installments=0,
            start_on=date(2026, 9, 1),
            next_due_on=date(2026, 9, 18),
            payment_method='credit',
        )
        matches = find_payment_matches(self.user, Decimal('100.00'), date(2026, 9, 18))
        self.assertTrue(any(m['kind'] == 'installment' and m['id'] == plan.id for m in matches))
        result = apply_payment_match(
            user=self.user,
            match=matches[0],
            occurred_on=date(2026, 9, 18),
            receipt_ref='E2ETEST',
        )
        self.assertTrue(result['ok'])
        plan.refresh_from_db()
        self.assertEqual(plan.paid_installments, 1)


class MoneygerApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='renanrds', email='renan@example.com', password='testpass123',
        )
        self.other = User.objects.create_user(
            username='visitor', email='visitor@example.com', password='testpass123',
        )
        self.client = APIClient()

    def test_forbidden_for_non_allowlist(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.get('/api/moneyger/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_and_account_flow(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/moneyger/accounts/', {
            'name': 'Nubank',
            'account_type': 'checking',
            'initial_balance': '100.00',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        account_id = res.data['id']

        res = self.client.get('/api/moneyger/categories/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 5)

        cat_id = res.data[0]['id']
        res = self.client.post('/api/moneyger/transactions/', {
            'account': account_id,
            'category': cat_id,
            'type': 'expense',
            'amount': '30.00',
            'occurred_on': '2026-09-17',
            'description': 'Teste',
            'payment_method': 'pix',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        res = self.client.post('/api/moneyger/capture/', {
            'text': '15 cafe pix',
            'account_id': account_id,
            'create_transaction': True,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('transaction', res.data)

        res = self.client.get('/api/moneyger/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_balance', res.data)
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 2)

        patch = self.client.patch(f'/api/moneyger/accounts/{account_id}/', {
            'name': 'Nubank Atualizado',
            'initial_balance': '250.00',
        }, format='json')
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data['name'], 'Nubank Atualizado')
        self.assertEqual(patch.data['initial_balance'], '250.00')
        self.assertIn('balance', patch.data)

        deleted = self.client.delete(f'/api/moneyger/accounts/{account_id}/')
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        listed = self.client.get('/api/moneyger/accounts/')
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data), 0)

    def test_login_exposes_apps(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'renan@example.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['user']['apps']['moneyger'])
        self.assertIn('is_superuser', res.data['user'])

    def test_fixed_and_installment_planning(self):
        self.client.force_authenticate(user=self.user)
        acc = self.client.post('/api/moneyger/accounts/', {
            'name': 'Cartão', 'account_type': 'credit', 'initial_balance': '0',
            'limit_amount': '5000.00',
        }, format='json').data

        fixed = self.client.post('/api/moneyger/recurring/', {
            'account': acc['id'],
            'type': 'expense',
            'nature': 'fixed',
            'amount': '1200.00',
            'description': 'Aluguel',
            'frequency': 'monthly',
            'next_due_on': '2026-10-05',
            'payment_method': 'pix',
        }, format='json')
        self.assertEqual(fixed.status_code, status.HTTP_201_CREATED)

        plan = self.client.post('/api/moneyger/installments/', {
            'account': acc['id'],
            'description': 'Notebook',
            'total_amount': '3600.00',
            'installment_amount': '300.00',
            'total_installments': 12,
            'start_on': '2026-09-18',
            'next_due_on': '2026-09-18',
            'payment_method': 'credit',
        }, format='json')
        self.assertEqual(plan.status_code, status.HTTP_201_CREATED)
        self.assertEqual(plan.data['remaining_installments'], 12)

        pay = self.client.post(f"/api/moneyger/installments/{plan.data['id']}/pay/", {}, format='json')
        self.assertEqual(pay.status_code, status.HTTP_200_OK)
        self.assertEqual(pay.data['plan']['paid_installments'], 1)
        self.assertEqual(Transaction.objects.filter(user=self.user, description__startswith='Notebook').count(), 1)

    def test_credit_card_bill_does_not_drain_checking_until_paid(self):
        self.client.force_authenticate(user=self.user)
        checking = self.client.post('/api/moneyger/accounts/', {
            'name': 'Conta geral', 'account_type': 'checking', 'initial_balance': '2000.00',
        }, format='json').data
        card = self.client.post('/api/moneyger/accounts/', {
            'name': 'Cartão', 'account_type': 'credit', 'initial_balance': '0',
            'limit_amount': '5000.00',
        }, format='json').data

        cats = self.client.get('/api/moneyger/categories/').data
        cat_id = next(c['id'] for c in cats if c['kind'] == 'expense')

        buy = self.client.post('/api/moneyger/transactions/', {
            'account': card['id'],
            'category': cat_id,
            'type': 'expense',
            'amount': '300.00',
            'occurred_on': '2026-09-10',
            'description': 'Compra cartão',
            'payment_method': 'credit',
        }, format='json')
        self.assertEqual(buy.status_code, status.HTTP_201_CREATED)

        checking_after = self.client.get(f"/api/moneyger/accounts/{checking['id']}/").data
        card_after = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(checking_after['balance'], '2000.00')
        self.assertEqual(card_after['balance'], '300.00')
        self.assertEqual(card_after['role'], 'liability')

        pay = self.client.post(f"/api/moneyger/accounts/{card['id']}/pay-bill/", {
            'from_account': checking['id'],
            'amount': '300.00',
            'occurred_on': '2026-09-30',
        }, format='json')
        self.assertEqual(pay.status_code, status.HTTP_201_CREATED)

        checking_paid = self.client.get(f"/api/moneyger/accounts/{checking['id']}/").data
        card_paid = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(checking_paid['balance'], '1700.00')
        self.assertEqual(card_paid['balance'], '0.00')

        dash = self.client.get('/api/moneyger/dashboard/', {'year': 2026, 'month': 9}).data
        self.assertEqual(dash['available_balance'], '1700.00')
        self.assertEqual(dash['credit_debt'], '0.00')

    def test_budget_and_category_management(self):
        self.client.force_authenticate(user=self.user)
        cat = self.client.post('/api/moneyger/categories/', {
            'name': 'Pets', 'kind': 'expense', 'color': '#22c55e',
        }, format='json')
        self.assertEqual(cat.status_code, status.HTTP_201_CREATED)

        budget = self.client.post('/api/moneyger/budgets/', {
            'category': cat.data['id'],
            'year': 2026,
            'month': 9,
            'limit_amount': '400.00',
        }, format='json')
        self.assertEqual(budget.status_code, status.HTTP_201_CREATED)

        patched = self.client.patch(f"/api/moneyger/budgets/{budget.data['id']}/", {
            'limit_amount': '500.00',
        }, format='json')
        self.assertEqual(patched.status_code, status.HTTP_200_OK)
        self.assertEqual(patched.data['limit_amount'], '500.00')

        deleted = self.client.delete(f"/api/moneyger/budgets/{budget.data['id']}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)

        archived = self.client.delete(f"/api/moneyger/categories/{cat.data['id']}/")
        self.assertEqual(archived.status_code, status.HTTP_204_NO_CONTENT)
        listed = self.client.get('/api/moneyger/categories/').data
        self.assertFalse(any(c['id'] == cat.data['id'] for c in listed))

    def test_inbox_attachment_stream(self):
        from django.core.files.base import ContentFile
        from moneyger.models import InboxItem, InboxStatus, TransactionSource
        from PIL import Image
        from io import BytesIO

        self.client.force_authenticate(user=self.user)
        buf = BytesIO()
        Image.new('RGB', (40, 20), color=(20, 180, 80)).save(buf, format='JPEG')
        item = InboxItem.objects.create(
            user=self.user,
            raw_text='Comprovante',
            parsed_payload={'amount': '10.00', 'hints': {'mime': 'image/jpeg', 'ocr_status': 'ok'}},
            confidence=0.8,
            source=TransactionSource.TELEGRAM,
            status=InboxStatus.PENDING,
        )
        item.attachment.save('test.jpg', ContentFile(buf.getvalue()), save=True)

        listed = self.client.get('/api/moneyger/inbox/')
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertTrue(listed.data[0]['has_attachment'])
        self.assertIn('/attachment/', listed.data[0]['attachment_url'])

        att = self.client.get(f'/api/moneyger/inbox/{item.id}/attachment/')
        self.assertEqual(att.status_code, status.HTTP_200_OK)
        self.assertIn('image', att['Content-Type'])


class MediaIngestTests(TestCase):
    def test_pick_photo_largest(self):
        from moneyger.media_ingest import pick_telegram_file_id
        msg = {
            'photo': [
                {'file_id': 'small', 'file_unique_id': 'a'},
                {'file_id': 'large', 'file_unique_id': 'b'},
            ],
        }
        fid, name = pick_telegram_file_id(msg)
        self.assertEqual(fid, 'large')
        self.assertTrue(name.endswith('.jpg'))

    def test_ocr_image_mocked(self):
        from unittest.mock import patch
        from moneyger.ocr import extract_text_from_bytes
        from PIL import Image
        from io import BytesIO

        buf = BytesIO()
        Image.new('RGB', (80, 40), color=(255, 255, 255)).save(buf, format='PNG')
        with patch('pytesseract.image_to_string', return_value='Comprovante R$ 10,00'):
            result = extract_text_from_bytes(buf.getvalue(), 'image/png', 'x.png')
        self.assertEqual(result.status, 'ok')
        self.assertIn('10', result.text)


class SmartBotTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='renanrds', email='renan@example.com', password='x',
        )
        self.account = Account.objects.create(
            user=self.user, name='Conta', account_type='checking', initial_balance=Decimal('1000'),
        )

    def test_nl_gastei(self):
        from datetime import date, timedelta
        r = parse_quick_text('gastei 45 no mercado')
        self.assertEqual(r.amount, Decimal('45.00'))
        self.assertEqual(r.type, 'expense')
        self.assertIn('mercado', r.description.lower())

        r2 = parse_quick_text('ontem gastei 30 no café')
        self.assertEqual(r2.amount, Decimal('30.00'))
        self.assertEqual(r2.occurred_on, date.today() - timedelta(days=1))

    def test_nl_recebi(self):
        r = parse_quick_text('recebi 2000 salário')
        self.assertEqual(r.amount, Decimal('2000.00'))
        self.assertEqual(r.type, 'income')
        self.assertIn('salário', r.description.lower())

        r2 = parse_quick_text('entrou 500')
        self.assertEqual(r2.amount, Decimal('500.00'))
        self.assertEqual(r2.type, 'income')

    def test_category_hint_in_text(self):
        r = parse_quick_text('50 uber categoria Transporte')
        self.assertEqual(r.amount, Decimal('50.00'))
        self.assertEqual((r.hints or {}).get('category_hint'), 'Transporte')

    def test_detect_status_intent(self):
        from moneyger.telegram import detect_status_intent
        self.assertEqual(detect_status_intent('/saldo'), 'saldo')
        self.assertEqual(detect_status_intent('/resumo@MeuBot'), 'resumo')
        self.assertEqual(detect_status_intent('ajuda'), 'help')
        self.assertEqual(detect_status_intent('quanto gastei esse mês'), 'resumo')
        self.assertEqual(detect_status_intent('meu saldo'), 'saldo')
        self.assertEqual(detect_status_intent('o que vence'), 'pendentes')
        self.assertIsNone(detect_status_intent('45 mercado'))
        self.assertIsNone(detect_status_intent('gastei 45 no mercado'))

    def test_suggest_category_and_enrich(self):
        from moneyger.services import suggest_category, enrich_payload_category, ensure_default_categories
        ensure_default_categories(self.user)
        cat = suggest_category(self.user, 'compras no mercado', 'expense')
        self.assertIsNotNone(cat)
        self.assertEqual(cat.name, 'Mercado')

        payload = enrich_payload_category(self.user, {
            'amount': '45.00',
            'description': 'mercado',
            'type': 'expense',
            'hints': {},
        })
        self.assertEqual(payload.get('category_id'), cat.id)
        self.assertEqual(payload['hints'].get('category_name'), 'Mercado')

    def test_dashboard_snapshot(self):
        from moneyger.services import build_dashboard_snapshot, ensure_default_categories
        from moneyger.models import Transaction, TransactionStatus, TransactionSource
        ensure_default_categories(self.user)
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            type='expense',
            amount=Decimal('80.00'),
            occurred_on=timezone_today(),
            description='teste',
            source=TransactionSource.MANUAL,
            status=TransactionStatus.CONFIRMED,
        )
        snap = build_dashboard_snapshot(self.user)
        self.assertIn('accounts', snap)
        self.assertEqual(Decimal(snap['month_expense']), Decimal('80.00'))
        self.assertGreaterEqual(len(snap['accounts']), 1)

    def test_telegram_confirm_with_category(self):
        from unittest.mock import patch
        from moneyger.models import InboxItem, InboxStatus, TransactionSource, Category
        from moneyger.services import ensure_default_categories
        from moneyger.telegram import TelegramWebhookView

        ensure_default_categories(self.user)
        cat = Category.objects.get(user=self.user, name='Mercado', kind='expense')
        from moneyger.models import TelegramLink
        TelegramLink.objects.create(user=self.user, chat_id='999001')

        item = InboxItem.objects.create(
            user=self.user,
            raw_text='gastei 45 no mercado',
            parsed_payload={
                'amount': '45.00',
                'description': 'mercado',
                'type': 'expense',
                'payment_method': 'other',
                'category_id': cat.id,
                'hints': {'kind': 'quick_text', 'category_name': 'Mercado'},
            },
            confidence=0.8,
            source=TransactionSource.TELEGRAM,
            status=InboxStatus.PENDING,
        )
        view = TelegramWebhookView()
        with patch('moneyger.telegram.send_telegram_message'):
            resp = view._handle_callback({
                'data': f'mg:ok:{item.id}',
                'message': {'chat': {'id': 999001}},
            })
        self.assertEqual(resp.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.status, InboxStatus.CONFIRMED)
        tx = item.resulting_transaction
        self.assertIsNotNone(tx)
        self.assertEqual(tx.category_id, cat.id)
        self.assertEqual(tx.amount, Decimal('45.00'))

    def test_telegram_edit_payment_method(self):
        from unittest.mock import patch
        from moneyger.models import InboxItem, InboxStatus, TransactionSource, TelegramLink
        from moneyger.telegram import TelegramWebhookView, _method_picker_markup

        TelegramLink.objects.create(user=self.user, chat_id='999002')
        item = InboxItem.objects.create(
            user=self.user,
            raw_text='45 mercado',
            parsed_payload={
                'amount': '45.00',
                'description': 'mercado',
                'type': 'expense',
                'payment_method': 'other',
                'hints': {'kind': 'quick_text'},
            },
            confidence=0.8,
            source=TransactionSource.TELEGRAM,
            status=InboxStatus.PENDING,
        )
        markup = _method_picker_markup(item.id, 'other')
        keys = [btn['callback_data'] for row in markup['inline_keyboard'] for btn in row]
        self.assertIn(f'mg:pm:pix:{item.id}', keys)
        self.assertIn(f'mg:pm:credit:{item.id}', keys)

        view = TelegramWebhookView()
        with patch('moneyger.telegram.send_telegram_message') as send:
            resp = view._handle_callback({
                'data': f'mg:pm:pix:{item.id}',
                'message': {'chat': {'id': 999002}},
            })
        self.assertEqual(resp.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.parsed_payload.get('payment_method'), 'pix')
        self.assertTrue(send.called)

    def test_assign_account_sets_prepaid_method(self):
        from moneyger.telegram import _assign_account
        vale = Account.objects.create(
            user=self.user, name='VR', account_type='meal_voucher',
            initial_balance=Decimal('400'),
        )
        payload = _assign_account({'amount': '10', 'hints': {}}, vale)
        self.assertEqual(payload['account_id'], vale.id)
        self.assertEqual(payload['payment_method'], 'meal_voucher')
        self.assertEqual(payload['hints']['account_name'], 'VR')


def timezone_today():
    from django.utils import timezone
    return timezone.localdate()


class MarketModeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='renanrds', email='renan@example.com', password='x',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_start_check_complete(self):
        created = self.client.post('/api/moneyger/market-lists/', {
            'title': 'Sábado',
            'limit_amount': '200.00',
            'items_input': [
                {'name': 'Arroz'},
                {'name': 'Leite'},
            ],
        }, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        list_id = created.data['id']
        self.assertEqual(created.data['status'], 'draft')
        self.assertEqual(created.data['items_count'], 2)

        start = self.client.post(f'/api/moneyger/market-lists/{list_id}/start/')
        self.assertEqual(start.status_code, status.HTTP_200_OK)
        self.assertEqual(start.data['status'], 'active')

        item_id = start.data['items'][0]['id']
        check = self.client.post(
            f'/api/moneyger/market-lists/{list_id}/items/{item_id}/check/',
            {'price': '15.50'},
            format='json',
        )
        self.assertEqual(check.status_code, status.HTTP_200_OK)
        self.assertEqual(check.data['item']['is_checked'], True)
        self.assertEqual(check.data['list']['spent_total'], '15.50')
        self.assertEqual(check.data['list']['remaining'], '184.50')

        add = self.client.post(
            f'/api/moneyger/market-lists/{list_id}/items/',
            {'name': 'Pão'},
            format='json',
        )
        self.assertEqual(add.status_code, status.HTTP_201_CREATED)

        done = self.client.post(f'/api/moneyger/market-lists/{list_id}/complete/')
        self.assertEqual(done.status_code, status.HTTP_200_OK)
        self.assertEqual(done.data['status'], 'completed')

    def test_cannot_start_without_items(self):
        created = self.client.post('/api/moneyger/market-lists/', {
            'title': 'Vazia',
            'limit_amount': '50.00',
        }, format='json')
        list_id = created.data['id']
        start = self.client.post(f'/api/moneyger/market-lists/{list_id}/start/')
        self.assertEqual(start.status_code, status.HTTP_400_BAD_REQUEST)

    def test_completed_list_to_transaction(self):
        Account.objects.create(
            user=self.user, name='VA', account_type='meal_voucher',
            initial_balance=Decimal('500'), limit_amount=Decimal('500'),
        )
        created = self.client.post('/api/moneyger/market-lists/', {
            'title': 'Mercado',
            'limit_amount': '200.00',
            'items_input': [{'name': 'Arroz'}],
        }, format='json')
        list_id = created.data['id']
        self.client.post(f'/api/moneyger/market-lists/{list_id}/start/')
        item_id = self.client.get(f'/api/moneyger/market-lists/{list_id}/').data['items'][0]['id']
        self.client.post(
            f'/api/moneyger/market-lists/{list_id}/items/{item_id}/check/',
            {'price': '22.00'}, format='json',
        )
        self.client.post(f'/api/moneyger/market-lists/{list_id}/complete/')
        acc = Account.objects.get(user=self.user, account_type='meal_voucher')
        to_tx = self.client.post(
            f'/api/moneyger/market-lists/{list_id}/to-transaction/',
            {'account_id': acc.id},
            format='json',
        )
        self.assertEqual(to_tx.status_code, status.HTTP_201_CREATED)
        self.assertEqual(to_tx.data['transaction']['amount'], '22.00')
        self.assertEqual(to_tx.data['transaction']['payment_method'], 'meal_voucher')
        self.assertIsNotNone(to_tx.data['list']['resulting_transaction'])


class AccountLimitTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='renanrds', email='renan@example.com', password='x',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_credit_requires_limit(self):
        bad = self.client.post('/api/moneyger/accounts/', {
            'name': 'Cartão',
            'account_type': 'credit',
            'initial_balance': '0',
        }, format='json')
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

        ok = self.client.post('/api/moneyger/accounts/', {
            'name': 'Cartão',
            'account_type': 'credit',
            'initial_balance': '0',
            'limit_amount': '3000.00',
        }, format='json')
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ok.data['limit_amount'], '3000.00')
        self.assertEqual(ok.data['available'], '3000.00')

    def test_credit_available_subtracts_unpaid_installments(self):
        card = self.client.post('/api/moneyger/accounts/', {
            'name': 'Cartão',
            'account_type': 'credit',
            'initial_balance': '0',
            'limit_amount': '5000.00',
        }, format='json').data
        plan = self.client.post('/api/moneyger/installments/', {
            'account': card['id'],
            'description': 'Notebook',
            'total_amount': '3600.00',
            'installment_amount': '300.00',
            'total_installments': 12,
            'paid_installments': 0,
            'start_on': '2026-09-18',
            'payment_method': 'credit',
        }, format='json')
        self.assertEqual(plan.status_code, status.HTTP_201_CREATED)

        listed = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(listed['balance'], '0.00')
        self.assertEqual(listed['installment_commitment'], '3600.00')
        self.assertEqual(listed['available'], '1400.00')

        pay = self.client.post(
            f"/api/moneyger/installments/{plan.data['id']}/pay/",
            {'create_transaction': True},
            format='json',
        )
        self.assertEqual(pay.status_code, status.HTTP_200_OK)
        after_parcel = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(after_parcel['balance'], '300.00')
        self.assertEqual(after_parcel['installment_commitment'], '3300.00')
        self.assertEqual(after_parcel['available'], '1400.00')

        bill = self.client.post('/api/moneyger/accounts/', {
            'name': 'Corrente', 'account_type': 'checking', 'initial_balance': '1000.00',
        }, format='json').data
        paid_bill = self.client.post(f"/api/moneyger/accounts/{card['id']}/pay-bill/", {
            'from_account': bill['id'],
            'amount': '300.00',
            'occurred_on': '2026-09-30',
        }, format='json')
        self.assertEqual(paid_bill.status_code, status.HTTP_201_CREATED)
        after_bill = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(after_bill['balance'], '0.00')
        self.assertEqual(after_bill['installment_commitment'], '3300.00')
        self.assertEqual(after_bill['available'], '1700.00')

        marked = self.client.post(
            f"/api/moneyger/installments/{plan.data['id']}/pay/",
            {'create_transaction': False},
            format='json',
        )
        self.assertEqual(marked.status_code, status.HTTP_200_OK)
        after_mark = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(after_mark['balance'], '0.00')
        self.assertEqual(after_mark['installment_commitment'], '3000.00')
        self.assertEqual(after_mark['available'], '2000.00')

    def test_meal_voucher_is_prepaid_balance(self):
        ok = self.client.post('/api/moneyger/accounts/', {
            'name': 'VR',
            'account_type': 'meal_voucher',
            'initial_balance': '800.00',
        }, format='json')
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(ok.data['limit_amount'])
        self.assertEqual(ok.data['balance'], '800.00')
        self.assertEqual(ok.data['available'], '800.00')
        self.assertFalse(ok.data['requires_limit'])


class StatementAndResetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='renanrds', email='r@example.com', password='x')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_statement_groups_installments_without_transactions(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from moneyger.models import Transaction

        card = self.client.post('/api/moneyger/accounts/', {
            'name': 'Roxinho', 'account_type': 'credit', 'limit_amount': '5000.00',
        }, format='json').data
        csv_body = (
            'date,title,amount\n'
            '2026-09-18,Mercado Local,"52,88"\n'
            '2026-09-04,Pagamento recebido,"- 2.496,63"\n'
            '2026-09-11,iFood - NuPay - 1/2,"60,78"\n'
            '2026-08-31,Mercadolivre*Mercadol - Parcela 7/12,"39,03"\n'
        ).encode()
        upload = SimpleUploadedFile('nubank.csv', csv_body, content_type='text/csv')
        resp = self.client.post(
            f"/api/moneyger/accounts/{card['id']}/import-statement/",
            {'file': upload},
            format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['created'], 2)
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 0)
        mercado = InstallmentPlan.objects.get(description__startswith='Mercadolivre')
        self.assertEqual(mercado.paid_installments, 7)
        self.assertEqual(mercado.total_installments, 12)
        self.assertEqual(mercado.installment_amount, Decimal('39.03'))
        self.assertTrue(mercado.is_active)

    def test_mark_paid_without_transaction_and_initial_paid_count(self):
        from moneyger.models import Transaction

        acc = self.client.post('/api/moneyger/accounts/', {
            'name': 'Cartão', 'account_type': 'credit', 'limit_amount': '2000.00',
        }, format='json').data
        plan = self.client.post('/api/moneyger/installments/', {
            'account': acc['id'],
            'description': 'Sofá',
            'total_amount': '1000.00',
            'installment_amount': '100.00',
            'total_installments': 10,
            'paid_installments': 3,
            'start_on': '2026-01-10',
            'payment_method': 'credit',
        }, format='json')
        self.assertEqual(plan.status_code, status.HTTP_201_CREATED, plan.data)
        self.assertEqual(plan.data['paid_installments'], 3)
        self.assertEqual(plan.data['next_due_on'], '2026-04-10')
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 0)

        pay = self.client.post(
            f"/api/moneyger/installments/{plan.data['id']}/pay/",
            {'create_transaction': False},
            format='json',
        )
        self.assertEqual(pay.status_code, status.HTTP_200_OK)
        self.assertEqual(pay.data['plan']['paid_installments'], 4)
        self.assertIsNone(pay.data['transaction'])
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 0)

    def test_reset_requires_confirm_and_keeps_telegram(self):
        from moneyger.models import Account, TelegramLink

        self.client.post('/api/moneyger/accounts/', {
            'name': 'Conta', 'account_type': 'checking', 'initial_balance': '10.00',
        }, format='json')
        TelegramLink.objects.create(user=self.user, chat_id='999')
        denied = self.client.post('/api/moneyger/reset/', {}, format='json')
        self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Account.objects.filter(user=self.user).count(), 1)
        ok = self.client.post('/api/moneyger/reset/', {'confirm': 'ZERAR'}, format='json')
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertEqual(Account.objects.filter(user=self.user).count(), 0)
        self.assertEqual(TelegramLink.objects.filter(user=self.user).count(), 1)


class ActivityUndoAndQuantityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='renanrds', email='r@example.com', password='x')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _card_and_plan(self):
        card = self.client.post('/api/moneyger/accounts/', {
            'name': 'Cartão', 'account_type': 'credit', 'limit_amount': '2000.00',
        }, format='json').data
        plan = self.client.post('/api/moneyger/installments/', {
            'account': card['id'],
            'description': 'Sofá',
            'total_amount': '1000.00',
            'installment_amount': '100.00',
            'total_installments': 10,
            'paid_installments': 0,
            'start_on': '2026-01-10',
            'payment_method': 'credit',
        }, format='json')
        self.assertEqual(plan.status_code, status.HTTP_201_CREATED, plan.data)
        return card, plan.data

    def test_undo_pay_removes_transaction_and_restores_limit(self):
        card, plan = self._card_and_plan()
        paid = self.client.post(f"/api/moneyger/installments/{plan['id']}/pay/", {
            'create_transaction': True,
        }, format='json')
        self.assertEqual(paid.status_code, status.HTTP_200_OK)
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 1)
        mid = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(mid['balance'], '100.00')
        self.assertEqual(mid['installment_commitment'], '900.00')
        self.assertEqual(mid['available'], '1000.00')

        undone = self.client.post(f"/api/moneyger/installments/{plan['id']}/undo/", {}, format='json')
        self.assertEqual(undone.status_code, status.HTTP_200_OK)
        self.assertEqual(undone.data['plan']['paid_installments'], 0)
        self.assertEqual(undone.data['plan']['next_due_on'], '2026-01-10')
        self.assertTrue(undone.data['plan']['is_active'])
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 0)
        after = self.client.get(f"/api/moneyger/accounts/{card['id']}/").data
        self.assertEqual(after['balance'], '0.00')
        self.assertEqual(after['installment_commitment'], '1000.00')
        self.assertEqual(after['available'], '1000.00')

        again = self.client.post(f"/api/moneyger/installments/{plan['id']}/undo/", {}, format='json')
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)

    def test_undo_mark_without_transaction(self):
        _, plan = self._card_and_plan()
        marked = self.client.post(f"/api/moneyger/installments/{plan['id']}/pay/", {
            'create_transaction': False,
        }, format='json')
        self.assertEqual(marked.status_code, status.HTTP_200_OK)
        undone = self.client.post(f"/api/moneyger/installments/{plan['id']}/undo/", {}, format='json')
        self.assertEqual(undone.status_code, status.HTTP_200_OK)
        self.assertEqual(undone.data['plan']['paid_installments'], 0)
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 0)
        history = self.client.get('/api/moneyger/activity/').data
        summaries = [row['summary'] for row in history]
        self.assertTrue(any(text.startswith('Marcou parcela') for text in summaries))
        self.assertTrue(any(text.startswith('Desfez marcação') for text in summaries))
        self.assertFalse(any(row['undoable'] for row in history))

    def test_changing_transaction_account_moves_balance_and_logs(self):
        origin = self.client.post('/api/moneyger/accounts/', {
            'name': 'Origem', 'account_type': 'checking', 'initial_balance': '500.00',
        }, format='json').data
        dest = self.client.post('/api/moneyger/accounts/', {
            'name': 'Destino', 'account_type': 'checking', 'initial_balance': '20.00',
        }, format='json').data
        tx = self.client.post('/api/moneyger/transactions/', {
            'account': origin['id'],
            'type': 'expense',
            'amount': '40.00',
            'occurred_on': '2026-09-22',
            'description': 'Farmácia',
            'payment_method': 'debit',
        }, format='json')
        self.assertEqual(tx.status_code, status.HTTP_201_CREATED, tx.data)
        moved = self.client.patch(f"/api/moneyger/transactions/{tx.data['id']}/", {
            'account': dest['id'],
        }, format='json')
        self.assertEqual(moved.status_code, status.HTTP_200_OK)
        self.assertEqual(moved.data['account'], dest['id'])
        origin_after = self.client.get(f"/api/moneyger/accounts/{origin['id']}/").data
        dest_after = self.client.get(f"/api/moneyger/accounts/{dest['id']}/").data
        self.assertEqual(origin_after['balance'], '500.00')
        self.assertEqual(dest_after['balance'], '-20.00')
        history = self.client.get('/api/moneyger/activity/').data
        self.assertEqual(history[0]['action'], 'transaction_account')
        self.assertIn('Origem → Destino', history[0]['summary'])

    def test_market_check_multiplies_quantity(self):
        created = self.client.post('/api/moneyger/market-lists/', {
            'title': 'Feira',
            'limit_amount': '50.00',
            'items_input': [{'name': 'Banana'}],
        }, format='json')
        list_id = created.data['id']
        self.client.post(f'/api/moneyger/market-lists/{list_id}/start/')
        item_id = created.data['items'][0]['id']
        check = self.client.post(
            f'/api/moneyger/market-lists/{list_id}/items/{item_id}/check/',
            {'price': '2.50', 'units': '4'},
            format='json',
        )
        self.assertEqual(check.status_code, status.HTTP_200_OK, check.data)
        self.assertEqual(check.data['item']['unit_price'], '2.50')
        self.assertEqual(Decimal(check.data['item']['units']), Decimal('4'))
        self.assertEqual(check.data['item']['price'], '10.00')
        self.assertEqual(check.data['list']['spent_total'], '10.00')
        self.assertEqual(check.data['list']['remaining'], '40.00')


class BotMarketListTests(TestCase):
    def setUp(self):
        from moneyger.models import TelegramLink
        self.user = User.objects.create_user(username='renanrds', email='r@example.com', password='x')
        TelegramLink.objects.create(user=self.user, chat_id='4242')
        self.client = APIClient()

    def _update(self, payload):
        from unittest.mock import patch
        with patch('moneyger.telegram.telegram_webhook_secret', return_value=''), \
                patch('moneyger.market_bot.sweep_market_drafts'), \
                patch('moneyger.telegram.send_telegram_message') as send, \
                patch('moneyger.market_bot._reply') as reply:
            # _reply is what the feature uses; telegram.send is the transport.
            response = self.client.post('/api/moneyger/telegram/webhook/', payload, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        return reply, send

    def _text(self, text):
        return self._update({
            'message': {'chat': {'id': 4242}, 'text': text, 'message_id': 1},
        })

    def _callback(self, data):
        return self._update({
            'callback_query': {'data': data, 'message': {'chat': {'id': 4242}}},
        })

    def test_items_stay_pending_until_next_or_finish_and_remove_drops_them(self):
        from moneyger.models import BotMarketDraft, MarketList, MarketListItem, MarketListStatus

        reply, _send = self._text('/mercado')
        self.assertEqual(MarketList.objects.filter(user=self.user).count(), 0)
        self.assertIn('teto', reply.call_args[0][1].lower())

        reply, _send = self._text('180')
        draft = BotMarketDraft.objects.get(user=self.user)
        self.assertEqual(draft.phase, BotMarketDraft.Phase.ITEMS)
        self.assertEqual(draft.market_list.limit_amount, Decimal('180.00'))
        self.assertEqual(draft.market_list.items.count(), 0)

        self._text('arroz')
        draft.refresh_from_db()
        self.assertEqual(draft.pending_name, 'arroz')
        self.assertEqual(MarketListItem.objects.filter(market_list=draft.market_list).count(), 0)

        self._text('feijão')
        draft.refresh_from_db()
        self.assertEqual(draft.pending_name, 'feijão')
        self.assertEqual(
            list(draft.market_list.items.values_list('name', flat=True)),
            ['arroz'],
        )

        self._callback('mg:mk:rm')
        draft.refresh_from_db()
        self.assertEqual(draft.pending_name, '')
        self.assertEqual(list(draft.market_list.items.values_list('name', flat=True)), ['arroz'])

        self._text('leite')
        reply, _send = self._text('/pronto')
        self.assertFalse(BotMarketDraft.objects.filter(user=self.user).exists())
        market_list = MarketList.objects.get(user=self.user)
        self.assertEqual(market_list.status, MarketListStatus.DRAFT)
        self.assertEqual(list(market_list.items.values_list('name', flat=True)), ['arroz', 'leite'])
        self.assertIn('Fechei a lista', reply.call_args[0][1])

    def test_idle_warns_at_five_and_finishes_at_ten(self):
        from datetime import timedelta
        from unittest.mock import patch
        from django.utils import timezone
        from moneyger.market_bot import sweep_market_drafts
        from moneyger.models import BotMarketDraft, MarketList, MarketListStatus

        self._text('/mercado 90')
        self._text('banana')
        draft = BotMarketDraft.objects.get(user=self.user)
        draft.last_activity_at = timezone.now() - timedelta(minutes=6)
        draft.save(update_fields=['last_activity_at'])

        with patch('moneyger.market_bot._reply') as reply:
            sweep_market_drafts()
            sweep_market_drafts()
        self.assertEqual(reply.call_count, 1)
        self.assertIn('cinco minutos', reply.call_args[0][1].lower())
        draft.refresh_from_db()
        self.assertIsNotNone(draft.warned_at)
        self.assertEqual(draft.pending_name, 'banana')

        draft.last_activity_at = timezone.now() - timedelta(minutes=11)
        draft.save(update_fields=['last_activity_at'])
        with patch('moneyger.market_bot._reply') as reply:
            sweep_market_drafts()
        self.assertFalse(BotMarketDraft.objects.filter(user=self.user).exists())
        market_list = MarketList.objects.get(user=self.user)
        self.assertEqual(market_list.status, MarketListStatus.DRAFT)
        self.assertEqual(list(market_list.items.values_list('name', flat=True)), ['banana'])
        self.assertIn('sozinho', reply.call_args[0][1].lower())
