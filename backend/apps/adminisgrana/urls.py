from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, FinancialDashboardView, FinancialOnboardingView, TransactionViewSet, WalletViewSet

router = DefaultRouter()
router.register(r'wallets', WalletViewSet, basename='grana-wallet')
router.register(r'categories', CategoryViewSet, basename='grana-category')
router.register(r'transactions', TransactionViewSet, basename='grana-transaction')

urlpatterns = [
    path('dashboard/', FinancialDashboardView.as_view(), name='grana_dashboard'),
    path('onboarding/', FinancialOnboardingView.as_view(), name='grana_onboarding'),
    path('', include(router.urls)),
]
