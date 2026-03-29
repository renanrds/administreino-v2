from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomTokenObtainPairView, RegisterView, ProfileView, GymLocationViewSet
from .views import AcceptTermsView

router = DefaultRouter()
router.register(r'gym-locations', GymLocationViewSet, basename='gym-location')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('accept-terms/', AcceptTermsView.as_view(), name='accept_terms'),
    path('', include(router.urls)),
]
