from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q, Sum


class FinancialProfile(models.Model):
    class FinancialGoal(models.TextChoices):
        CONTROL_SPENDING = 'control_spending', 'Controlar gastos'
        BUILD_RESERVE = 'build_reserve', 'Montar reserva'
        PAY_DEBTS = 'pay_debts', 'Quitar dívidas'
        INVEST_BETTER = 'invest_better', 'Investir melhor'

    class RiskProfile(models.TextChoices):
        CONSERVATIVE = 'conservative', 'Conservador'
        BALANCED = 'balanced', 'Equilibrado'
        BOLD = 'bold', 'Arrojado'

    class PlanningStyle(models.TextChoices):
        SIMPLE = 'simple', 'Quero algo simples'
        GUIDED = 'guided', 'Quero orientação'
        DETAILED = 'detailed', 'Quero detalhe total'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='financial_profile')
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    monthly_fixed_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    savings_target_percent = models.PositiveSmallIntegerField(default=10)
    payday_day = models.PositiveSmallIntegerField(default=5)
    financial_goal = models.CharField(max_length=32, choices=FinancialGoal.choices, default=FinancialGoal.CONTROL_SPENDING)
    risk_profile = models.CharField(max_length=20, choices=RiskProfile.choices, default=RiskProfile.BALANCED)
    planning_style = models.CharField(max_length=20, choices=PlanningStyle.choices, default=PlanningStyle.SIMPLE)
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Perfil Financeiro'
        verbose_name_plural = 'Perfis Financeiros'


class Wallet(models.Model):
    class WalletType(models.TextChoices):
        CASH = 'cash', 'Dinheiro'
        CHECKING = 'checking', 'Conta corrente'
        SAVINGS = 'savings', 'Reserva'
        INVESTMENT = 'investment', 'Investimento'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallets')
    name = models.CharField(max_length=80)
    wallet_type = models.CharField(max_length=20, choices=WalletType.choices, default=WalletType.CHECKING)
    initial_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_primary = models.BooleanField(default=False)
    include_in_dashboard = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Carteira'
        verbose_name_plural = 'Carteiras'
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f'{self.user.username} - {self.name}'

    @property
    def current_balance(self):
        totals = self.transactions.aggregate(
            income_total=Sum('amount', filter=Q(transaction_type=Transaction.TransactionType.INCOME)),
            expense_total=Sum('amount', filter=Q(transaction_type=Transaction.TransactionType.EXPENSE)),
        )
        income_total = totals['income_total'] or Decimal('0.00')
        expense_total = totals['expense_total'] or Decimal('0.00')
        return self.initial_balance + income_total - expense_total


class Category(models.Model):
    class CategoryType(models.TextChoices):
        EXPENSE = 'expense', 'Saída'
        INCOME = 'income', 'Entrada'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='finance_categories')
    name = models.CharField(max_length=60)
    category_type = models.CharField(max_length=20, choices=CategoryType.choices)
    color = models.CharField(max_length=20, default='#22c55e')
    icon = models.CharField(max_length=24, blank=True, default='wallet')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Categoria Financeira'
        verbose_name_plural = 'Categorias Financeiras'
        ordering = ['category_type', 'name']
        unique_together = ('user', 'name', 'category_type')

    def __str__(self):
        return self.name


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        EXPENSE = 'expense', 'Saída'
        INCOME = 'income', 'Entrada'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    description = models.CharField(max_length=140)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_date = models.DateField()
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Transação'
        verbose_name_plural = 'Transações'
        ordering = ['-transaction_date', '-created_at']

    def __str__(self):
        return f'{self.get_transaction_type_display()} - {self.description}'
