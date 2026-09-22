from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q


class AccountType(models.TextChoices):
    CHECKING = 'checking', 'Conta corrente'
    SAVINGS = 'savings', 'Poupança'
    CASH = 'cash', 'Dinheiro'
    CREDIT = 'credit', 'Cartão de crédito'
    MEAL_VOUCHER = 'meal_voucher', 'Vale alimentação / refeição'
    FUEL_VOUCHER = 'fuel_voucher', 'Vale combustível / transporte'
    OTHER = 'other', 'Outro'


LIMIT_ACCOUNT_TYPES = {
    AccountType.CREDIT,
}

PREPAID_ACCOUNT_TYPES = {
    AccountType.MEAL_VOUCHER,
    AccountType.FUEL_VOUCHER,
}


class CategoryKind(models.TextChoices):
    EXPENSE = 'expense', 'Despesa'
    INCOME = 'income', 'Receita'


class TransactionType(models.TextChoices):
    EXPENSE = 'expense', 'Despesa'
    INCOME = 'income', 'Receita'
    TRANSFER = 'transfer', 'Transferência'


class PaymentMethod(models.TextChoices):
    PIX = 'pix', 'PIX'
    BOLETO = 'boleto', 'Boleto'
    CREDIT = 'credit', 'Crédito'
    DEBIT = 'debit', 'Débito'
    CASH = 'cash', 'Dinheiro'
    MEAL_VOUCHER = 'meal_voucher', 'Vale alimentação / refeição'
    FUEL_VOUCHER = 'fuel_voucher', 'Vale combustível / transporte'
    OTHER = 'other', 'Outro'


class TransactionSource(models.TextChoices):
    MANUAL = 'manual', 'Manual'
    TELEGRAM = 'telegram', 'Telegram'
    IMPORT = 'import', 'Importação'
    PARSER = 'parser', 'Parser'
    RECURRING = 'recurring', 'Recorrente'


class TransactionStatus(models.TextChoices):
    CONFIRMED = 'confirmed', 'Confirmado'
    PENDING = 'pending', 'Pendente'


class InboxStatus(models.TextChoices):
    PENDING = 'pending', 'Pendente'
    CONFIRMED = 'confirmed', 'Confirmado'
    DISMISSED = 'dismissed', 'Descartado'


class Account(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_accounts')
    name = models.CharField(max_length=120)
    account_type = models.CharField(max_length=20, choices=AccountType.choices, default=AccountType.CHECKING)
    initial_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Limite de crédito / benefício (obrigatório para cartão e vales)
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    color = models.CharField(max_length=20, blank=True, default='#22c55e')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields=['user', 'is_active'])]

    def __str__(self):
        return f'{self.user_id} — {self.name}'

    @property
    def requires_limit(self) -> bool:
        return self.account_type in LIMIT_ACCOUNT_TYPES


class Category(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='moneyger_categories',
        null=True,
        blank=True,
        help_text='Null = categoria padrão do sistema (seed).',
    )
    name = models.CharField(max_length=80)
    kind = models.CharField(max_length=20, choices=CategoryKind.choices, default=CategoryKind.EXPENSE)
    icon = models.CharField(max_length=40, blank=True, default='')
    color = models.CharField(max_length=20, blank=True, default='#22c55e')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['kind', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name', 'kind'],
                name='moneyger_category_user_name_kind_uniq',
            ),
        ]

    def __str__(self):
        return self.name


class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_transactions')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions',
    )
    to_account = models.ForeignKey(
        Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='incoming_transfers',
    )
    type = models.CharField(max_length=20, choices=TransactionType.choices, default=TransactionType.EXPENSE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    occurred_on = models.DateField()
    description = models.CharField(max_length=255, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.OTHER,
    )
    external_ref = models.CharField(max_length=255, blank=True, default='')
    source = models.CharField(max_length=20, choices=TransactionSource.choices, default=TransactionSource.MANUAL)
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.CONFIRMED)
    attachment = models.FileField(upload_to='moneyger/%Y/%m/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-occurred_on', '-created_at']
        indexes = [
            models.Index(fields=['user', 'occurred_on']),
            models.Index(fields=['user', 'status']),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name='moneyger_tx_amount_positive'),
        ]

    def __str__(self):
        return f'{self.type} {self.amount} @ {self.occurred_on}'


class Budget(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_budgets')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='budgets')
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'category', 'year', 'month'],
                name='moneyger_budget_user_cat_period_uniq',
            ),
            models.CheckConstraint(
                condition=Q(month__gte=1) & Q(month__lte=12),
                name='moneyger_budget_month_valid',
            ),
        ]

    def __str__(self):
        return f'{self.category_id} {self.month}/{self.year}'


class RecurringRule(models.Model):
    class Frequency(models.TextChoices):
        MONTHLY = 'monthly', 'Mensal'
        WEEKLY = 'weekly', 'Semanal'
        YEARLY = 'yearly', 'Anual'

    class Nature(models.TextChoices):
        FIXED = 'fixed', 'Despesa fixa'
        INCOME = 'income_fixed', 'Receita fixa'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_recurring')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='recurring_rules')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=20, choices=TransactionType.choices, default=TransactionType.EXPENSE)
    nature = models.CharField(max_length=20, choices=Nature.choices, default=Nature.FIXED)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default='')
    frequency = models.CharField(max_length=20, choices=Frequency.choices, default=Frequency.MONTHLY)
    next_due_on = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.OTHER)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_due_on']

    def __str__(self):
        return self.description


class InstallmentPlan(models.Model):
    """Compra parcelada (ex.: 10x de R$ 150 no cartão)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_installments')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='installment_plans')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default='')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_installments = models.PositiveIntegerField()
    paid_installments = models.PositiveIntegerField(default=0)
    start_on = models.DateField()
    next_due_on = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CREDIT)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_due_on', '-created_at']
        constraints = [
            models.CheckConstraint(
                condition=Q(total_installments__gte=1),
                name='moneyger_installment_total_gte_1',
            ),
            models.CheckConstraint(
                condition=Q(paid_installments__gte=0),
                name='moneyger_installment_paid_gte_0',
            ),
        ]

    @property
    def remaining_installments(self) -> int:
        return max(0, self.total_installments - self.paid_installments)

    @property
    def is_completed(self) -> bool:
        return self.paid_installments >= self.total_installments

    def __str__(self):
        return f'{self.description} ({self.paid_installments}/{self.total_installments})'


class InboxItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_inbox')
    status = models.CharField(max_length=20, choices=InboxStatus.choices, default=InboxStatus.PENDING)
    raw_text = models.TextField(blank=True, default='')
    parsed_payload = models.JSONField(default=dict, blank=True)
    confidence = models.FloatField(default=0.0)
    source = models.CharField(max_length=20, choices=TransactionSource.choices, default=TransactionSource.PARSER)
    telegram_message_id = models.CharField(max_length=64, blank=True, default='')
    attachment = models.FileField(upload_to='moneyger/inbox/%Y/%m/', null=True, blank=True)
    resulting_transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='from_inbox',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'status'])]

    def __str__(self):
        return f'inbox:{self.id} ({self.status})'


class TelegramLink(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_telegram',
    )
    chat_id = models.CharField(max_length=64, unique=True)
    link_code = models.CharField(max_length=12, blank=True, default='')
    linked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user_id} ↔ {self.chat_id}'


class MarketListStatus(models.TextChoices):
    DRAFT = 'draft', 'Planejando'
    ACTIVE = 'active', 'Em compra'
    COMPLETED = 'completed', 'Concluída'
    CANCELLED = 'cancelled', 'Cancelada'


class MarketList(models.Model):
    """Lista de compras do Modo mercado (limite + baixa com valor)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_market_lists',
    )
    title = models.CharField(max_length=120, default='Lista de mercado')
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=MarketListStatus.choices, default=MarketListStatus.DRAFT,
    )
    notes = models.TextField(blank=True, default='')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    resulting_transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='from_market_list',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['user', 'status'])]
        constraints = [
            models.CheckConstraint(
                condition=Q(limit_amount__gt=0),
                name='moneyger_market_list_limit_positive',
            ),
        ]

    def __str__(self):
        return f'{self.title} ({self.status})'

    @property
    def spent_total(self):
        from django.db.models import Sum as DjSum
        total = self.items.filter(is_checked=True, price__isnull=False).aggregate(
            s=DjSum('price'),
        )['s']
        return total or Decimal('0')

    @property
    def items_count(self) -> int:
        return self.items.count()

    @property
    def checked_count(self) -> int:
        return self.items.filter(is_checked=True).count()


class MarketListItem(models.Model):
    market_list = models.ForeignKey(MarketList, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    quantity = models.CharField(max_length=40, blank=True, default='')
    is_checked = models.BooleanField(default=False)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    units = models.DecimalField(max_digits=8, decimal_places=3, default=1)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'id']
        constraints = [
            models.CheckConstraint(
                condition=Q(units__gt=0),
                name='moneyger_market_item_units_positive',
            ),
        ]

    def __str__(self):
        return self.name


class BotMarketDraft(models.Model):
    """Lista de mercado sendo montada no Telegram, um item por mensagem."""

    class Phase(models.TextChoices):
        LIMIT = 'limit', 'Aguardando teto'
        ITEMS = 'items', 'Recebendo itens'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_market_draft',
    )
    chat_id = models.CharField(max_length=64)
    market_list = models.ForeignKey(
        MarketList, on_delete=models.SET_NULL, null=True, blank=True, related_name='bot_drafts',
    )
    phase = models.CharField(max_length=16, choices=Phase.choices, default=Phase.LIMIT)
    pending_name = models.CharField(max_length=200, blank=True, default='')
    last_activity_at = models.DateTimeField()
    warned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['last_activity_at'])]

    def __str__(self):
        return f'{self.user_id} lista ({self.phase})'


class ActivityAction(models.TextChoices):
    INSTALLMENT_PAY = 'installment_pay', 'Pagou parcela'
    INSTALLMENT_MARK = 'installment_mark', 'Marcou parcela'
    INSTALLMENT_UNDO = 'installment_undo', 'Desfez parcela'
    TRANSACTION_ACCOUNT = 'transaction_account', 'Alterou conta do lançamento'


class ActivityLog(models.Model):
    """Histórico de ações que mudam saldo, limite ou parcelamento."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moneyger_activity',
    )
    action = models.CharField(max_length=32, choices=ActivityAction.choices)
    summary = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)
    installment_plan = models.ForeignKey(
        InstallmentPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity',
    )
    transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return self.summary
