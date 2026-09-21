from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
import re
from django.db.models import Q, Sum
from django.utils import timezone

from .models import AccountType, Category


DEFAULT_CATEGORIES = [
    ('Moradia', 'expense', 'home', '#6366f1'),
    ('Mercado', 'expense', 'shopping-cart', '#22c55e'),
    ('Alimentação', 'expense', 'utensils', '#f59e0b'),
    ('Transporte', 'expense', 'car', '#3b82f6'),
    ('Saúde', 'expense', 'heart', '#ef4444'),
    ('Lazer', 'expense', 'gamepad-2', '#a855f7'),
    ('Assinaturas', 'expense', 'repeat', '#14b8a6'),
    ('Educação', 'expense', 'book', '#0ea5e9'),
    ('Serviços', 'expense', 'wrench', '#94a3b8'),
    ('Outros', 'expense', 'circle', '#64748b'),
    ('Salário', 'income', 'banknote', '#22c55e'),
    ('Freelance', 'income', 'briefcase', '#10b981'),
    ('Investimentos', 'income', 'trending-up', '#84cc16'),
    ('Outras receitas', 'income', 'plus', '#4ade80'),
]


def ensure_default_categories(user):
    """Garante categorias pessoais seed para o usuário (idempotente)."""
    created = []
    for name, kind, icon, color in DEFAULT_CATEGORIES:
        obj, was_created = Category.objects.get_or_create(
            user=user,
            name=name,
            kind=kind,
            defaults={'icon': icon, 'color': color, 'is_active': True},
        )
        if was_created:
            created.append(obj)
    return created


def suggest_category(user, description: str, kind: str = 'expense'):
    """Fuzzy match: nome da categoria contido na descrição (ou o inverso)."""
    desc = (description or '').strip().lower()
    if not desc:
        return None
    ensure_default_categories(user)
    qs = Category.objects.filter(user=user, is_active=True, kind=kind)
    for cat in qs:
        name = cat.name.lower()
        if name in desc or desc in name:
            return cat
    return None


def top_categories(user, kind: str = 'expense', limit: int = 3):
    """Primeiras categorias seed do tipo (ordem DEFAULT_CATEGORIES), úteis nos botões do bot."""
    ensure_default_categories(user)
    preferred = [name for name, k, *_ in DEFAULT_CATEGORIES if k == kind]
    by_name = {
        c.name: c
        for c in Category.objects.filter(user=user, is_active=True, kind=kind)
    }
    ordered = []
    for name in preferred:
        if name in by_name:
            ordered.append(by_name.pop(name))
            if len(ordered) >= limit:
                return ordered
    for c in sorted(by_name.values(), key=lambda x: x.name):
        ordered.append(c)
        if len(ordered) >= limit:
            break
    return ordered


def enrich_payload_category(user, payload: dict) -> dict:
    """Anexa category_id / category_name sugeridos ao payload de captura."""
    payload = dict(payload or {})
    hints = dict(payload.get('hints') or {})
    kind = 'income' if (payload.get('type') or 'expense') == 'income' else 'expense'
    cat = None
    hint = (hints.get('category_hint') or '').strip()
    if hint:
        cat = suggest_category(user, hint, kind)
    if cat is None:
        cat = suggest_category(user, payload.get('description') or '', kind)
    if cat is not None:
        payload['category_id'] = cat.id
        hints['category_name'] = cat.name
    else:
        payload.pop('category_id', None)
        hints.pop('category_name', None)
    payload['hints'] = hints
    return payload


def build_dashboard_snapshot(user, year: int | None = None, month: int | None = None) -> dict:
    """Agregados do dashboard (API + comandos do bot)."""
    from .models import (
        Account, Budget, InboxItem, InboxStatus, InstallmentPlan, RecurringRule,
        Transaction, TransactionStatus,
    )
    from .serializers import TransactionSerializer

    ensure_default_categories(user)
    today = timezone.localdate()
    year = int(year if year is not None else today.year)
    month = int(month if month is not None else today.month)
    start, end = month_bounds(year, month)

    accounts = list(Account.objects.filter(user=user, is_active=True))
    balances = []
    available = Decimal('0')
    credit_debt = Decimal('0')
    for a in accounts:
        bal = account_balance(a)
        role = 'liability' if is_liability_account(a) else 'asset'
        avail = account_available(a)
        balances.append({
            'id': a.id,
            'name': a.name,
            'account_type': a.account_type,
            'role': role,
            'balance': str(bal),
            'limit_amount': str(a.limit_amount) if a.limit_amount is not None else None,
            'available': str(avail) if avail is not None else None,
            'color': a.color,
        })
        if role == 'liability':
            credit_debt += bal
        elif a.account_type in (AccountType.MEAL_VOUCHER, AccountType.FUEL_VOUCHER):
            pass
        else:
            available += bal
    total_balance = available
    net_worth = available - credit_debt

    txs = Transaction.objects.filter(
        user=user,
        status=TransactionStatus.CONFIRMED,
        occurred_on__gte=start,
        occurred_on__lt=end,
    )
    month_income = txs.filter(type='income').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    month_expense = txs.filter(type='expense').aggregate(s=Sum('amount'))['s'] or Decimal('0')

    by_category = []
    for row in (
        txs.filter(type='expense', category__isnull=False)
        .values('category_id', 'category__name', 'category__color')
        .annotate(total=Sum('amount'))
        .order_by('-total')[:8]
    ):
        by_category.append({
            'category_id': row['category_id'],
            'name': row['category__name'],
            'color': row['category__color'],
            'total': str(row['total']),
        })

    budgets = Budget.objects.filter(user=user, year=year, month=month).select_related('category')
    budget_progress = []
    for b in budgets:
        spent = (
            txs.filter(category=b.category, type='expense').aggregate(s=Sum('amount'))['s']
            or Decimal('0')
        )
        budget_progress.append({
            'id': b.id,
            'category': b.category.name,
            'color': b.category.color,
            'limit': str(b.limit_amount),
            'spent': str(spent),
            'pct': float(min(Decimal('100'), (spent / b.limit_amount * 100) if b.limit_amount else 0)),
        })

    upcoming = list(
        RecurringRule.objects.filter(user=user, is_active=True, next_due_on__gte=today)
        .order_by('next_due_on')[:8]
        .values('id', 'description', 'amount', 'next_due_on', 'payment_method')
    )
    for u in upcoming:
        u['amount'] = str(u['amount'])
        u['next_due_on'] = u['next_due_on'].isoformat()
        u['kind'] = 'recurring'

    installment_upcoming = list(
        InstallmentPlan.objects.filter(user=user, is_active=True, next_due_on__gte=today)
        .order_by('next_due_on')[:8]
        .values(
            'id', 'description', 'installment_amount', 'next_due_on', 'payment_method',
            'paid_installments', 'total_installments',
        )
    )
    for u in installment_upcoming:
        upcoming.append({
            'id': u['id'],
            'description': f"{u['description']} ({u['paid_installments']+1}/{u['total_installments']})",
            'amount': str(u['installment_amount']),
            'next_due_on': u['next_due_on'].isoformat(),
            'payment_method': u['payment_method'],
            'kind': 'installment',
        })
    upcoming.sort(key=lambda x: x['next_due_on'])
    upcoming = upcoming[:8]

    inbox_count = InboxItem.objects.filter(user=user, status=InboxStatus.PENDING).count()
    recent = TransactionSerializer(
        txs.order_by('-occurred_on', '-created_at')[:8], many=True
    ).data

    days = max(1, (min(today, end - timedelta(days=1)) - start).days + 1)
    if today < start:
        days = 1
    avg_daily = (month_expense / Decimal(days)).quantize(Decimal('0.01')) if month_expense else Decimal('0')
    top_cat = by_category[0]['name'] if by_category else None

    prev_year, prev_month = (year, month - 1) if month > 1 else (year - 1, 12)
    pstart, pend = month_bounds(prev_year, prev_month)
    prev_expense = (
        Transaction.objects.filter(
            user=user, status=TransactionStatus.CONFIRMED, type='expense',
            occurred_on__gte=pstart, occurred_on__lt=pend,
        ).aggregate(s=Sum('amount'))['s']
        or Decimal('0')
    )

    return {
        'year': year,
        'month': month,
        'total_balance': str(total_balance),
        'available_balance': str(available),
        'credit_debt': str(credit_debt),
        'net_worth': str(net_worth),
        'accounts': balances,
        'month_income': str(month_income),
        'month_expense': str(month_expense),
        'month_net': str(month_income - month_expense),
        'by_category': by_category,
        'budget_progress': budget_progress,
        'upcoming': upcoming,
        'inbox_count': inbox_count,
        'recent_transactions': recent,
        'insights': {
            'avg_daily_expense': str(avg_daily),
            'top_category': top_cat,
            'prev_month_expense': str(prev_expense),
            'pace_vs_prev': (
                float((month_expense - prev_expense) / prev_expense * 100)
                if prev_expense else None
            ),
        },
    }


def is_liability_account(account) -> bool:
    return account.account_type == AccountType.CREDIT


def is_prepaid_account(account) -> bool:
    from .models import PREPAID_ACCOUNT_TYPES
    return account.account_type in PREPAID_ACCOUNT_TYPES


def _ledger_delta(account) -> Decimal:
    """Delta de lançamentos: +receitas/−despesas e transferências."""
    from .models import Transaction, TransactionType, TransactionStatus

    qs = Transaction.objects.filter(user=account.user, status=TransactionStatus.CONFIRMED).filter(
        Q(account=account) | Q(to_account=account)
    )
    income = Decimal('0')
    expense = Decimal('0')
    for tx in qs.only('type', 'amount', 'account_id', 'to_account_id'):
        if tx.type == TransactionType.INCOME and tx.account_id == account.id:
            income += tx.amount
        elif tx.type == TransactionType.EXPENSE and tx.account_id == account.id:
            expense += tx.amount
        elif tx.type == TransactionType.TRANSFER:
            if tx.account_id == account.id:
                expense += tx.amount
            if tx.to_account_id == account.id:
                income += tx.amount
    return income - expense


def account_balance(account) -> Decimal:
    """
    Contas de dinheiro / vales: saldo disponível.
    Cartão de crédito: valor em aberto (dívida positiva = você deve).
    No cartão, initial_balance = dívida inicial já aberta.
    """
    delta = _ledger_delta(account)
    if is_liability_account(account):
        # Despesas aumentam dívida; transferências recebidas (pagamento) diminuem.
        return (account.initial_balance - delta).quantize(Decimal('0.01'))
    return (account.initial_balance + delta).quantize(Decimal('0.01'))


def account_available(account) -> Decimal | None:
    """
    Quanto ainda pode gastar neste meio.
    Cartão: limite − dívida. Vale pré-pago: saldo. Demais: None.
    """
    bal = account_balance(account)
    lim = account.limit_amount
    if account.account_type == AccountType.CREDIT:
        if lim is None:
            return None
        return (Decimal(lim) - bal).quantize(Decimal('0.01'))
    if is_prepaid_account(account):
        return bal
    return None


def pay_credit_bill(*, user, credit_account, from_account, amount, occurred_on, description=''):
    """Paga fatura: transferência dinheiro → cartão (sem despesa duplicada no mês)."""
    from .models import (
        Transaction, TransactionType, TransactionStatus, PaymentMethod, TransactionSource,
    )

    if not is_liability_account(credit_account):
        raise ValueError('Conta destino precisa ser cartão de crédito.')
    if is_liability_account(from_account):
        raise ValueError('Pague a fatura a partir de uma conta de dinheiro.')
    if from_account.user_id != user.id or credit_account.user_id != user.id:
        raise PermissionError('Conta inválida.')
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValueError('Valor deve ser positivo.')

    return Transaction.objects.create(
        user=user,
        account=from_account,
        to_account=credit_account,
        type=TransactionType.TRANSFER,
        amount=amount,
        occurred_on=occurred_on,
        description=description or f'Pagamento fatura {credit_account.name}',
        payment_method=PaymentMethod.OTHER,
        source=TransactionSource.MANUAL,
        status=TransactionStatus.CONFIRMED,
    )


def month_bounds(year: int, month: int):
    start = timezone.datetime(year, month, 1).date()
    if month == 12:
        end = timezone.datetime(year + 1, 1, 1).date()
    else:
        end = timezone.datetime(year, month + 1, 1).date()
    return start, end


def _shift_months(d: date, months: int) -> date:
    y, m, day = d.year, d.month, d.day
    m += months
    while m < 1:
        m += 12
        y -= 1
    while m > 12:
        m -= 12
        y += 1
    day = min(day, monthrange(y, m)[1])
    return date(y, m, day)


def _plan_description(payload: dict) -> str:
    hints = payload.get('hints') or {}
    desc = (payload.get('description') or 'Boleto').strip()
    desc = re.sub(r'\s*·\s*parcela\s+\d+/\d+', '', desc, flags=re.I).strip()
    if hints.get('agreement_id') and f"acordo {hints['agreement_id']}" not in desc.lower():
        desc = f"{desc} · acordo {hints['agreement_id']}" if desc else f"acordo {hints['agreement_id']}"
    return (desc or 'Parcelamento')[:255]


def register_bill_expense(
    *,
    user,
    account,
    payload: dict,
    occurred_on,
    amount,
    description: str,
    notes: str = '',
    payment_method: str = 'boleto',
    external_ref: str = '',
    source: str = 'parser',
    category=None,
    tx_type: str = 'expense',
):
    """Cria despesa pendente do boleto e, se houver N/M, o parcelamento correspondente."""
    from .models import (
        InstallmentPlan, PaymentMethod, Transaction, TransactionStatus,
    )
    from .parsers import installment_spec_from_payload

    spec = installment_spec_from_payload(payload)
    hints = payload.get('hints') or {}
    plan = None
    extra_notes = []

    if spec:
        current, total = spec
        plan_desc = _plan_description(payload)
        acordo = str(hints.get('agreement_id') or '').strip()
        qs = InstallmentPlan.objects.filter(
            user=user, is_active=True, installment_amount=amount, total_installments=total,
        )
        if acordo:
            plan = qs.filter(notes__contains=f'acordo:{acordo}').first()
        if plan is None:
            plan = qs.filter(description=plan_desc).first()
        if plan is None:
            start_on = _shift_months(occurred_on, 1 - current)
            plan_notes = []
            if acordo:
                plan_notes.append(f'acordo:{acordo}')
            plan_notes.append('origem:boleto')
            plan = InstallmentPlan.objects.create(
                user=user,
                account=account,
                category=category,
                description=plan_desc,
                notes='\n'.join(plan_notes),
                total_amount=amount * total,
                installment_amount=amount,
                total_installments=total,
                paid_installments=max(0, current - 1),
                start_on=start_on,
                next_due_on=occurred_on,
                payment_method=payment_method or PaymentMethod.BOLETO,
                is_active=True,
            )
        extra_notes.append(f'parcelamento:{plan.id}')
        extra_notes.append(f'parcela:{current}/{total}')

    note_parts = [n for n in [notes, *extra_notes] if n]
    tx = Transaction.objects.create(
        user=user,
        account=account,
        category=category,
        type=tx_type or 'expense',
        amount=amount,
        occurred_on=occurred_on,
        description=description[:255],
        notes='\n'.join(note_parts),
        payment_method=payment_method or PaymentMethod.OTHER,
        external_ref=(external_ref or '')[:255],
        source=source,
        status=TransactionStatus.PENDING,
    )
    return tx, plan
