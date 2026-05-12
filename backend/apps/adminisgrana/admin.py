from django.contrib import admin

from .models import Category, FinancialProfile, Transaction, Wallet


@admin.register(FinancialProfile)
class FinancialProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'financial_goal', 'risk_profile', 'onboarding_completed', 'updated_at')
    search_fields = ('user__email', 'user__username')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'wallet_type', 'initial_balance', 'is_primary', 'include_in_dashboard')
    list_filter = ('wallet_type', 'is_primary', 'include_in_dashboard')
    search_fields = ('name', 'user__email', 'user__username')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'category_type', 'is_default')
    list_filter = ('category_type', 'is_default')
    search_fields = ('name', 'user__email', 'user__username')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('description', 'user', 'wallet', 'transaction_type', 'amount', 'transaction_date')
    list_filter = ('transaction_type', 'transaction_date')
    search_fields = ('description', 'user__email', 'user__username')
