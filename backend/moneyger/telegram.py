"""Telegram webhook + vínculo de conta Moneyger (Gastôncio)."""
from __future__ import annotations

import json
import logging
import re
import secrets
import urllib.request
from datetime import date as date_cls
from decimal import Decimal

from decouple import config
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import permissions, views
from rest_framework.response import Response

from users.access import user_has_moneyger_access
from . import persona
from .matching import apply_payment_match, find_payment_matches, attach_duplicate_hints, find_document_duplicates
from .models import (
    Account, Category, InboxItem, TelegramLink, Transaction, TransactionSource,
    TransactionStatus, InboxStatus, PaymentMethod,
)
from .permissions import HasMoneygerAccess
from .parsers import parse_capture
from .services import (
    ensure_default_categories, register_bill_expense,
    build_dashboard_snapshot, enrich_payload_category, top_categories, suggest_category,
)
from .media_ingest import (
    attach_to_inbox, download_telegram_file, is_allowed_mime, pick_telegram_file_id,
)
from .ocr import extract_text_from_bytes

logger = logging.getLogger(__name__)


_STATUS_ALIASES = {
    'ajuda': 'help',
    'help': 'help',
    'comandos': 'help',
    'saldo': 'saldo',
    'saldos': 'saldo',
    'resumo': 'resumo',
    'mes': 'resumo',
    'mês': 'resumo',
    'pendentes': 'pendentes',
    'vencimentos': 'pendentes',
    'vence': 'pendentes',
    'orcamento': 'orcamento',
    'orçamento': 'orcamento',
    'budgets': 'orcamento',
    'inbox': 'inbox',
    'fila': 'inbox',
}

_QUERY_PATTERNS = [
    (re.compile(r'\b(meu\s+)?saldo\b|\bsaldos\b', re.I), 'saldo'),
    (re.compile(r'quanto\s+gastei|resumo\s+do\s+m[eê]s|\bgastos?\s+do\s+m[eê]s\b', re.I), 'resumo'),
    (re.compile(r'o\s+que\s+vence|vencimento|pend[eê]ncias?', re.I), 'pendentes'),
    (re.compile(r'or[cç]amento', re.I), 'orcamento'),
    (re.compile(r'\binbox\b|fila\s+de\s+confirma', re.I), 'inbox'),
]


def _normalize_command(text: str) -> str:
    """'/saldo@Bot' ou 'saldo' → token base."""
    t = (text or '').strip()
    if not t:
        return ''
    if t.startswith('/'):
        t = t[1:]
    t = t.split('@', 1)[0]
    t = t.split(maxsplit=1)[0]
    return t.lower()


def detect_status_intent(text: str) -> str | None:
    """Retorna help|saldo|resumo|pendentes|orcamento|inbox ou None."""
    raw = (text or '').strip()
    if not raw:
        return None
    # Lançamentos NL / valor no início não são consulta
    if re.match(r'^\s*\d', raw) or re.match(
        r'^\s*(ontem\s+)?(gastei|paguei|comprei|recebi|entrou|ganhei)\s+\d', raw, re.I,
    ):
        return None
    cmd = _normalize_command(raw)
    tokens = raw.split()
    first = tokens[0] if tokens else ''
    if first.startswith('/') and cmd in _STATUS_ALIASES:
        return _STATUS_ALIASES[cmd]
    if len(tokens) == 1 and cmd in _STATUS_ALIASES:
        return _STATUS_ALIASES[cmd]
    for pattern, intent in _QUERY_PATTERNS:
        if pattern.search(raw):
            return intent
    return None


def _reply_status(chat_id: str, user, intent: str):
    markup = persona.nav_markup()
    if intent == 'help':
        send_telegram_message(chat_id, persona.help_text(), reply_markup=markup)
        return
    snap = build_dashboard_snapshot(user)
    if intent == 'saldo':
        send_telegram_message(chat_id, persona.status_saldo(snap), reply_markup=markup)
    elif intent == 'resumo':
        send_telegram_message(chat_id, persona.status_resumo(snap), reply_markup=markup)
    elif intent == 'pendentes':
        send_telegram_message(chat_id, persona.status_pendentes(snap), reply_markup=markup)
    elif intent == 'orcamento':
        send_telegram_message(chat_id, persona.status_orcamento(snap), reply_markup=markup)
    elif intent == 'inbox':
        pending = list(
            InboxItem.objects.filter(user=user, status=InboxStatus.PENDING).order_by('-updated_at')[:4]
        )
        send_telegram_message(chat_id, persona.status_inbox(snap, pending), reply_markup=markup)


def _category_from_payload(user, payload: dict):
    cat_id = payload.get('category_id')
    if cat_id:
        cat = Category.objects.filter(pk=cat_id, user=user, is_active=True).first()
        if cat:
            return cat
    kind = 'income' if (payload.get('type') or 'expense') == 'income' else 'expense'
    hints = payload.get('hints') or {}
    if hints.get('category_hint'):
        cat = suggest_category(user, hints['category_hint'], kind)
        if cat:
            return cat
    return suggest_category(user, payload.get('description') or '', kind)


def telegram_bot_token() -> str:
    return config('MONEYGER_TELEGRAM_BOT_TOKEN', default='')


def telegram_webhook_secret() -> str:
    return config('MONEYGER_TELEGRAM_WEBHOOK_SECRET', default='')


def telegram_bot_username() -> str:
    configured = config('MONEYGER_TELEGRAM_BOT_USERNAME', default='').strip().lstrip('@')
    if configured:
        return configured
    token = telegram_bot_token()
    if not token:
        return ''
    try:
        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/getMe', method='GET')
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return (data.get('result') or {}).get('username') or ''
    except Exception:
        return ''


def send_telegram_message(chat_id: str, text: str, reply_markup: dict | None = None):
    token = telegram_bot_token()
    if not token:
        logger.warning('MONEYGER_TELEGRAM_BOT_TOKEN não configurado')
        return
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}
    if reply_markup:
        payload['reply_markup'] = reply_markup
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{token}/sendMessage',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()
    except Exception as exc:
        logger.exception('Falha ao enviar mensagem Telegram: %s', exc)


class MoneygerMixin:
    permission_classes = [permissions.IsAuthenticated, HasMoneygerAccess]


class TelegramLinkCodeView(MoneygerMixin, views.APIView):
    def get(self, request):
        link, _ = TelegramLink.objects.get_or_create(
            user=request.user, defaults={'chat_id': f'pending-{request.user.id}'},
        )
        code = secrets.token_hex(3).upper()
        link.link_code = code
        if str(link.chat_id).startswith('pending-'):
            link.chat_id = f'pending-{request.user.id}-{code}'
        link.save(update_fields=['link_code', 'chat_id', 'updated_at'])
        bot = telegram_bot_username()
        deep = f'https://t.me/{bot}?start={code}' if bot else None
        return Response({
            'link_code': code,
            'start_command': f'/start {code}',
            'bot_username': bot or None,
            'deep_link': deep,
            'instructions': (
                f'Abra @{bot} no Telegram e envie /start {code}'
                if bot else f'No Telegram, envie /start {code} para o Gastôncio.'
            ),
            'linked': not str(link.chat_id).startswith('pending-'),
            'chat_id': None if str(link.chat_id).startswith('pending-') else link.chat_id,
        })


class TelegramStatusView(MoneygerMixin, views.APIView):
    def get(self, request):
        bot = telegram_bot_username()
        try:
            link = TelegramLink.objects.get(user=request.user)
            linked = not str(link.chat_id).startswith('pending-')
            return Response({
                'linked': linked,
                'chat_id': link.chat_id if linked else None,
                'linked_at': link.linked_at.isoformat() if linked else None,
                'bot_username': bot or None,
                'bot_display_name': 'Gastôncio',
                'deep_link': f'https://t.me/{bot}' if bot else None,
            })
        except TelegramLink.DoesNotExist:
            return Response({
                'linked': False,
                'chat_id': None,
                'linked_at': None,
                'bot_username': bot or None,
                'bot_display_name': 'Gastôncio',
                'deep_link': f'https://t.me/{bot}' if bot else None,
            })


def _enrich_with_matches(user, payload: dict) -> dict:
    hints = dict(payload.get('hints') or {})
    amount = payload.get('amount')
    occurred = payload.get('occurred_on')
    occurred_on = date_cls.fromisoformat(occurred) if occurred else None
    amt = None
    try:
        if amount:
            amt = Decimal(str(amount))
    except Exception:
        amt = None

    if hints.get('kind') == 'receipt' or hints.get('is_payment_receipt'):
        matches = find_payment_matches(
            user,
            amt,
            occurred_on,
            receipt_ref=str(payload.get('external_ref') or hints.get('auth_code') or ''),
        )
        if matches:
            hints['matches'] = matches
            hints['best_match'] = matches[0]
            payload['confidence'] = max(float(payload.get('confidence') or 0), 0.82)
    payload['hints'] = hints
    return payload


def _capture_markup(item_id: int, payload: dict, user=None) -> dict:
    from .parsers import is_bill_payload

    if is_bill_payload(payload):
        spec = (payload.get('hints') or {})
        total = spec.get('total_installments')
        confirm_label = '✅ Registrar pendência + parcelamento' if int(total or 0) >= 2 else '✅ Registrar pendência'
    elif (payload.get('hints') or {}).get('is_payment_receipt'):
        confirm_label = '✅ Confirmar comprovante'
    else:
        confirm_label = '✅ Confirmar lançamento'
    rows = [[{'text': confirm_label, 'callback_data': f'mg:ok:{item_id}'}]]
    matches = (payload.get('hints') or {}).get('matches') or []
    for m in matches[:2]:
        rows.append([{
            'text': f'📉 Abater: {m["label"][:28]}',
            'callback_data': f'mg:ab:{item_id}:{m["kind"]}:{m["id"]}',
        }])

    kind = 'income' if (payload.get('type') or 'expense') == 'income' else 'expense'
    selected_id = payload.get('category_id')
    cats = top_categories(user, kind=kind, limit=3) if user is not None else []
    if user is not None and selected_id and not any(c.id == int(selected_id) for c in cats):
        chosen = Category.objects.filter(pk=selected_id, user=user, is_active=True).first()
        if chosen:
            cats = [chosen, *cats][:3]
    if cats:
        cat_row = []
        for c in cats:
            mark = '✓ ' if selected_id and int(selected_id) == c.id else ''
            cat_row.append({
                'text': f'{mark}{c.name[:16]}',
                'callback_data': f'mg:cat:{c.id}:{item_id}',
            })
        rows.append(cat_row)
        rows.append([{
            'text': 'Sem categoria',
            'callback_data': f'mg:cat:0:{item_id}',
        }])

    rows.append([
        {'text': '✏️ Vencimento', 'callback_data': f'mg:ed:due:{item_id}'},
        {'text': '✏️ Valor', 'callback_data': f'mg:ed:amt:{item_id}'},
    ])
    rows.append([
        {'text': '✏️ Descrição', 'callback_data': f'mg:ed:desc:{item_id}'},
        {'text': '✏️ Método', 'callback_data': f'mg:ed:meth:{item_id}'},
    ])
    rows.append([
        {'text': '🏦 De onde sai', 'callback_data': f'mg:ed:acc:{item_id}'},
        {'text': '🗑 Descartar', 'callback_data': f'mg:no:{item_id}'},
    ])
    return {'inline_keyboard': rows}


_ACCOUNT_METHOD = {
    'credit': 'credit',
    'meal_voucher': 'meal_voucher',
    'fuel_voucher': 'fuel_voucher',
    'cash': 'cash',
    'checking': 'debit',
    'savings': 'debit',
}


def _assign_account(payload: dict, account) -> dict:
    payload = dict(payload)
    hints = dict(payload.get('hints') or {})
    payload['account_id'] = account.id
    hints['account_name'] = account.name
    method = _ACCOUNT_METHOD.get(account.account_type)
    if method:
        payload['payment_method'] = method
    payload['hints'] = hints
    return payload


def _ensure_default_account(user, payload: dict) -> dict:
    if payload.get('account_id'):
        acc = Account.objects.filter(pk=payload['account_id'], user=user, is_active=True).first()
        if acc:
            hints = dict(payload.get('hints') or {})
            if not hints.get('account_name'):
                hints['account_name'] = acc.name
                payload = dict(payload)
                payload['hints'] = hints
            return payload
    acc = (
        Account.objects.filter(user=user, is_active=True, account_type='checking').first()
        or Account.objects.filter(user=user, is_active=True).first()
    )
    if not acc:
        return payload
    return _assign_account(payload, acc)


def _account_picker_markup(user, item_id: int, current_id=None) -> dict:
    from .services import account_available, account_balance, is_liability_account, is_prepaid_account
    rows = []
    for acc in Account.objects.filter(user=user, is_active=True).order_by('name')[:8]:
        mark = '✓ ' if current_id and int(current_id) == acc.id else ''
        if is_liability_account(acc):
            avail = account_available(acc)
            bit = f'disp. {persona.format_money(avail)}' if avail is not None else 'cartão'
        elif is_prepaid_account(acc):
            bit = f'pré {persona.format_money(account_balance(acc))}'
        else:
            bit = persona.format_money(account_balance(acc))
        label = f'{mark}{acc.name[:14]} · {bit}'
        rows.append([{
            'text': label[:40],
            'callback_data': f'mg:ac:{acc.id}:{item_id}',
        }])
    rows.append([{'text': 'Voltar', 'callback_data': f'mg:ac:back:{item_id}'}])
    return {'inline_keyboard': rows}


def _method_picker_markup(item_id: int, current: str | None = None) -> dict:
    """Botões curtos das formas de pagamento."""
    current = (current or 'other').lower()
    short = {
        'pix': 'PIX',
        'boleto': 'Boleto',
        'credit': 'Crédito',
        'debit': 'Débito',
        'cash': 'Dinheiro',
        'meal_voucher': 'VA/VR',
        'fuel_voucher': 'Combustível',
        'other': 'Outro',
    }
    rows = []
    row = []
    for value, _label in PaymentMethod.choices:
        mark = '✓ ' if value == current else ''
        row.append({
            'text': f'{mark}{short.get(value, _label)}',
            'callback_data': f'mg:pm:{value}:{item_id}',
        })
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([{'text': 'Voltar', 'callback_data': f'mg:pm:back:{item_id}'}])
    return {'inline_keyboard': rows}


def _find_awaiting_inbox(user):
    for item in InboxItem.objects.filter(user=user, status=InboxStatus.PENDING).order_by('-updated_at')[:10]:
        if (item.parsed_payload or {}).get('hints', {}).get('awaiting_edit'):
            return item
    return None


def _parse_edit_due(text: str):
    import re
    from datetime import date as date_cls
    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', text.strip())
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 100:
        y += 2000
    try:
        return date_cls(y, mo, d)
    except ValueError:
        return None


def _parse_edit_amount(text: str):
    from moneyger.parsers import _parse_decimal_br
    import re
    m = re.search(r'(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2}|\d+)', text.strip())
    if not m:
        return None
    return _parse_decimal_br(m.group(1))


def _apply_inbox_edit(item: InboxItem, field: str, text: str) -> tuple[bool, str]:
    payload = dict(item.parsed_payload or {})
    hints = dict(payload.get('hints') or {})
    if field == 'due_on':
        due = _parse_edit_due(text)
        if not due:
            return False, persona.edit_invalid('due_on')
        iso = due.isoformat()
        payload['due_on'] = iso
        payload['occurred_on'] = iso
        hints['due_on'] = iso
        hints['due_source'] = 'user_edit'
        display = persona.format_date_br(iso)
    elif field == 'amount':
        amount = _parse_edit_amount(text)
        if not amount:
            return False, persona.edit_invalid('amount')
        payload['amount'] = str(amount)
        display = f'R$ {persona.format_money(amount)}'
    elif field == 'description':
        desc = (text or '').strip()[:255]
        if len(desc) < 2:
            return False, persona.edit_invalid('description')
        payload['description'] = desc
        display = desc
    else:
        return False, persona.edit_invalid(field)

    hints.pop('awaiting_edit', None)
    payload['hints'] = hints
    item.parsed_payload = payload
    item.save(update_fields=['parsed_payload', 'updated_at'])
    return True, persona.edit_applied(field, display)



@method_decorator(csrf_exempt, name='dispatch')
class TelegramWebhookView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        secret = telegram_webhook_secret()
        if secret:
            header = request.headers.get('X-Telegram-Bot-Api-Secret-Token', '')
            if header != secret:
                return Response({'ok': False}, status=403)

        try:
            from .market_bot import sweep_market_drafts
            sweep_market_drafts()
        except Exception:
            logger.exception('Falha ao varrer listas de mercado paradas')

        update = request.data if isinstance(request.data, dict) else {}
        callback = update.get('callback_query')
        if callback:
            return self._handle_callback(callback)

        message = update.get('message') or update.get('edited_message') or {}
        chat = message.get('chat') or {}
        chat_id = str(chat.get('id') or '')
        text = (message.get('text') or '').strip()
        message_id = str(message.get('message_id') or '')

        if not chat_id:
            return Response({'ok': True})

        if text.startswith('/start'):
            parts = text.split(maxsplit=1)
            code = parts[1].strip().upper() if len(parts) > 1 else ''
            if not code:
                send_telegram_message(chat_id, persona.greet_need_code())
                return Response({'ok': True})
            link = TelegramLink.objects.filter(link_code=code).select_related('user').first()
            if not link or not user_has_moneyger_access(link.user):
                send_telegram_message(chat_id, persona.invalid_code())
                return Response({'ok': True})
            TelegramLink.objects.filter(chat_id=chat_id).exclude(pk=link.pk).delete()
            link.chat_id = chat_id
            link.link_code = ''
            link.save(update_fields=['chat_id', 'link_code', 'updated_at'])
            ensure_default_categories(link.user)
            send_telegram_message(
                chat_id,
                persona.linked_ok(link.user.first_name or link.user.username),
                reply_markup=persona.nav_markup(),
            )
            return Response({'ok': True})

        link = TelegramLink.objects.filter(chat_id=chat_id).select_related('user').first()
        if not link or str(link.chat_id).startswith('pending-') or not user_has_moneyger_access(link.user):
            send_telegram_message(chat_id, persona.need_link())
            return Response({'ok': True})

        user = link.user
        photos = message.get('photo') or []
        document = message.get('document')

        from .market_bot import handle_market_incoming, handle_market_media
        if handle_market_media(user, chat_id, bool(photos or document)):
            return Response({'ok': True})
        if text and handle_market_incoming(user, chat_id, text):
            return Response({'ok': True})

        # Resposta a pedido de edição (vencimento/valor/descrição)
        awaiting_item = _find_awaiting_inbox(user)
        if awaiting_item and text and not photos and not document:
            field = (awaiting_item.parsed_payload or {}).get('hints', {}).get('awaiting_edit')
            ok_edit, reply = _apply_inbox_edit(awaiting_item, field, text)
            if ok_edit:
                awaiting_item.refresh_from_db()
                payload = enrich_payload_category(user, awaiting_item.parsed_payload or {})
                payload = _ensure_default_account(user, payload)
                awaiting_item.parsed_payload = payload
                awaiting_item.save(update_fields=['parsed_payload', 'updated_at'])
                msg = reply + '\n\n' + persona.capture_preview(payload)
                if (payload.get('hints') or {}).get('matches'):
                    msg += '\n\n' + persona.receipt_matches_preview(payload['hints']['matches'])
                send_telegram_message(chat_id, msg, reply_markup=_capture_markup(awaiting_item.id, payload, user))
            else:
                send_telegram_message(chat_id, reply)
            return Response({'ok': True})

        # Comandos / consultas de status (antes de captura)
        if text and not photos and not document:
            intent = detect_status_intent(text)
            if intent:
                _reply_status(chat_id, user, intent)
                return Response({'ok': True})

        if photos or document:
            caption = (message.get('caption') or text or '').strip()
            file_id, preferred_name = pick_telegram_file_id(message)

            item = InboxItem.objects.create(
                user=user,
                raw_text=caption or '[mídia]',
                parsed_payload={
                    'description': caption or 'Anexo Telegram',
                    'confidence': 0.3,
                    'hints': {'kind': 'telegram_media', 'needs_review': True, 'ocr_status': 'pending'},
                },
                confidence=0.3,
                source=TransactionSource.TELEGRAM,
                telegram_message_id=message_id,
            )

            ocr_status = 'failed'
            ocr_text = ''
            mime = ''
            file_name = preferred_name

            if not file_id:
                item.parsed_payload['hints']['ocr_status'] = 'failed'
                item.parsed_payload['hints']['error'] = 'file_id ausente'
                item.save(update_fields=['parsed_payload', 'updated_at'])
                send_telegram_message(chat_id, persona.media_ocr_failed(item.id))
                return Response({'ok': True})

            try:
                downloaded = download_telegram_file(file_id, preferred_name)
                mime = downloaded.mime
                file_name = downloaded.file_name
                if not is_allowed_mime(mime):
                    attach_to_inbox(item, downloaded)
                    hints = {
                        'kind': 'telegram_media',
                        'needs_review': True,
                        'ocr_status': 'skipped',
                        'mime': mime,
                        'file_name': file_name,
                        'telegram_file_id': file_id,
                    }
                    item.parsed_payload = {
                        'description': caption or file_name,
                        'confidence': 0.25,
                        'hints': hints,
                    }
                    item.raw_text = caption or f'[anexo {file_name}]'
                    item.confidence = 0.25
                    item.save(update_fields=['raw_text', 'parsed_payload', 'confidence', 'updated_at'])
                    send_telegram_message(chat_id, persona.media_unsupported(item.id))
                    return Response({'ok': True})

                attach_to_inbox(item, downloaded)
                ocr = extract_text_from_bytes(downloaded.content, mime, file_name)
                ocr_status = ocr.status
                ocr_text = ocr.text or ''
            except Exception as exc:
                logger.exception('Falha ao baixar/OCR anexo: %s', exc)
                item.parsed_payload = {
                    'description': caption or 'Anexo Telegram',
                    'confidence': 0.25,
                    'hints': {
                        'kind': 'telegram_media',
                        'needs_review': True,
                        'ocr_status': 'failed',
                        'error': str(exc)[:200],
                        'telegram_file_id': file_id,
                        'file_name': file_name,
                    },
                }
                item.confidence = 0.25
                item.save(update_fields=['parsed_payload', 'confidence', 'updated_at'])
                send_telegram_message(chat_id, persona.media_ocr_failed(item.id))
                return Response({'ok': True})

            # Prefer OCR text for parsing; keep caption as fallback prefix
            combined = '\n'.join(x for x in [caption, ocr_text] if x).strip() or caption or '[mídia]'
            result = parse_capture(combined) if combined else None
            payload = result.to_dict() if result else {
                'description': caption or file_name or 'Anexo',
                'confidence': 0.35,
                'hints': {},
            }
            hints = dict(payload.get('hints') or {})
            hints.update({
                'kind': hints.get('kind') or 'telegram_media',
                'needs_review': True,
                'ocr_status': ocr_status,
                'mime': mime,
                'file_name': file_name,
                'telegram_file_id': file_id,
                'ocr_engine': 'tesseract',
            })
            if ocr_text:
                hints['ocr_excerpt'] = ocr_text[:500]
            if hints.get('merchant') or payload.get('amount'):
                hints['extracted_fields'] = {
                    'amount': payload.get('amount'),
                    'merchant': hints.get('merchant'),
                    'payment_method': payload.get('payment_method'),
                    'due_on': payload.get('due_on'),
                }
            payload['hints'] = hints
            if ocr_status == 'ok' and payload.get('amount'):
                payload['confidence'] = max(float(payload.get('confidence') or 0), 0.7)
            elif ocr_status != 'ok':
                payload['confidence'] = min(float(payload.get('confidence') or 0.35), 0.4)

            payload = _enrich_with_matches(user, payload)
            payload = attach_duplicate_hints(user, payload, exclude_inbox_id=item.id)
            payload = enrich_payload_category(user, payload)
            payload = _ensure_default_account(user, payload)
            item.raw_text = combined[:5000]
            item.parsed_payload = payload
            item.confidence = float(payload.get('confidence') or 0.35)

            dups = (payload.get('hints') or {}).get('duplicates') or []
            if dups:
                item.status = InboxStatus.DISMISSED
                item.save(update_fields=['raw_text', 'parsed_payload', 'confidence', 'status', 'updated_at'])
                msg = persona.media_ocr_ok(item.id, payload) if ocr_status == 'ok' else persona.media_ocr_failed(item.id)
                msg += '\n\n' + persona.duplicate_found(dups[0])
                send_telegram_message(chat_id, msg)
                return Response({'ok': True, 'duplicate': True})

            item.save(update_fields=['raw_text', 'parsed_payload', 'confidence', 'updated_at'])

            if ocr_status == 'ok':
                msg = persona.media_ocr_ok(item.id, payload)
            else:
                msg = persona.media_ocr_failed(item.id)

            if (payload.get('hints') or {}).get('matches'):
                msg += '\n\n' + persona.receipt_matches_preview(payload['hints']['matches'])
                send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, user))
            elif ocr_status == 'ok' and payload.get('amount'):
                send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, user))
            else:
                send_telegram_message(chat_id, msg)
            return Response({'ok': True})

        if not text:
            return Response({'ok': True})

        result = parse_capture(text)
        if not result.amount and float(result.confidence or 0) < 0.5:
            send_telegram_message(chat_id, persona.didnt_understand(), reply_markup=persona.nav_markup())
            return Response({'ok': True})
        payload = _enrich_with_matches(user, result.to_dict())
        payload = attach_duplicate_hints(user, payload)
        payload = enrich_payload_category(user, payload)
        payload = _ensure_default_account(user, payload)
        dups = (payload.get('hints') or {}).get('duplicates') or []
        if dups:
            send_telegram_message(chat_id, persona.capture_preview(payload) + '\n\n' + persona.duplicate_found(dups[0]))
            return Response({'ok': True, 'duplicate': True})

        item = InboxItem.objects.create(
            user=user,
            raw_text=text,
            parsed_payload=payload,
            confidence=float(payload.get('confidence') or 0),
            source=TransactionSource.TELEGRAM,
            telegram_message_id=message_id,
        )

        msg = persona.capture_preview(payload)
        if (payload.get('hints') or {}).get('matches'):
            msg += '\n\n' + persona.receipt_matches_preview(payload['hints']['matches'])

        send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, user))
        return Response({'ok': True})

    def _handle_callback(self, callback: dict):
        data = callback.get('data') or ''
        chat_id = str((callback.get('message') or {}).get('chat', {}).get('id') or '')
        link = TelegramLink.objects.filter(chat_id=chat_id).select_related('user').first()
        if not link or not user_has_moneyger_access(link.user):
            return Response({'ok': True})

        from .market_bot import handle_market_callback
        if handle_market_callback(link.user, chat_id, data):
            return Response({'ok': True})

        if data.startswith('mg:nav:'):
            intent = data.split(':')[-1]
            if intent in ('help', 'saldo', 'resumo', 'pendentes', 'orcamento', 'inbox'):
                _reply_status(chat_id, link.user, intent)
            return Response({'ok': True})

        if data.startswith('mg:ab:'):
            parts = data.split(':')
            if len(parts) < 5:
                return Response({'ok': True})
            item_id, kind, obj_id = parts[2], parts[3], parts[4]
            item = InboxItem.objects.filter(pk=item_id, user=link.user, status=InboxStatus.PENDING).first()
            if not item:
                send_telegram_message(chat_id, persona.already_done())
                return Response({'ok': True})
            payload = item.parsed_payload or {}
            dups = find_document_duplicates(link.user, payload, exclude_inbox_id=item.id)
            # Comprovante duplicado (mesmo auth) já abatido
            if dups and ((payload.get('hints') or {}).get('is_payment_receipt') or (payload.get('hints') or {}).get('kind') == 'receipt'):
                auth_dups = [d for d in dups if d.get('match_by') in ('auth', 'ref')]
                if auth_dups:
                    item.status = InboxStatus.DISMISSED
                    item.save(update_fields=['status', 'updated_at'])
                    send_telegram_message(chat_id, persona.duplicate_found(auth_dups[0]))
                    return Response({'ok': True, 'duplicate': True})
            match = {'kind': kind, 'id': int(obj_id), 'label': kind, 'amount': payload.get('amount')}
            for m in (payload.get('hints') or {}).get('matches') or []:
                if m.get('kind') == kind and int(m.get('id')) == int(obj_id):
                    match = m
                    break
            occurred = payload.get('occurred_on')
            occurred_on = date_cls.fromisoformat(occurred) if occurred else timezone.localdate()
            try:
                result = apply_payment_match(
                    user=link.user,
                    match=match,
                    occurred_on=occurred_on,
                    receipt_ref=payload.get('external_ref') or item.raw_text[:120],
                )
            except Exception as exc:
                logger.exception('abatement failed: %s', exc)
                send_telegram_message(chat_id, persona.cannot_confirm())
                return Response({'ok': True})
            if not result.get('ok'):
                send_telegram_message(chat_id, persona.cannot_confirm())
                return Response({'ok': True})
            item.status = InboxStatus.CONFIRMED
            if result.get('transaction_id'):
                item.resulting_transaction_id = result['transaction_id']
            item.save(update_fields=['status', 'resulting_transaction', 'updated_at'])
            send_telegram_message(
                chat_id,
                persona.confirmed_abatement(result.get('label') or match.get('label'), result.get('amount')),
            )
            return Response({'ok': True})

        if data.startswith('mg:ed:'):
            # mg:ed:due:ID | mg:ed:amt:ID | mg:ed:desc:ID | mg:ed:meth:ID
            parts = data.split(':')
            if len(parts) < 4:
                return Response({'ok': True})
            field_key, item_id = parts[2], parts[3]
            item = InboxItem.objects.filter(pk=item_id, user=link.user, status=InboxStatus.PENDING).first()
            if not item:
                send_telegram_message(chat_id, persona.already_done())
                return Response({'ok': True})

            # Método: picker com opções (sem awaiting texto)
            if field_key == 'meth':
                payload = item.parsed_payload or {}
                send_telegram_message(
                    chat_id,
                    persona.ask_edit_method(),
                    reply_markup=_method_picker_markup(item.id, payload.get('payment_method')),
                )
                return Response({'ok': True})
            if field_key == 'acc':
                payload = item.parsed_payload or {}
                send_telegram_message(
                    chat_id,
                    'De qual conta, cartão ou vale sai este gasto?',
                    reply_markup=_account_picker_markup(link.user, item.id, payload.get('account_id')),
                )
                return Response({'ok': True})

            field_map = {'due': 'due_on', 'amt': 'amount', 'desc': 'description'}
            field = field_map.get(field_key)
            if not field:
                return Response({'ok': True})
            payload = dict(item.parsed_payload or {})
            hints = dict(payload.get('hints') or {})
            hints['awaiting_edit'] = field
            payload['hints'] = hints
            item.parsed_payload = payload
            item.save(update_fields=['parsed_payload', 'updated_at'])
            if field == 'due_on':
                send_telegram_message(chat_id, persona.ask_edit_due())
            elif field == 'amount':
                send_telegram_message(chat_id, persona.ask_edit_amount())
            else:
                send_telegram_message(chat_id, persona.ask_edit_description())
            return Response({'ok': True})

        if data.startswith('mg:pm:'):
            # mg:pm:pix:ITEM_ID | mg:pm:back:ITEM_ID
            parts = data.split(':')
            if len(parts) < 4:
                return Response({'ok': True})
            method_key, item_id = parts[2], parts[3]
            item = InboxItem.objects.filter(pk=item_id, user=link.user, status=InboxStatus.PENDING).first()
            if not item:
                send_telegram_message(chat_id, persona.already_done())
                return Response({'ok': True})
            payload = dict(item.parsed_payload or {})
            if method_key == 'back':
                msg = persona.capture_preview(payload)
                if (payload.get('hints') or {}).get('matches'):
                    msg += '\n\n' + persona.receipt_matches_preview(payload['hints']['matches'])
                send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, link.user))
                return Response({'ok': True})
            valid = {c.value for c in PaymentMethod}
            if method_key not in valid:
                send_telegram_message(chat_id, persona.cannot_confirm())
                return Response({'ok': True})
            payload['payment_method'] = method_key
            item.parsed_payload = payload
            item.save(update_fields=['parsed_payload', 'updated_at'])
            label = persona.format_payment_method(method_key)
            msg = persona.method_set(label) + '\n\n' + persona.capture_preview(payload)
            if (payload.get('hints') or {}).get('matches'):
                msg += '\n\n' + persona.receipt_matches_preview(payload['hints']['matches'])
            send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, link.user))
            return Response({'ok': True})

        if data.startswith('mg:ac:'):
            parts = data.split(':')
            if len(parts) < 4:
                return Response({'ok': True})
            acc_key, item_id = parts[2], parts[3]
            item = InboxItem.objects.filter(pk=item_id, user=link.user, status=InboxStatus.PENDING).first()
            if not item:
                send_telegram_message(chat_id, persona.already_done())
                return Response({'ok': True})
            payload = dict(item.parsed_payload or {})
            if acc_key == 'back':
                msg = persona.capture_preview(payload)
                if (payload.get('hints') or {}).get('matches'):
                    msg += '\n\n' + persona.receipt_matches_preview(payload['hints']['matches'])
                send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, link.user))
                return Response({'ok': True})
            account = Account.objects.filter(pk=acc_key, user=link.user, is_active=True).first()
            if not account:
                send_telegram_message(chat_id, persona.cannot_confirm())
                return Response({'ok': True})
            payload = _assign_account(payload, account)
            item.parsed_payload = payload
            item.save(update_fields=['parsed_payload', 'updated_at'])
            msg = persona.account_set(account.name) + '\n\n' + persona.capture_preview(payload)
            if (payload.get('hints') or {}).get('matches'):
                msg += '\n\n' + persona.receipt_matches_preview(payload['hints']['matches'])
            send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, link.user))
            return Response({'ok': True})

        if data.startswith('mg:cat:'):
            # mg:cat:CATEGORY_ID:ITEM_ID  (0 = sem categoria)
            parts = data.split(':')
            if len(parts) < 4:
                return Response({'ok': True})
            cat_id_raw, item_id = parts[2], parts[3]
            item = InboxItem.objects.filter(pk=item_id, user=link.user, status=InboxStatus.PENDING).first()
            if not item:
                send_telegram_message(chat_id, persona.already_done())
                return Response({'ok': True})
            payload = dict(item.parsed_payload or {})
            hints = dict(payload.get('hints') or {})
            try:
                cat_id = int(cat_id_raw)
            except (TypeError, ValueError):
                cat_id = 0
            if cat_id <= 0:
                payload.pop('category_id', None)
                hints.pop('category_name', None)
                name = None
            else:
                cat = Category.objects.filter(pk=cat_id, user=link.user, is_active=True).first()
                if not cat:
                    send_telegram_message(chat_id, persona.cannot_confirm())
                    return Response({'ok': True})
                payload['category_id'] = cat.id
                hints['category_name'] = cat.name
                name = cat.name
            payload['hints'] = hints
            item.parsed_payload = payload
            item.save(update_fields=['parsed_payload', 'updated_at'])
            msg = persona.category_set(name) + '\n\n' + persona.capture_preview(payload)
            if hints.get('matches'):
                msg += '\n\n' + persona.receipt_matches_preview(hints['matches'])
            send_telegram_message(chat_id, msg, reply_markup=_capture_markup(item.id, payload, link.user))
            return Response({'ok': True})

        if data.startswith('mg:ok:'):
            from .parsers import is_bill_payload

            item_id = data.split(':')[-1]
            item = InboxItem.objects.filter(pk=item_id, user=link.user, status=InboxStatus.PENDING).first()
            if not item:
                send_telegram_message(chat_id, persona.already_done())
                return Response({'ok': True})
            payload = item.parsed_payload or {}
            account = None
            acc_id = payload.get('account_id')
            if acc_id:
                account = Account.objects.filter(pk=acc_id, user=link.user, is_active=True).first()
            if account is None:
                account = (
                    Account.objects.filter(user=link.user, is_active=True, account_type='checking').first()
                    or Account.objects.filter(user=link.user, is_active=True).first()
                )
            amount = Decimal(str(payload.get('amount') or '0'))
            if not account or amount <= 0:
                send_telegram_message(chat_id, persona.cannot_confirm())
                return Response({'ok': True})

            dups = find_document_duplicates(link.user, payload, exclude_inbox_id=item.id)
            if dups:
                item.status = InboxStatus.DISMISSED
                item.save(update_fields=['status', 'updated_at'])
                send_telegram_message(chat_id, persona.duplicate_found(dups[0]))
                return Response({'ok': True, 'duplicate': True})

            hints = payload.get('hints') or {}
            category = _category_from_payload(link.user, payload)
            # Comprovante com match único forte → abate direto
            best = hints.get('best_match')
            if (hints.get('is_payment_receipt') or hints.get('kind') == 'receipt') and best and float(best.get('score') or 0) >= 0.8:
                occurred = payload.get('occurred_on') or payload.get('due_on')
                occurred_on = date_cls.fromisoformat(occurred) if occurred else timezone.localdate()
                result = apply_payment_match(
                    user=link.user,
                    match=best,
                    occurred_on=occurred_on,
                    receipt_ref=payload.get('external_ref') or hints.get('auth_code') or '',
                )
                if result.get('ok'):
                    item.status = InboxStatus.CONFIRMED
                    if result.get('transaction_id'):
                        item.resulting_transaction_id = result['transaction_id']
                    item.save(update_fields=['status', 'resulting_transaction', 'updated_at'])
                    send_telegram_message(
                        chat_id,
                        persona.confirmed_abatement(result.get('label') or best.get('label'), result.get('amount')),
                    )
                    return Response({'ok': True})

            occurred = payload.get('occurred_on') or payload.get('due_on')
            occurred_on = date_cls.fromisoformat(occurred) if occurred else timezone.localdate()
            notes = f"Recebedor: {hints['merchant']}" if hints.get('merchant') else ''
            as_pending = is_bill_payload(payload)
            if as_pending:
                tx, plan = register_bill_expense(
                    user=link.user,
                    account=account,
                    payload=payload,
                    occurred_on=occurred_on,
                    amount=amount,
                    description=payload.get('description') or item.raw_text[:255],
                    notes=notes,
                    payment_method=payload.get('payment_method') or PaymentMethod.OTHER,
                    external_ref=payload.get('external_ref') or '',
                    source=TransactionSource.TELEGRAM,
                    category=category,
                    tx_type=payload.get('type') or 'expense',
                )
            else:
                tx = Transaction.objects.create(
                    user=link.user,
                    account=account,
                    category=category,
                    type=payload.get('type') or 'expense',
                    amount=amount,
                    occurred_on=occurred_on,
                    description=payload.get('description') or item.raw_text[:255],
                    notes=notes,
                    payment_method=payload.get('payment_method') or PaymentMethod.OTHER,
                    external_ref=payload.get('external_ref') or '',
                    source=TransactionSource.TELEGRAM,
                    status=TransactionStatus.CONFIRMED,
                )
                plan = None
            item.status = InboxStatus.CONFIRMED
            item.resulting_transaction = tx
            item.save(update_fields=['status', 'resulting_transaction', 'updated_at'])
            if as_pending:
                send_telegram_message(
                    chat_id,
                    persona.confirmed_pending(
                        amount,
                        payload.get('description') or '',
                        current=(payload.get('hints') or {}).get('current_installment'),
                        total=(payload.get('hints') or {}).get('total_installments'),
                        created_plan=bool(plan),
                    ),
                )
            else:
                send_telegram_message(
                    chat_id,
                    persona.confirmed_expense(amount, payload.get('description') or ''),
                )
        elif data.startswith('mg:no:'):
            item_id = data.split(':')[-1]
            InboxItem.objects.filter(pk=item_id, user=link.user, status=InboxStatus.PENDING).update(
                status=InboxStatus.DISMISSED,
            )
            send_telegram_message(chat_id, persona.dismissed())
        return Response({'ok': True})
