"""Extrato de cartão (CSV Nubank) → parcelamentos, sem lançamentos."""
from __future__ import annotations

import csv
import io
import re
from calendar import monthrange
from datetime import date
from decimal import Decimal, InvalidOperation

from .models import InstallmentPlan, PaymentMethod

_PARCEL_RE = re.compile(
    r'^(?P<merchant>.+?)\s+-\s+(?:parcela\s+)?(?P<n>\d+)\s*/\s*(?P<total>\d+)\s*$',
    re.IGNORECASE,
)


def add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def parse_br_amount(raw: str) -> Decimal:
    text = (raw or '').strip().replace(' ', '')
    negative = text.startswith('-')
    text = text.lstrip('-')
    if ',' in text:
        text = text.replace('.', '').replace(',', '.')
    try:
        amount = Decimal(text)
    except (InvalidOperation, ValueError):
        raise ValueError(f'Valor inválido: {raw}') from None
    return -amount if negative else amount


def parse_installment_rows(csv_text: str) -> list[dict]:
    """Agrupa linhas 'Loja - Parcela N/M' do mesmo valor. Ignora pagamentos e estornos."""
    sample = csv_text.lstrip('\ufeff')
    reader = csv.DictReader(io.StringIO(sample))
    if not reader.fieldnames:
        raise ValueError('CSV sem cabeçalho.')
    fields = {name.strip().lower(): name for name in reader.fieldnames if name}
    for required in ('date', 'title', 'amount'):
        if required not in fields:
            raise ValueError('O CSV precisa das colunas date, title e amount.')

    grouped: dict[tuple, dict] = {}
    for row in reader:
        title = (row.get(fields['title']) or '').strip()
        match = _PARCEL_RE.match(title)
        if not match:
            continue
        try:
            amount = parse_br_amount(row.get(fields['amount']) or '')
            occurred = date.fromisoformat((row.get(fields['date']) or '').strip())
        except (ValueError, TypeError):
            continue
        if amount <= 0:
            continue
        current = int(match.group('n'))
        total = int(match.group('total'))
        if total < 2 or current < 1 or current > total:
            continue
        merchant = re.sub(r'\s+', ' ', match.group('merchant')).strip(' -')
        key = (merchant.casefold(), total, amount)
        current_row = grouped.get(key)
        if current_row is None or current > current_row['current'] or (
            current == current_row['current'] and occurred > current_row['occurred']
        ):
            grouped[key] = {
                'merchant': merchant,
                'current': current,
                'total': total,
                'amount': amount,
                'occurred': occurred,
            }
    return list(grouped.values())


def import_credit_statement(user, account, csv_text: str) -> dict:
    rows = parse_installment_rows(csv_text)
    created = 0
    updated = 0
    plans = []
    for row in rows:
        start_on = add_months(row['occurred'], 1 - row['current'])
        paid = row['current']
        if paid >= row['total']:
            next_due = row['occurred']
            active = False
        else:
            next_due = add_months(row['occurred'], 1)
            active = True
        total_amount = (row['amount'] * row['total']).quantize(Decimal('0.01'))
        existing = (
            InstallmentPlan.objects.filter(
                user=user,
                account=account,
                description__iexact=row['merchant'],
                total_installments=row['total'],
                installment_amount=row['amount'],
            )
            .order_by('-id')
            .first()
        )
        if existing:
            existing.paid_installments = max(existing.paid_installments, paid)
            existing.total_amount = total_amount
            existing.start_on = start_on
            if existing.paid_installments >= existing.total_installments:
                existing.is_active = False
                existing.next_due_on = row['occurred']
            else:
                existing.is_active = True
                existing.next_due_on = add_months(row['occurred'], 1)
            existing.payment_method = PaymentMethod.CREDIT
            existing.save()
            updated += 1
            plans.append(existing)
            continue
        plan = InstallmentPlan.objects.create(
            user=user,
            account=account,
            description=row['merchant'][:255],
            total_amount=total_amount,
            installment_amount=row['amount'],
            total_installments=row['total'],
            paid_installments=paid,
            start_on=start_on,
            next_due_on=next_due,
            payment_method=PaymentMethod.CREDIT,
            is_active=active,
            notes='Importado do extrato, sem lançamentos.',
        )
        created += 1
        plans.append(plan)
    return {'created': created, 'updated': updated, 'plans': plans}
