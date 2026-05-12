from django.db import transaction as db_transaction
from rest_framework import mixins, permissions, viewsets
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, FinancialProfile, Transaction, Wallet
from .serializers import (
    CategorySerializer,
    FinancialOnboardingSerializer,
    TransactionSerializer,
    WalletSerializer,
    build_dashboard_payload,
)


class HasAdminisgranaAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.has_adminisgrana_access)


DEFAULT_CATEGORIES = [
    ('Salário', Category.CategoryType.INCOME, '#22c55e', 'briefcase'),
    ('Freela', Category.CategoryType.INCOME, '#10b981', 'sparkles'),
    ('Moradia', Category.CategoryType.EXPENSE, '#f97316', 'home'),
    ('Alimentação', Category.CategoryType.EXPENSE, '#f59e0b', 'utensils'),
    ('Transporte', Category.CategoryType.EXPENSE, '#06b6d4', 'car'),
    ('Saúde', Category.CategoryType.EXPENSE, '#ef4444', 'heart-pulse'),
    ('Assinaturas', Category.CategoryType.EXPENSE, '#8b5cf6', 'monitor-play'),
    ('Lazer', Category.CategoryType.EXPENSE, '#ec4899', 'party-popper'),
    ('Custos Fixos', Category.CategoryType.EXPENSE, '#64748b', 'receipt'),
]


class FinancialDashboardView(APIView):
    permission_classes = [HasAdminisgranaAccess]

    def get(self, request):
        payload = build_dashboard_payload(request.user)
        return Response(payload)


class FinancialOnboardingView(GenericAPIView):
    serializer_class = FinancialOnboardingSerializer
    permission_classes = [HasAdminisgranaAccess]

    @db_transaction.atomic
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        profile, _created = FinancialProfile.objects.update_or_create(
            user=request.user,
            defaults={
                'monthly_income': data['monthly_income'],
                'monthly_fixed_expenses': data['monthly_fixed_expenses'],
                'savings_target_percent': data['savings_target_percent'],
                'payday_day': data['payday_day'],
                'financial_goal': data['financial_goal'],
                'risk_profile': data['risk_profile'],
                'planning_style': data['planning_style'],
                'onboarding_completed': True,
            },
        )

        wallet, wallet_created = Wallet.objects.get_or_create(
            user=request.user,
            is_primary=True,
            defaults={
                'name': data['wallet_name'],
                'wallet_type': Wallet.WalletType.CHECKING,
                'initial_balance': data['initial_balance'],
            },
        )
        if not wallet_created:
            wallet.name = data['wallet_name']
            wallet.initial_balance = data['initial_balance']
            wallet.save(update_fields=['name', 'initial_balance', 'updated_at'])

        existing_categories = Category.objects.filter(user=request.user).count()
        if existing_categories == 0:
            Category.objects.bulk_create([
                Category(
                    user=request.user,
                    name=name,
                    category_type=category_type,
                    color=color,
                    icon=icon,
                    is_default=True,
                )
                for name, category_type, color, icon in DEFAULT_CATEGORIES
            ])

        if not Transaction.objects.filter(user=request.user).exists():
            income_category = Category.objects.filter(user=request.user, name='Salário').first()
            expense_category = Category.objects.filter(user=request.user, name='Custos Fixos').first()
            Transaction.objects.bulk_create([
                Transaction(
                    user=request.user,
                    wallet=wallet,
                    category=income_category,
                    transaction_type=Transaction.TransactionType.INCOME,
                    description='Renda mensal estimada',
                    amount=data['monthly_income'],
                    transaction_date=profile.updated_at.date(),
                ),
                Transaction(
                    user=request.user,
                    wallet=wallet,
                    category=expense_category,
                    transaction_type=Transaction.TransactionType.EXPENSE,
                    description='Custos fixos planejados',
                    amount=data['monthly_fixed_expenses'],
                    transaction_date=profile.updated_at.date(),
                ),
            ])

        payload = build_dashboard_payload(request.user)
        return Response(payload)


class WalletViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = WalletSerializer
    permission_classes = [HasAdminisgranaAccess]

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = CategorySerializer
    permission_classes = [HasAdminisgranaAccess]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [HasAdminisgranaAccess]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related('wallet', 'category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
