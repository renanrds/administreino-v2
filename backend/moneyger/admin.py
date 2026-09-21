from django.contrib import admin
from .models import (
    Account, Category, Transaction, Budget, RecurringRule, InstallmentPlan,
    InboxItem, TelegramLink, MarketList, MarketListItem,
)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'account_type', 'is_active']
    list_filter = ['account_type', 'is_active']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'kind', 'is_active']
    list_filter = ['kind']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['description', 'user', 'type', 'amount', 'occurred_on', 'status']
    list_filter = ['type', 'status', 'payment_method']


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ['category', 'user', 'year', 'month', 'limit_amount']


@admin.register(RecurringRule)
class RecurringRuleAdmin(admin.ModelAdmin):
    list_display = ['description', 'user', 'amount', 'nature', 'next_due_on', 'is_active']


@admin.register(InstallmentPlan)
class InstallmentPlanAdmin(admin.ModelAdmin):
    list_display = [
        'description', 'user', 'installment_amount',
        'paid_installments', 'total_installments', 'is_active',
    ]


@admin.register(InboxItem)
class InboxItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'confidence', 'source', 'created_at']
    list_filter = ['status', 'source']


@admin.register(TelegramLink)
class TelegramLinkAdmin(admin.ModelAdmin):
    list_display = ['user', 'chat_id', 'linked_at']


class MarketListItemInline(admin.TabularInline):
    model = MarketListItem
    extra = 0


@admin.register(MarketList)
class MarketListAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'status', 'limit_amount', 'updated_at']
    list_filter = ['status']
    inlines = [MarketListItemInline]
