from decimal import Decimal

from django.utils import timezone
from django.db.models import Q, Sum
from rest_framework import serializers

from .models import Category, FinancialProfile, Transaction, Wallet


class FinancialProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialProfile
        fields = [
            'monthly_income',
            'monthly_fixed_expenses',
            'savings_target_percent',
            'payday_day',
            'financial_goal',
            'risk_profile',
            'planning_style',
            'onboarding_completed',
        ]


class FinancialOnboardingSerializer(serializers.Serializer):
    wallet_name = serializers.CharField(max_length=80)
    initial_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_fixed_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    savings_target_percent = serializers.IntegerField(min_value=0, max_value=100)
    payday_day = serializers.IntegerField(min_value=1, max_value=31)
    financial_goal = serializers.ChoiceField(choices=FinancialProfile.FinancialGoal.choices)
    risk_profile = serializers.ChoiceField(choices=FinancialProfile.RiskProfile.choices)
    planning_style = serializers.ChoiceField(choices=FinancialProfile.PlanningStyle.choices)


class WalletSerializer(serializers.ModelSerializer):
    current_balance = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = [
            'id',
            'name',
            'wallet_type',
            'initial_balance',
            'current_balance',
            'is_primary',
            'include_in_dashboard',
            'created_at',
        ]
        read_only_fields = ['id', 'current_balance', 'created_at']

    def get_current_balance(self, obj):
        return obj.current_balance


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'category_type', 'color', 'icon', 'is_default']
        read_only_fields = ['id', 'is_default']


class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    wallet_name = serializers.CharField(source='wallet.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'wallet',
            'wallet_name',
            'category',
            'category_name',
            'transaction_type',
            'description',
            'amount',
            'transaction_date',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'wallet_name', 'category_name', 'created_at']

    def validate_wallet(self, wallet):
        request = self.context['request']
        if wallet.user_id != request.user.id:
            raise serializers.ValidationError('Carteira inválida para este usuário.')
        return wallet

    def validate_category(self, category):
        request = self.context['request']
        if category and category.user_id != request.user.id:
            raise serializers.ValidationError('Categoria inválida para este usuário.')
        return category


class FinancialDashboardSerializer(serializers.Serializer):
    onboarding_completed = serializers.BooleanField()
    profile = FinancialProfileSerializer(allow_null=True)
    summary = serializers.DictField()
    wallets = WalletSerializer(many=True)
    recent_transactions = TransactionSerializer(many=True)
    expense_breakdown = serializers.ListField()
    insights = serializers.ListField(child=serializers.CharField())


def build_dashboard_payload(user):
    profile = getattr(user, 'financial_profile', None)
    wallets = Wallet.objects.filter(user=user)
    transactions = Transaction.objects.filter(user=user).select_related('wallet', 'category')
    today = timezone.localdate()
    current_month_transactions = transactions.filter(
        transaction_date__year=today.year,
        transaction_date__month=today.month,
    )

    month_totals = current_month_transactions.aggregate(
        income_total=Sum('amount', filter=Q(transaction_type=Transaction.TransactionType.INCOME)),
        expense_total=Sum('amount', filter=Q(transaction_type=Transaction.TransactionType.EXPENSE)),
    )

    total_balance = Decimal('0.00')
    wallet_list = list(wallets)
    for wallet in wallet_list:
        total_balance += wallet.current_balance if wallet.include_in_dashboard else Decimal('0.00')

    income_total = month_totals['income_total'] or Decimal('0.00')
    expense_total = month_totals['expense_total'] or Decimal('0.00')
    monthly_goal = Decimal('0.00')
    if profile:
        monthly_goal = (profile.monthly_income * Decimal(profile.savings_target_percent) / Decimal('100')).quantize(Decimal('0.01'))

    breakdown_rows = (
        current_month_transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE)
        .values('category__name', 'category__color')
        .annotate(total=Sum('amount'))
        .order_by('-total')[:6]
    )

    savings_now = income_total - expense_total
    insights = []
    if profile:
        if savings_now < monthly_goal:
            insights.append('Sua poupança do período está abaixo da meta. Priorize revisar gastos fixos e assinaturas.')
        else:
            insights.append('Sua meta de poupança está em ritmo saudável com base nos lançamentos atuais.')

        if profile.financial_goal == FinancialProfile.FinancialGoal.PAY_DEBTS:
            insights.append('Vale priorizar carteira separada para dívidas e concentrar pagamentos recorrentes nela.')
        elif profile.financial_goal == FinancialProfile.FinancialGoal.BUILD_RESERVE:
            insights.append('Crie o hábito de mover parte da renda para uma carteira de reserva no dia do pagamento.')
        elif profile.financial_goal == FinancialProfile.FinancialGoal.INVEST_BETTER:
            insights.append('Depois de organizar caixa e reserva, o próximo ganho vem de aportes consistentes.')
        else:
            insights.append('Classifique gastos por categoria para enxergar rapidamente onde o caixa escapa.')
    else:
        insights.append('Complete o onboarding financeiro para receber recomendações mais precisas.')

    return {
        'onboarding_completed': bool(profile and profile.onboarding_completed),
        'profile': FinancialProfileSerializer(profile).data if profile else None,
        'summary': {
            'total_balance': total_balance,
            'income_total': income_total,
            'expense_total': expense_total,
            'monthly_goal': monthly_goal,
            'savings_now': savings_now,
        },
        'wallets': WalletSerializer(wallet_list, many=True).data,
        'recent_transactions': TransactionSerializer(transactions[:8], many=True).data,
        'expense_breakdown': [
            {
                'category': row['category__name'] or 'Sem categoria',
                'color': row['category__color'] or '#64748b',
                'total': row['total'],
            }
            for row in breakdown_rows
        ],
        'insights': insights,
    }
