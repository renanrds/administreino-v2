from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, views
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse

from .models import (
    Account, Category, Transaction, Budget, RecurringRule, InstallmentPlan, InboxItem,
    TransactionSource, TransactionStatus, InboxStatus, PaymentMethod,
    MarketList, MarketListItem, MarketListStatus, ActivityLog, ActivityAction,
)
from .permissions import HasMoneygerAccess
from .serializers import (
    AccountSerializer, CategorySerializer, TransactionSerializer,
    BudgetSerializer, RecurringRuleSerializer, InstallmentPlanSerializer,
    InboxItemSerializer, ParseCaptureSerializer, ConfirmInboxSerializer,
    MarketListSerializer, MarketListItemSerializer, MarketCheckItemSerializer,
    MarketListToTransactionSerializer, ActivityLogSerializer,
)
from .parsers import parse_capture
from .services import (
    ensure_default_categories, account_balance, month_bounds,
    is_liability_account, pay_credit_bill, register_bill_expense,
    log_activity, undo_installment_payment,
)


class MoneygerMixin:
    permission_classes = [permissions.IsAuthenticated, HasMoneygerAccess]


class AccountListCreateView(MoneygerMixin, generics.ListCreateAPIView):
    serializer_class = AccountSerializer

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        ensure_default_categories(self.request.user)
        serializer.save(user=self.request.user)


class AccountDetailView(MoneygerMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AccountSerializer

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class AccountPayBillView(MoneygerMixin, views.APIView):
    """Paga a fatura do cartão debitando uma conta de dinheiro."""

    def post(self, request, pk):
        credit = get_object_or_404(Account, pk=pk, user=request.user, is_active=True)
        from_id = request.data.get('from_account')
        amount = request.data.get('amount')
        occurred_on = request.data.get('occurred_on') or timezone.localdate().isoformat()
        description = (request.data.get('description') or '').strip()

        if not from_id or amount is None:
            return Response(
                {'detail': 'from_account e amount são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from_account = get_object_or_404(Account, pk=from_id, user=request.user, is_active=True)
        try:
            tx = pay_credit_bill(
                user=request.user,
                credit_account=credit,
                from_account=from_account,
                amount=amount,
                occurred_on=date.fromisoformat(str(occurred_on)[:10]),
                description=description,
            )
        except (ValueError, PermissionError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'transaction': TransactionSerializer(tx).data,
            'credit_account': AccountSerializer(credit).data,
            'from_account': AccountSerializer(from_account).data,
        }, status=status.HTTP_201_CREATED)


class AccountImportStatementView(MoneygerMixin, views.APIView):
    """Lê CSV de fatura e cria/atualiza parcelamentos do cartão, sem lançamentos."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        from .statement import import_credit_statement

        account = get_object_or_404(Account, pk=pk, user=request.user, is_active=True)
        if account.account_type != 'credit':
            return Response(
                {'detail': 'Importe o extrato em uma conta de cartão de crédito.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'Envie o arquivo CSV do extrato.'}, status=status.HTTP_400_BAD_REQUEST)
        text = upload.read().decode('utf-8-sig', errors='replace')
        try:
            result = import_credit_statement(request.user, account, text)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'created': result['created'],
            'updated': result['updated'],
            'plans': InstallmentPlanSerializer(result['plans'], many=True).data,
        })


class ResetDataView(MoneygerMixin, views.APIView):
    """Apaga os registros do Moneyger e recria as categorias padrão. Mantém o Telegram."""

    def post(self, request):
        if (request.data.get('confirm') or '').strip().upper() != 'ZERAR':
            return Response(
                {'detail': 'Confirme enviando confirm=ZERAR.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user
        ActivityLog.objects.filter(user=user).delete()
        from .models import BotMarketDraft
        BotMarketDraft.objects.filter(user=user).delete()
        MarketList.objects.filter(user=user).delete()
        InboxItem.objects.filter(user=user).delete()
        Transaction.objects.filter(user=user).delete()
        Budget.objects.filter(user=user).delete()
        InstallmentPlan.objects.filter(user=user).delete()
        RecurringRule.objects.filter(user=user).delete()
        Account.objects.filter(user=user).delete()
        Category.objects.filter(user=user).delete()
        ensure_default_categories(user)
        return Response({'ok': True})


class CategoryListCreateView(MoneygerMixin, generics.ListCreateAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        ensure_default_categories(self.request.user)
        return Category.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryDetailView(MoneygerMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


class TransactionListCreateView(MoneygerMixin, generics.ListCreateAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).select_related('account', 'category')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year and month:
            start, end = month_bounds(int(year), int(month))
            qs = qs.filter(occurred_on__gte=start, occurred_on__lt=end)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        account = self.request.query_params.get('account')
        if account:
            qs = qs.filter(account_id=account)
        tx_type = self.request.query_params.get('type')
        if tx_type:
            qs = qs.filter(type=tx_type)
        return qs

    def perform_create(self, serializer):
        ensure_default_categories(self.request.user)
        account = serializer.validated_data['account']
        if account.user_id != self.request.user.id:
            raise PermissionDenied()
        serializer.save(user=self.request.user)


class TransactionDetailView(MoneygerMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        category = serializer.validated_data.get('category', serializer.instance.category)
        if category is not None and category.user_id != self.request.user.id:
            raise PermissionDenied('Categoria inválida.')
        previous = serializer.instance.account
        account = serializer.validated_data.get('account', previous)
        if account is not None and account.user_id != self.request.user.id:
            raise PermissionDenied('Conta inválida.')
        description = serializer.instance.description
        amount = serializer.instance.amount
        serializer.save()
        if account is not None and account.id != previous.id:
            label = description or 'Lançamento'
            log_activity(
                user=self.request.user,
                action=ActivityAction.TRANSACTION_ACCOUNT,
                summary=f'{label}: {previous.name} → {account.name}',
                payload={
                    'transaction_id': serializer.instance.id,
                    'amount': str(amount),
                    'from_account_id': previous.id,
                    'from_account_name': previous.name,
                    'to_account_id': account.id,
                    'to_account_name': account.name,
                },
                transaction=serializer.instance,
            )


class BudgetListCreateView(MoneygerMixin, generics.ListCreateAPIView):
    serializer_class = BudgetSerializer

    def get_queryset(self):
        qs = Budget.objects.filter(user=self.request.user).select_related('category')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        today = timezone.localdate()
        year = int(year) if year else today.year
        month = int(month) if month else today.month
        qs = qs.filter(year=year, month=month)
        start, end = month_bounds(year, month)
        budgets = list(qs)
        for b in budgets:
            spent = (
                Transaction.objects.filter(
                    user=self.request.user,
                    category=b.category,
                    type='expense',
                    status=TransactionStatus.CONFIRMED,
                    occurred_on__gte=start,
                    occurred_on__lt=end,
                ).aggregate(s=Sum('amount'))['s']
                or Decimal('0')
            )
            b.spent = spent
        return budgets

    def list(self, request, *args, **kwargs):
        budgets = self.get_queryset()
        return Response(BudgetSerializer(budgets, many=True).data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BudgetDetailView(MoneygerMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BudgetSerializer

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)


class RecurringListCreateView(MoneygerMixin, generics.ListCreateAPIView):
    serializer_class = RecurringRuleSerializer

    def get_queryset(self):
        return RecurringRule.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RecurringDetailView(MoneygerMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RecurringRuleSerializer

    def get_queryset(self):
        return RecurringRule.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class InstallmentListCreateView(MoneygerMixin, generics.ListCreateAPIView):
    serializer_class = InstallmentPlanSerializer

    def get_queryset(self):
        qs = InstallmentPlan.objects.filter(user=self.request.user).select_related('account', 'category')
        active = self.request.query_params.get('active')
        if active == '1':
            qs = qs.filter(is_active=True)
        elif active == '0':
            qs = qs.filter(is_active=False)
        return qs

    def perform_create(self, serializer):
        account = serializer.validated_data['account']
        if account.user_id != self.request.user.id:
            raise PermissionDenied()
        data = serializer.validated_data
        total_n = data['total_installments']
        installment_amount = data.get('installment_amount')
        total_amount = data.get('total_amount')
        if not installment_amount and total_amount and total_n:
            from decimal import Decimal, ROUND_HALF_UP
            installment_amount = (Decimal(total_amount) / total_n).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP,
            )
            serializer.validated_data['installment_amount'] = installment_amount
        if not total_amount and installment_amount and total_n:
            serializer.validated_data['total_amount'] = installment_amount * total_n
        from .statement import add_months

        start_on = serializer.validated_data['start_on']
        paid = int(serializer.validated_data.get('paid_installments') or 0)
        if paid >= total_n:
            serializer.validated_data['paid_installments'] = total_n
            serializer.validated_data['is_active'] = False
            serializer.validated_data['next_due_on'] = start_on
        elif paid > 0:
            serializer.validated_data['next_due_on'] = add_months(start_on, paid)
        elif 'next_due_on' not in serializer.validated_data:
            serializer.validated_data['next_due_on'] = start_on
        serializer.save(user=self.request.user)


class InstallmentDetailView(MoneygerMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InstallmentPlanSerializer

    def get_queryset(self):
        return InstallmentPlan.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class InstallmentPayView(MoneygerMixin, views.APIView):
    """Registra pagamento da próxima parcela e avança o plano."""

    def post(self, request, pk):
        from calendar import monthrange

        plan = get_object_or_404(InstallmentPlan, pk=pk, user=request.user, is_active=True)
        if plan.is_completed:
            return Response({'error': 'Parcelamento já quitado.'}, status=400)

        create_tx = request.data.get('create_transaction', True)
        occurred_on = request.data.get('occurred_on') or plan.next_due_on
        if isinstance(occurred_on, str):
            occurred_on = date.fromisoformat(occurred_on)

        paid_before = plan.paid_installments
        due_before = plan.next_due_on
        was_active = plan.is_active
        n = plan.paid_installments + 1
        tx = None
        if create_tx:
            tx = Transaction.objects.create(
                user=request.user,
                account=plan.account,
                category=plan.category,
                type='expense',
                amount=plan.installment_amount,
                occurred_on=occurred_on,
                description=f'{plan.description} ({n}/{plan.total_installments})',
                notes=plan.notes,
                payment_method=plan.payment_method,
                source=TransactionSource.MANUAL,
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
        log_activity(
            user=request.user,
            action=ActivityAction.INSTALLMENT_PAY if create_tx else ActivityAction.INSTALLMENT_MARK,
            summary=(
                f'Pagou parcela {n}/{plan.total_installments} de {plan.description}'
                if create_tx else
                f'Marcou parcela {n}/{plan.total_installments} de {plan.description}'
            ),
            payload={
                'paid_before': paid_before,
                'paid_after': plan.paid_installments,
                'next_due_before': due_before.isoformat(),
                'next_due_after': plan.next_due_on.isoformat(),
                'was_active': was_active,
                'transaction_id': tx.id if tx else None,
                'amount': str(plan.installment_amount),
                'undone': False,
            },
            installment_plan=plan,
            transaction=tx,
        )

        return Response({
            'plan': InstallmentPlanSerializer(plan).data,
            'transaction': TransactionSerializer(tx).data if tx else None,
        })


class InstallmentUndoView(MoneygerMixin, views.APIView):
    """Desfaz o último pagar ou só marcar deste parcelamento."""

    def post(self, request, pk):
        plan = get_object_or_404(InstallmentPlan, pk=pk, user=request.user)
        try:
            plan = undo_installment_payment(user=request.user, plan=plan)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'plan': InstallmentPlanSerializer(plan).data})


class ActivityListView(MoneygerMixin, views.APIView):
    def get(self, request):
        logs = list(
            ActivityLog.objects.filter(user=request.user).order_by('-created_at', '-id')[:80]
        )
        plan_ids = {row.installment_plan_id for row in logs if row.installment_plan_id}
        undoable_ids = set()
        if plan_ids:
            seen = set()
            pending = ActivityLog.objects.filter(
                user=request.user,
                installment_plan_id__in=plan_ids,
                action__in=(ActivityAction.INSTALLMENT_PAY, ActivityAction.INSTALLMENT_MARK),
                payload__undone=False,
            ).order_by('-created_at', '-id')
            for row in pending:
                if row.installment_plan_id in seen:
                    continue
                seen.add(row.installment_plan_id)
                undoable_ids.add(row.id)
        return Response(ActivityLogSerializer(
            logs, many=True, context={'undoable_ids': undoable_ids},
        ).data)


class InboxListView(MoneygerMixin, generics.ListAPIView):
    serializer_class = InboxItemSerializer

    def get_queryset(self):
        return InboxItem.objects.filter(user=self.request.user, status=InboxStatus.PENDING)


class InboxConfirmView(MoneygerMixin, views.APIView):
    def post(self, request, pk):
        item = get_object_or_404(InboxItem, pk=pk, user=request.user, status=InboxStatus.PENDING)
        ser = ConfirmInboxSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        payload = item.parsed_payload or {}

        from .parsers import is_bill_payload

        account_id = data.get('account_id') or payload.get('account_id')
        if not account_id:
            account = Account.objects.filter(user=request.user, is_active=True).first()
            if not account:
                return Response({'error': 'Crie uma conta antes de confirmar.'}, status=400)
        else:
            account = get_object_or_404(Account, pk=account_id, user=request.user)

        amount = data.get('amount')
        if amount is None:
            amount = Decimal(str(payload.get('amount') or '0'))
        if amount <= 0:
            return Response({'error': 'Valor inválido.'}, status=400)

        category = None
        cat_id = data.get('category_id', payload.get('category_id'))
        if cat_id:
            category = get_object_or_404(Category, pk=cat_id, user=request.user)

        occurred_on = data.get('occurred_on')
        if not occurred_on:
            raw = payload.get('occurred_on') or payload.get('due_on')
            occurred_on = date.fromisoformat(raw) if raw else timezone.localdate()

        hints = payload.get('hints') or {}
        from .matching import apply_payment_match, find_document_duplicates

        dups = find_document_duplicates(request.user, payload, exclude_inbox_id=item.id)
        if dups:
            is_receipt = hints.get('is_payment_receipt') or hints.get('kind') == 'receipt'
            is_bill = hints.get('is_bill') or hints.get('kind') in ('bill', 'boleto')
            if is_bill or (is_receipt and any(d.get('match_by') in ('auth', 'ref') for d in dups)):
                return Response({
                    'error': 'Documento já cadastrado.',
                    'duplicate': dups[0],
                }, status=400)

        # Comprovante com match: abater pendência em vez de criar lançamento duplicado
        best = hints.get('best_match')
        if (hints.get('is_payment_receipt') or hints.get('kind') == 'receipt') and best:
            result = apply_payment_match(
                user=request.user,
                match=best,
                occurred_on=occurred_on,
                receipt_ref=payload.get('external_ref') or hints.get('auth_code') or '',
            )
            if result.get('ok'):
                item.status = InboxStatus.CONFIRMED
                if result.get('transaction_id'):
                    item.resulting_transaction_id = result['transaction_id']
                item.save(update_fields=['status', 'resulting_transaction', 'updated_at'])
                tx = Transaction.objects.filter(pk=result['transaction_id']).first()
                if tx:
                    return Response(TransactionSerializer(tx).data, status=201)

        as_pending = is_bill_payload(payload)
        if as_pending:
            tx, _plan = register_bill_expense(
                user=request.user,
                account=account,
                payload=payload,
                occurred_on=occurred_on,
                amount=amount,
                description=data.get('description') or payload.get('description') or item.raw_text[:255],
                notes='',
                payment_method=data.get('payment_method') or payload.get('payment_method') or PaymentMethod.OTHER,
                external_ref=payload.get('external_ref') or '',
                source=item.source or TransactionSource.PARSER,
                category=category,
                tx_type=data.get('type') or payload.get('type') or 'expense',
            )
        else:
            tx = Transaction.objects.create(
                user=request.user,
                account=account,
                category=category,
                type=data.get('type') or payload.get('type') or 'expense',
                amount=amount,
                occurred_on=occurred_on,
                description=data.get('description') or payload.get('description') or item.raw_text[:255],
                payment_method=data.get('payment_method') or payload.get('payment_method') or PaymentMethod.OTHER,
                external_ref=payload.get('external_ref') or '',
                source=item.source or TransactionSource.PARSER,
                status=TransactionStatus.CONFIRMED,
            )
        item.status = InboxStatus.CONFIRMED
        item.resulting_transaction = tx
        item.save(update_fields=['status', 'resulting_transaction', 'updated_at'])
        return Response(TransactionSerializer(tx).data, status=201)


class InboxDismissView(MoneygerMixin, views.APIView):
    def post(self, request, pk):
        item = get_object_or_404(InboxItem, pk=pk, user=request.user, status=InboxStatus.PENDING)
        item.status = InboxStatus.DISMISSED
        item.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'dismissed'})


class InboxAttachmentView(MoneygerMixin, views.APIView):
    """Stream autenticado do anexo da inbox (preview no app)."""

    def get(self, request, pk):
        item = get_object_or_404(InboxItem, pk=pk, user=request.user)
        if not item.attachment:
            return Response({'detail': 'Sem anexo.'}, status=status.HTTP_404_NOT_FOUND)
        hints = (item.parsed_payload or {}).get('hints') or {}
        mime = hints.get('mime') or 'application/octet-stream'
        try:
            f = item.attachment.open('rb')
        except Exception:
            return Response({'detail': 'Arquivo indisponível.'}, status=status.HTTP_404_NOT_FOUND)
        resp = FileResponse(f, content_type=mime)
        name = hints.get('file_name') or item.attachment.name.rsplit('/', 1)[-1]
        resp['Content-Disposition'] = f'inline; filename="{name}"'
        return resp


class ParseCaptureView(MoneygerMixin, views.APIView):
    def post(self, request):
        ser = ParseCaptureSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = parse_capture(ser.validated_data['text'])
        return Response(result.to_dict())


class QuickCaptureView(MoneygerMixin, views.APIView):
    """Parse + cria InboxItem (ou Transaction direta se create_transaction=true)."""

    def post(self, request):
        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'error': 'text é obrigatório.'}, status=400)
        create_tx = bool(request.data.get('create_transaction'))
        result = parse_capture(text)
        payload = result.to_dict()

        from .matching import attach_duplicate_hints
        payload = attach_duplicate_hints(request.user, payload)
        dups = (payload.get('hints') or {}).get('duplicates') or []
        if dups and not create_tx:
            return Response({
                'error': 'Documento já cadastrado.',
                'duplicate': dups[0],
                'parsed': payload,
            }, status=409)

        if create_tx and result.amount:
            if dups:
                return Response({
                    'error': 'Documento já cadastrado.',
                    'duplicate': dups[0],
                    'parsed': payload,
                }, status=409)
            account_id = request.data.get('account_id')
            account = None
            if account_id:
                account = get_object_or_404(Account, pk=account_id, user=request.user)
            else:
                account = Account.objects.filter(user=request.user, is_active=True).first()
            if not account:
                return Response({'error': 'Crie uma conta primeiro.'}, status=400)
            ensure_default_categories(request.user)
            category = None
            from .services import suggest_category
            desc = (result.description or '').lower()
            category = suggest_category(request.user, desc, kind=result.type or 'expense')
            from .parsers import is_bill_payload
            from .services import register_bill_expense

            if is_bill_payload(payload):
                tx, _plan = register_bill_expense(
                    user=request.user,
                    account=account,
                    payload=payload,
                    occurred_on=result.occurred_on or timezone.localdate(),
                    amount=result.amount,
                    description=result.description or 'Lançamento',
                    payment_method=result.payment_method or PaymentMethod.OTHER,
                    external_ref=result.external_ref or '',
                    source=TransactionSource.PARSER if result.hints and result.hints.get('kind') != 'quick_text' else TransactionSource.MANUAL,
                    category=category,
                    tx_type=result.type or 'expense',
                )
            else:
                tx = Transaction.objects.create(
                    user=request.user,
                    account=account,
                    category=category,
                    type=result.type or 'expense',
                    amount=result.amount,
                    occurred_on=result.occurred_on or timezone.localdate(),
                    description=result.description or 'Lançamento',
                    payment_method=result.payment_method or PaymentMethod.OTHER,
                    external_ref=result.external_ref or '',
                    source=TransactionSource.PARSER if result.hints and result.hints.get('kind') != 'quick_text' else TransactionSource.MANUAL,
                    status=TransactionStatus.CONFIRMED,
                )
            return Response({'parsed': payload, 'transaction': TransactionSerializer(tx).data}, status=201)

        item = InboxItem.objects.create(
            user=request.user,
            raw_text=text,
            parsed_payload=payload,
            confidence=result.confidence,
            source=TransactionSource.PARSER,
        )
        return Response({'parsed': payload, 'inbox': InboxItemSerializer(item).data}, status=201)


class DashboardView(MoneygerMixin, views.APIView):
    def get(self, request):
        from .services import build_dashboard_snapshot

        today = timezone.localdate()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
        return Response(build_dashboard_snapshot(request.user, year=year, month=month))


def _user_market_list(user, pk) -> MarketList:
    return get_object_or_404(
        MarketList.objects.prefetch_related('items'),
        pk=pk,
        user=user,
    )


class MarketListListCreateView(MoneygerMixin, generics.ListCreateAPIView):
    serializer_class = MarketListSerializer

    def get_queryset(self):
        qs = MarketList.objects.filter(user=self.request.user).prefetch_related('items')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MarketListDetailView(MoneygerMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MarketListSerializer

    def get_queryset(self):
        return MarketList.objects.filter(user=self.request.user).prefetch_related('items')


class MarketListStartView(MoneygerMixin, views.APIView):
    def post(self, request, pk):
        market_list = _user_market_list(request.user, pk)
        if market_list.status == MarketListStatus.ACTIVE:
            return Response(MarketListSerializer(market_list).data)
        if market_list.status != MarketListStatus.DRAFT:
            return Response({'error': 'Só é possível iniciar listas em planejamento.'}, status=400)
        if market_list.items.count() == 0:
            return Response({'error': 'Adicione ao menos um item antes de iniciar.'}, status=400)
        # Uma compra ativa por vez
        if MarketList.objects.filter(user=request.user, status=MarketListStatus.ACTIVE).exclude(pk=pk).exists():
            return Response({'error': 'Já existe uma lista em compra. Conclua ou cancele antes.'}, status=400)
        market_list.status = MarketListStatus.ACTIVE
        market_list.started_at = timezone.now()
        market_list.save(update_fields=['status', 'started_at', 'updated_at'])
        return Response(MarketListSerializer(market_list).data)


class MarketListCompleteView(MoneygerMixin, views.APIView):
    def post(self, request, pk):
        market_list = _user_market_list(request.user, pk)
        if market_list.status != MarketListStatus.ACTIVE:
            return Response({'error': 'Só listas em compra podem ser concluídas.'}, status=400)
        market_list.status = MarketListStatus.COMPLETED
        market_list.completed_at = timezone.now()
        market_list.save(update_fields=['status', 'completed_at', 'updated_at'])
        return Response(MarketListSerializer(market_list).data)


class MarketListToTransactionView(MoneygerMixin, views.APIView):
    """Converte lista concluída em um lançamento de despesa."""

    def post(self, request, pk):
        market_list = _user_market_list(request.user, pk)
        if market_list.status != MarketListStatus.COMPLETED:
            return Response({'error': 'Conclua a lista antes de virar lançamento.'}, status=400)
        if market_list.resulting_transaction_id:
            return Response({
                'error': 'Esta lista já gerou um lançamento.',
                'transaction_id': market_list.resulting_transaction_id,
            }, status=400)

        amount = market_list.spent_total
        if amount <= 0:
            return Response({'error': 'Nenhum item baixado com valor.'}, status=400)

        ser = MarketListToTransactionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        account = get_object_or_404(Account, pk=data['account_id'], user=request.user, is_active=True)
        category = None
        cat_id = data.get('category_id')
        if cat_id:
            category = get_object_or_404(Category, pk=cat_id, user=request.user)
        else:
            ensure_default_categories(request.user)
            category = Category.objects.filter(
                user=request.user, is_active=True, kind='expense', name__iexact='Mercado',
            ).first()

        method_map = {
            'credit': PaymentMethod.CREDIT,
            'meal_voucher': PaymentMethod.MEAL_VOUCHER,
            'fuel_voucher': PaymentMethod.FUEL_VOUCHER,
            'cash': PaymentMethod.CASH,
            'checking': PaymentMethod.DEBIT,
            'savings': PaymentMethod.OTHER,
            'debit': PaymentMethod.DEBIT,
            'pix': PaymentMethod.PIX,
        }
        payment_method = data.get('payment_method') or method_map.get(
            account.account_type, PaymentMethod.OTHER,
        )
        occurred_on = data.get('occurred_on') or timezone.localdate()
        description = (data.get('description') or market_list.title or 'Mercado').strip()[:255]
        checked = market_list.items.filter(is_checked=True).order_by('sort_order', 'id')
        notes_lines = [f'Modo mercado · lista #{market_list.id}']
        for it in checked[:40]:
            notes_lines.append(f'- {it.name}: R$ {it.price}')
        if checked.count() > 40:
            notes_lines.append(f'… e mais {checked.count() - 40} itens')

        tx = Transaction.objects.create(
            user=request.user,
            account=account,
            category=category,
            type='expense',
            amount=amount,
            occurred_on=occurred_on,
            description=description,
            notes='\n'.join(notes_lines),
            payment_method=payment_method,
            external_ref=f'market-list:{market_list.id}',
            source=TransactionSource.MANUAL,
            status=TransactionStatus.CONFIRMED,
        )
        market_list.resulting_transaction = tx
        market_list.save(update_fields=['resulting_transaction', 'updated_at'])
        return Response({
            'list': MarketListSerializer(market_list).data,
            'transaction': TransactionSerializer(tx).data,
        }, status=201)


class MarketListCancelView(MoneygerMixin, views.APIView):
    def post(self, request, pk):
        market_list = _user_market_list(request.user, pk)
        if market_list.status not in (MarketListStatus.DRAFT, MarketListStatus.ACTIVE):
            return Response({'error': 'Lista já finalizada.'}, status=400)
        market_list.status = MarketListStatus.CANCELLED
        market_list.completed_at = timezone.now()
        market_list.save(update_fields=['status', 'completed_at', 'updated_at'])
        return Response(MarketListSerializer(market_list).data)


class MarketListItemCreateView(MoneygerMixin, views.APIView):
    """Adiciona item em lista draft ou active."""

    def post(self, request, pk):
        market_list = _user_market_list(request.user, pk)
        if market_list.status not in (MarketListStatus.DRAFT, MarketListStatus.ACTIVE):
            return Response({'error': 'Não dá para adicionar itens nesta lista.'}, status=400)
        name = (request.data.get('name') or '').strip()
        if len(name) < 1:
            return Response({'error': 'Informe o nome do item.'}, status=400)
        quantity = (request.data.get('quantity') or '').strip()[:40]
        max_order = market_list.items.order_by('-sort_order').values_list('sort_order', flat=True).first()
        item = MarketListItem.objects.create(
            market_list=market_list,
            name=name[:200],
            quantity=quantity,
            sort_order=(max_order or 0) + 1,
        )
        market_list.save(update_fields=['updated_at'])
        return Response(MarketListItemSerializer(item).data, status=201)


class MarketListItemDetailView(MoneygerMixin, views.APIView):
    def patch(self, request, pk, item_id):
        market_list = _user_market_list(request.user, pk)
        if market_list.status not in (MarketListStatus.DRAFT, MarketListStatus.ACTIVE):
            return Response({'error': 'Lista finalizada.'}, status=400)
        item = get_object_or_404(MarketListItem, pk=item_id, market_list=market_list)
        if 'name' in request.data:
            name = str(request.data.get('name') or '').strip()
            if name:
                item.name = name[:200]
        if 'quantity' in request.data:
            item.quantity = str(request.data.get('quantity') or '')[:40]
        item.save()
        return Response(MarketListItemSerializer(item).data)

    def delete(self, request, pk, item_id):
        market_list = _user_market_list(request.user, pk)
        if market_list.status not in (MarketListStatus.DRAFT, MarketListStatus.ACTIVE):
            return Response({'error': 'Lista finalizada.'}, status=400)
        item = get_object_or_404(MarketListItem, pk=item_id, market_list=market_list)
        item.delete()
        return Response(status=204)


class MarketListItemCheckView(MoneygerMixin, views.APIView):
    """Baixa do item: informa preço e marca como comprado."""

    def post(self, request, pk, item_id):
        market_list = _user_market_list(request.user, pk)
        if market_list.status != MarketListStatus.ACTIVE:
            return Response({'error': 'Inicie a compra antes de baixar itens.'}, status=400)
        item = get_object_or_404(MarketListItem, pk=item_id, market_list=market_list)
        ser = MarketCheckItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        unit_price = ser.validated_data['price']
        units = ser.validated_data['units']
        item.is_checked = True
        item.unit_price = unit_price
        item.units = units
        item.price = (unit_price * units).quantize(Decimal('0.01'))
        item.checked_at = timezone.now()
        item.save(update_fields=['is_checked', 'unit_price', 'units', 'price', 'checked_at', 'updated_at'])
        market_list.save(update_fields=['updated_at'])
        return Response({
            'item': MarketListItemSerializer(item).data,
            'list': MarketListSerializer(market_list).data,
        })

    def delete(self, request, pk, item_id):
        """Desfaz baixa (volta item para pendente)."""
        market_list = _user_market_list(request.user, pk)
        if market_list.status != MarketListStatus.ACTIVE:
            return Response({'error': 'Só em compra ativa.'}, status=400)
        item = get_object_or_404(MarketListItem, pk=item_id, market_list=market_list)
        item.is_checked = False
        item.unit_price = None
        item.units = Decimal('1')
        item.price = None
        item.checked_at = None
        item.save(update_fields=['is_checked', 'unit_price', 'units', 'price', 'checked_at', 'updated_at'])
        market_list.save(update_fields=['updated_at'])
        return Response({
            'item': MarketListItemSerializer(item).data,
            'list': MarketListSerializer(market_list).data,
        })
