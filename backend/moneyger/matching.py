"""Matching de comprovantes contra pendências (parcelas, fixas, inbox, pending)."""
from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from .models import (
    InstallmentPlan, RecurringRule, Transaction, TransactionStatus,
    TransactionSource, InboxItem, InboxStatus, Account,
)


def _amt(v) -> Decimal:
    return Decimal(str(v)).quantize(Decimal('0.01'))


def amounts_close(a: Decimal, b: Decimal, tol: Decimal = Decimal('0.05')) -> bool:
    if a <= 0 or b <= 0:
        return False
    return abs(a - b) <= tol


def _pending_linked_to_plan(tx: Transaction, plan: InstallmentPlan) -> bool:
    notes = tx.notes or ''
    if f'parcelamento:{plan.id}' in notes:
        return True
    if amounts_close(tx.amount, plan.installment_amount) and tx.occurred_on == plan.next_due_on:
        return True
    return False


def find_payment_matches(
    user,
    amount: Decimal | None,
    occurred_on: date | None = None,
    limit: int = 5,
    receipt_ref: str = '',
) -> list[dict]:
    """Busca pendências compatíveis com o valor do comprovante.

    Parcelamento + despesa pendente do mesmo boleto viram um único match
    (kind=installment); o abatimento confirma a pendência e avança o plano.
    """
    if amount is None or amount <= 0:
        return []
    amount = _amt(amount)
    today = occurred_on or timezone.localdate()
    window_start = today - timedelta(days=45)
    window_end = today + timedelta(days=20)
    matches: list[dict] = []
    receipt_ref = (receipt_ref or '').strip()

    matched_plans: list[InstallmentPlan] = []
    covered_pending_ids: set[int] = set()

    for plan in InstallmentPlan.objects.filter(user=user, is_active=True).order_by('next_due_on')[:20]:
        if amounts_close(plan.installment_amount, amount) and window_start <= plan.next_due_on <= window_end:
            matched_plans.append(plan)
            n = plan.paid_installments + 1
            label = f'{plan.description} ({n}/{plan.total_installments})'
            # Inclui a pendência ligada no match unificado (sem listar pending_tx à parte)
            linked = Transaction.objects.filter(
                user=user,
                status=TransactionStatus.PENDING,
                type='expense',
                amount=plan.installment_amount,
            ).filter(
                Q(notes__contains=f'parcelamento:{plan.id}') | Q(occurred_on=plan.next_due_on)
            ).order_by('occurred_on', 'id').first()
            if linked:
                covered_pending_ids.add(linked.id)
                label = f'{plan.description} · parcela {n}/{plan.total_installments}'
            matches.append({
                'kind': 'installment',
                'id': plan.id,
                'label': label,
                'amount': str(plan.installment_amount),
                'due_on': plan.next_due_on.isoformat(),
                'score': 0.92 if linked else 0.9,
                'pending_tx_id': linked.id if linked else None,
            })

    for rule in RecurringRule.objects.filter(user=user, is_active=True, type='expense').order_by('next_due_on')[:20]:
        if amounts_close(rule.amount, amount) and window_start <= rule.next_due_on <= window_end:
            matches.append({
                'kind': 'recurring',
                'id': rule.id,
                'label': rule.description,
                'amount': str(rule.amount),
                'due_on': rule.next_due_on.isoformat(),
                'score': 0.85,
            })

    for tx in Transaction.objects.filter(
        user=user, status=TransactionStatus.PENDING, type='expense',
        occurred_on__gte=window_start, occurred_on__lte=window_end,
    ).order_by('-occurred_on')[:20]:
        if tx.id in covered_pending_ids:
            continue
        # Também cobre pendências ligadas a planos já listados (mesmo se o filtro acima falhar)
        if any(_pending_linked_to_plan(tx, plan) for plan in matched_plans):
            continue
        if amounts_close(tx.amount, amount):
            score = 0.8
            if receipt_ref and tx.external_ref and (
                receipt_ref in tx.external_ref or tx.external_ref in receipt_ref
            ):
                score = 0.95
            matches.append({
                'kind': 'pending_tx',
                'id': tx.id,
                'label': tx.description or 'Lançamento pendente',
                'amount': str(tx.amount),
                'due_on': tx.occurred_on.isoformat(),
                'score': score,
            })

    # Inbox de despesas ainda pendentes com mesmo valor (boletos não confirmados)
    for item in InboxItem.objects.filter(user=user, status=InboxStatus.PENDING).order_by('-created_at')[:30]:
        payload = item.parsed_payload or {}
        ih = payload.get('hints') or {}
        if ih.get('kind') == 'receipt' or ih.get('is_payment_receipt'):
            continue
        try:
            ia = _amt(payload.get('amount') or 0)
        except Exception:
            continue
        if amounts_close(ia, amount):
            score = 0.75 if (ih.get('is_bill') or ih.get('kind') in ('bill', 'boleto')) else 0.7
            matches.append({
                'kind': 'inbox',
                'id': item.id,
                'label': payload.get('description') or item.raw_text[:60],
                'amount': str(ia),
                'due_on': payload.get('due_on') or payload.get('occurred_on'),
                'score': score,
            })

    matches.sort(key=lambda m: (-m['score'], m.get('due_on') or ''))
    return matches[:limit]


def apply_payment_match(*, user, match: dict, occurred_on: date | None = None, receipt_ref: str = '') -> dict:
    """Abate a pendência correspondente ao comprovante."""
    from .models import PaymentMethod

    kind = match['kind']
    obj_id = match['id']
    when = occurred_on or timezone.localdate()
    note = f'Abatido via comprovante. {receipt_ref}'.strip()

    if kind == 'installment':
        plan = InstallmentPlan.objects.get(pk=obj_id, user=user, is_active=True)
        n = plan.paid_installments + 1
        pending = Transaction.objects.filter(
            user=user,
            status=TransactionStatus.PENDING,
            type='expense',
            amount=plan.installment_amount,
        ).filter(
            Q(notes__contains=f'parcelamento:{plan.id}') | Q(occurred_on=plan.next_due_on)
        ).order_by('occurred_on', 'id').first()
        if pending:
            pending.status = TransactionStatus.CONFIRMED
            pending.notes = ((pending.notes or '') + '\n' + note).strip()
            if receipt_ref:
                pending.external_ref = receipt_ref[:255]
            pending.occurred_on = when
            pending.save()
            tx = pending
        else:
            tx = Transaction.objects.create(
                user=user,
                account=plan.account,
                category=plan.category,
                type='expense',
                amount=plan.installment_amount,
                occurred_on=when,
                description=f'{plan.description} ({n}/{plan.total_installments})',
                notes=note,
                payment_method=plan.payment_method,
                external_ref=receipt_ref[:255],
                source=TransactionSource.TELEGRAM,
                status=TransactionStatus.CONFIRMED,
            )
        plan.paid_installments = n
        if plan.paid_installments >= plan.total_installments:
            plan.is_active = False
        else:
            y, m, d = plan.next_due_on.year, plan.next_due_on.month, plan.next_due_on.day
            if m == 12:
                y, m = y + 1, 1
            else:
                m += 1
            d = min(d, monthrange(y, m)[1])
            plan.next_due_on = date(y, m, d)
        plan.save()
        return {'ok': True, 'label': match['label'], 'amount': str(plan.installment_amount), 'transaction_id': tx.id}

    if kind == 'recurring':
        rule = RecurringRule.objects.get(pk=obj_id, user=user, is_active=True)
        tx = Transaction.objects.create(
            user=user,
            account=rule.account,
            category=rule.category,
            type=rule.type,
            amount=rule.amount,
            occurred_on=when,
            description=rule.description,
            notes=note,
            payment_method=rule.payment_method,
            external_ref=receipt_ref[:255],
            source=TransactionSource.RECURRING,
            status=TransactionStatus.CONFIRMED,
        )
        y, m, d = rule.next_due_on.year, rule.next_due_on.month, rule.next_due_on.day
        if rule.frequency == 'weekly':
            rule.next_due_on = rule.next_due_on + timedelta(days=7)
        elif rule.frequency == 'yearly':
            rule.next_due_on = date(y + 1, m, min(d, 28) if m == 2 else d)
        else:
            if m == 12:
                y, m = y + 1, 1
            else:
                m += 1
            d = min(d, monthrange(y, m)[1])
            rule.next_due_on = date(y, m, d)
        rule.save(update_fields=['next_due_on', 'updated_at'])
        return {'ok': True, 'label': match['label'], 'amount': str(rule.amount), 'transaction_id': tx.id}

    if kind == 'pending_tx':
        tx = Transaction.objects.get(pk=obj_id, user=user, status=TransactionStatus.PENDING)
        tx.status = TransactionStatus.CONFIRMED
        tx.notes = ((tx.notes or '') + '\n' + note).strip()
        if receipt_ref:
            tx.external_ref = receipt_ref[:255]
        tx.save()
        return {'ok': True, 'label': match['label'], 'amount': str(tx.amount), 'transaction_id': tx.id}

    if kind == 'inbox':
        item = InboxItem.objects.get(pk=obj_id, user=user, status=InboxStatus.PENDING)
        payload = item.parsed_payload or {}
        account = Account.objects.filter(user=user, is_active=True).first()
        amount = _amt(payload.get('amount') or 0)
        if not account or amount <= 0:
            return {'ok': False, 'error': 'inbox sem conta/valor'}
        occurred = payload.get('occurred_on') or payload.get('due_on')
        occurred_on = date.fromisoformat(occurred) if occurred else when
        tx = Transaction.objects.create(
            user=user,
            account=account,
            type=payload.get('type') or 'expense',
            amount=amount,
            occurred_on=occurred_on,
            description=payload.get('description') or item.raw_text[:255],
            notes=note,
            payment_method=payload.get('payment_method') or PaymentMethod.OTHER,
            external_ref=(payload.get('external_ref') or receipt_ref)[:255],
            source=TransactionSource.TELEGRAM,
            status=TransactionStatus.CONFIRMED,
        )
        item.status = InboxStatus.CONFIRMED
        item.resulting_transaction = tx
        item.save(update_fields=['status', 'resulting_transaction', 'updated_at'])
        return {'ok': True, 'label': match['label'], 'amount': str(amount), 'transaction_id': tx.id}

    return {'ok': False, 'error': 'kind desconhecido'}


def _norm_ref(value: str) -> str:
    return (value or '').strip()


def _digit_ref(value: str) -> str:
    return ''.join(c for c in (value or '') if c.isdigit())


def document_identity_keys(payload: dict | None) -> list[str]:
    """Chaves estáveis para detectar boleto/comprovante duplicado."""
    if not payload:
        return []
    hints = payload.get('hints') or {}
    keys: list[str] = []
    seen: set[str] = set()

    def add(prefix: str, raw: str, digits_only: bool = False):
        val = _digit_ref(raw) if digits_only else _norm_ref(raw)
        if not val or len(val) < 8:
            return
        key = f'{prefix}:{val}'
        if key not in seen:
            seen.add(key)
            keys.append(key)

    add('ref', str(payload.get('external_ref') or ''))
    add('auth', str(hints.get('auth_code') or ''))
    add('nosso', str(hints.get('nosso_numero') or ''), digits_only=True)
    add('linha', str(hints.get('linha_digitavel') or ''), digits_only=True)
    add('barcode', str(hints.get('barcode') or ''), digits_only=True)

    acordo = _norm_ref(str(hints.get('agreement_id') or ''))
    amount = _norm_ref(str(payload.get('amount') or ''))
    try:
        parcela = int(hints.get('current_installment') or 0)
    except (TypeError, ValueError):
        parcela = 0
    if acordo and amount and parcela >= 1:
        add('acordo', f'{acordo}|{amount}|{parcela}')

    return keys


def find_document_duplicates(
    user,
    payload: dict | None,
    *,
    exclude_inbox_id: int | None = None,
    exclude_tx_id: int | None = None,
) -> list[dict]:
    """Procura lançamentos/inbox já existentes com a mesma identidade de documento."""
    keys = document_identity_keys(payload)
    if not keys:
        return []

    hints = (payload or {}).get('hints') or {}
    kind = hints.get('kind') or ''
    is_bill = kind in ('bill', 'boleto') or hints.get('is_bill')
    is_receipt = kind == 'receipt' or hints.get('is_payment_receipt')
    if not is_bill and not is_receipt:
        # Só bloqueia boleto/comprovante (não texto livre)
        return []

    refs = []
    for key in keys:
        prefix, _, val = key.partition(':')
        refs.append((prefix, val))

    duplicates: list[dict] = []

    # Transações pelo external_ref / notas
    tx_qs = Transaction.objects.filter(user=user).order_by('-occurred_on', '-id')
    if exclude_tx_id:
        tx_qs = tx_qs.exclude(pk=exclude_tx_id)
    for tx in tx_qs[:200]:
        hay = f'{tx.external_ref}\n{tx.notes}\n{tx.description}'
        hay_digits = _digit_ref(hay)
        for prefix, val in refs:
            hit = False
            if prefix in ('nosso', 'linha', 'barcode'):
                hit = val and val in hay_digits
            elif prefix == 'acordo':
                parts = val.split('|')
                acordo_id = parts[0] if parts else ''
                amt = parts[1] if len(parts) > 1 else ''
                parcela = parts[2] if len(parts) > 2 else ''
                hit = bool(acordo_id) and f'acordo:{acordo_id}' in (tx.notes or '') and amounts_close(
                    _amt(tx.amount), _amt(amt or 0),
                )
                if hit and parcela:
                    hit = f'parcela:{parcela}/' in (tx.notes or '') or f'parcela {parcela}/' in (tx.description or '').lower()
            else:
                hit = val and val in hay
            if hit:
                duplicates.append({
                    'kind': 'transaction',
                    'id': tx.id,
                    'status': tx.status,
                    'label': tx.description or f'Lançamento #{tx.id}',
                    'amount': str(tx.amount),
                    'match_by': prefix,
                })
                break

    # Inbox pendente / confirmada recente
    inbox_qs = InboxItem.objects.filter(user=user).exclude(
        status=InboxStatus.DISMISSED,
    ).order_by('-created_at')
    if exclude_inbox_id:
        inbox_qs = inbox_qs.exclude(pk=exclude_inbox_id)
    for item in inbox_qs[:80]:
        ip = item.parsed_payload or {}
        ih = ip.get('hints') or {}
        other_keys = set(document_identity_keys(ip))
        overlap = other_keys.intersection(keys)
        if not overlap:
            # fallback: comparar refs soltas
            hay = f"{ip.get('external_ref') or ''}\n{ih.get('auth_code') or ''}\n{ih.get('nosso_numero') or ''}"
            hay_digits = _digit_ref(hay)
            for prefix, val in refs:
                if prefix in ('nosso', 'linha', 'barcode') and val in hay_digits:
                    overlap = {f'{prefix}:{val}'}
                    break
                if prefix in ('ref', 'auth') and val and val in hay:
                    overlap = {f'{prefix}:{val}'}
                    break
        if overlap:
            duplicates.append({
                'kind': 'inbox',
                'id': item.id,
                'status': item.status,
                'label': ip.get('description') or item.raw_text[:60] or f'Inbox #{item.id}',
                'amount': str(ip.get('amount') or ''),
                'match_by': next(iter(overlap)).split(':', 1)[0],
            })

    # Parcelamento: só sinaliza se já existe pendência da mesma parcela
    for prefix, val in refs:
        if prefix != 'acordo':
            continue
        parts = val.split('|')
        acordo_id = parts[0] if parts else ''
        amt = parts[1] if len(parts) > 1 else ''
        parcela = parts[2] if len(parts) > 2 else ''
        if not acordo_id or not is_bill:
            continue
        for plan in InstallmentPlan.objects.filter(
            user=user, is_active=True, notes__contains=f'acordo:{acordo_id}',
        )[:5]:
            if not amounts_close(plan.installment_amount, _amt(amt or 0)):
                continue
            pending_same = Transaction.objects.filter(
                user=user,
                status=TransactionStatus.PENDING,
                notes__contains=f'parcelamento:{plan.id}',
            )
            if parcela:
                pending_same = pending_same.filter(notes__contains=f'parcela:{parcela}/')
            if pending_same.exists() and not any(d['kind'] == 'transaction' for d in duplicates):
                duplicates.append({
                    'kind': 'installment',
                    'id': plan.id,
                    'status': 'active',
                    'label': plan.description,
                    'amount': str(plan.installment_amount),
                    'match_by': 'acordo',
                })

    # Dedup por (kind, id)
    seen_ids: set[tuple] = set()
    unique: list[dict] = []
    for d in duplicates:
        key = (d['kind'], d['id'])
        if key in seen_ids:
            continue
        seen_ids.add(key)
        unique.append(d)
    return unique


def attach_duplicate_hints(user, payload: dict, *, exclude_inbox_id: int | None = None) -> dict:
    """Enriquece payload com hints.duplicates se houver."""
    dups = find_document_duplicates(user, payload, exclude_inbox_id=exclude_inbox_id)
    if not dups:
        return payload
    hints = dict(payload.get('hints') or {})
    hints['duplicates'] = dups
    hints['is_duplicate'] = True
    hints['best_duplicate'] = dups[0]
    payload['hints'] = hints
    return payload
