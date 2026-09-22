from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView, RegisterView, ProfileView, GymLocationViewSet,
    AcceptTermsView, AdminUserListView, AdminUserDetailView,
)

router = DefaultRouter()
router.register(r'gym-locations', GymLocationViewSet, basename='gym-location')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('accept-terms/', AcceptTermsView.as_view(), name='accept_terms'),
    path('', include(router.urls)),
]
