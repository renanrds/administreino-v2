from decimal import Decimal

from rest_framework import serializers
from .models import (
    Account, Category, Transaction, Budget, RecurringRule, InstallmentPlan,
    InboxItem, TelegramLink, MarketList, MarketListItem, MarketListStatus,
)


class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()
    requires_limit = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id', 'name', 'account_type', 'initial_balance', 'limit_amount',
            'balance', 'available', 'role', 'requires_limit', 'color',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'balance', 'available', 'role', 'requires_limit',
            'created_at', 'updated_at',
        ]

    def get_balance(self, obj):
        from .services import account_balance
        return str(account_balance(obj))

    def get_available(self, obj):
        from .services import account_available
        avail = account_available(obj)
        return str(avail) if avail is not None else None

    def get_role(self, obj):
        from .services import is_liability_account
        return 'liability' if is_liability_account(obj) else 'asset'

    def get_requires_limit(self, obj):
        return obj.requires_limit

    def validate(self, attrs):
        from .models import LIMIT_ACCOUNT_TYPES
        account_type = attrs.get('account_type')
        if account_type is None and self.instance is not None:
            account_type = self.instance.account_type
        limit = attrs.get('limit_amount', serializers.empty)
        if limit is serializers.empty and self.instance is not None:
            limit = self.instance.limit_amount
        elif limit is serializers.empty:
            limit = None

        if account_type in LIMIT_ACCOUNT_TYPES:
            if limit is None or Decimal(str(limit)) <= 0:
                raise serializers.ValidationError({
                    'limit_amount': 'Informe o limite do cartão (maior que zero).',
                })
        else:
            # Vale pré-pago e contas de dinheiro não usam limite de crédito.
            if 'limit_amount' in attrs and account_type not in LIMIT_ACCOUNT_TYPES:
                attrs['limit_amount'] = None
        return attrs


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'kind', 'icon', 'color', 'is_active', 'created_at', 'user']
        read_only_fields = ['id', 'created_at', 'user']


class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'account', 'account_name', 'category', 'category_name', 'to_account',
            'type', 'amount', 'occurred_on', 'description', 'notes',
            'payment_method', 'external_ref', 'source', 'status',
            'attachment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'account_name', 'category_name']


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, required=False)

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'year', 'month',
            'limit_amount', 'spent', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'category_name', 'spent']


class RecurringRuleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = RecurringRule
        fields = [
            'id', 'account', 'account_name', 'category', 'category_name',
            'type', 'nature', 'amount', 'description', 'notes',
            'frequency', 'next_due_on', 'payment_method', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'account_name', 'category_name']


class InstallmentPlanSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    account_name = serializers.CharField(source='account.name', read_only=True)
    remaining_installments = serializers.IntegerField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = InstallmentPlan
        fields = [
            'id', 'account', 'account_name', 'category', 'category_name',
            'description', 'notes', 'total_amount', 'installment_amount',
            'total_installments', 'paid_installments', 'remaining_installments',
            'is_completed', 'start_on', 'next_due_on', 'payment_method',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'account_name', 'category_name',
            'remaining_installments', 'is_completed',
        ]
        extra_kwargs = {
            'next_due_on': {'required': False},
        }

    def validate(self, attrs):
        total = attrs.get('total_installments', getattr(self.instance, 'total_installments', None))
        paid = attrs.get('paid_installments', getattr(self.instance, 'paid_installments', 0))
        paid = 0 if paid is None else int(paid)
        if total is not None and paid > int(total):
            raise serializers.ValidationError({
                'paid_installments': 'As parcelas já pagas não podem passar do total.',
            })
        if paid < 0:
            raise serializers.ValidationError({'paid_installments': 'Informe zero ou mais.'})
        return attrs


class InboxItemSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()
    attachment_mime = serializers.SerializerMethodField()
    has_attachment = serializers.SerializerMethodField()

    class Meta:
        model = InboxItem
        fields = [
            'id', 'status', 'raw_text', 'parsed_payload', 'confidence',
            'source', 'telegram_message_id', 'attachment',
            'attachment_url', 'attachment_mime', 'has_attachment',
            'resulting_transaction', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'resulting_transaction',
            'telegram_message_id', 'source', 'attachment',
            'attachment_url', 'attachment_mime', 'has_attachment',
        ]

    def get_has_attachment(self, obj) -> bool:
        return bool(obj.attachment)

    def get_attachment_mime(self, obj) -> str | None:
        hints = (obj.parsed_payload or {}).get('hints') or {}
        if hints.get('mime'):
            return hints['mime']
        name = (obj.attachment.name if obj.attachment else '') or ''
        lower = name.lower()
        if lower.endswith('.pdf'):
            return 'application/pdf'
        if lower.endswith(('.png',)):
            return 'image/png'
        if lower.endswith(('.webp',)):
            return 'image/webp'
        if lower.endswith(('.jpg', '.jpeg')):
            return 'image/jpeg'
        return None

    def get_attachment_url(self, obj) -> str | None:
        if not obj.attachment:
            return None
        request = self.context.get('request')
        path = f'/api/moneyger/inbox/{obj.pk}/attachment/'
        if request:
            return request.build_absolute_uri(path)
        return path


class TelegramLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramLink
        fields = ['chat_id', 'link_code', 'linked_at', 'updated_at']
        read_only_fields = ['chat_id', 'linked_at', 'updated_at']


class ParseCaptureSerializer(serializers.Serializer):
    text = serializers.CharField()


class ConfirmInboxSerializer(serializers.Serializer):
    account_id = serializers.IntegerField(required=False)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    occurred_on = serializers.DateField(required=False)
    payment_method = serializers.CharField(required=False)
    type = serializers.ChoiceField(choices=['expense', 'income', 'transfer'], required=False)


class MarketListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketListItem
        fields = [
            'id', 'name', 'quantity', 'is_checked', 'price',
            'sort_order', 'checked_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'is_checked', 'price', 'checked_at', 'created_at', 'updated_at',
        ]


class MarketListItemWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    quantity = serializers.CharField(max_length=40, required=False, allow_blank=True, default='')
    sort_order = serializers.IntegerField(required=False, min_value=0)


class MarketListSerializer(serializers.ModelSerializer):
    items = MarketListItemSerializer(many=True, read_only=True)
    spent_total = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    checked_count = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    items_input = MarketListItemWriteSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = MarketList
        fields = [
            'id', 'title', 'limit_amount', 'status', 'notes',
            'started_at', 'completed_at', 'resulting_transaction',
            'spent_total', 'remaining', 'items_count', 'checked_count',
            'items', 'items_input',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'started_at', 'completed_at', 'resulting_transaction',
            'spent_total', 'remaining', 'items_count', 'checked_count',
            'items', 'created_at', 'updated_at',
        ]

    def get_spent_total(self, obj):
        return str(obj.spent_total)

    def get_items_count(self, obj):
        return obj.items_count

    def get_checked_count(self, obj):
        return obj.checked_count

    def get_remaining(self, obj):
        return str((obj.limit_amount - obj.spent_total).quantize(Decimal('0.01')))

    def create(self, validated_data):
        items_data = validated_data.pop('items_input', [])
        market_list = MarketList.objects.create(**validated_data)
        for i, raw in enumerate(items_data):
            MarketListItem.objects.create(
                market_list=market_list,
                name=raw['name'].strip()[:200],
                quantity=(raw.get('quantity') or '')[:40],
                sort_order=raw.get('sort_order', i),
            )
        return market_list

    def update(self, instance, validated_data):
        validated_data.pop('items_input', None)
        if instance.status in (MarketListStatus.COMPLETED, MarketListStatus.CANCELLED):
            raise serializers.ValidationError('Lista finalizada não pode ser editada.')
        for attr in ('title', 'limit_amount', 'notes'):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        instance.save()
        return instance


class MarketCheckItemSerializer(serializers.Serializer):
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))


class MarketListToTransactionSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    category_id = serializers.IntegerField(required=False, allow_null=True)
    payment_method = serializers.CharField(required=False, allow_blank=True)
    occurred_on = serializers.DateField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)

