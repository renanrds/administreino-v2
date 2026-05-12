from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .models import GymLocation
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegisterSerializer,
    UserProfileSerializer,
    GymLocationSerializer,
    AdminUserManageSerializer,
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'message': 'Usuário criado com sucesso!', 'email': user.email},
            status=status.HTTP_201_CREATED
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserManageSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminUserManageSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all().order_by('-date_joined')


class AcceptTermsView(APIView):
    """Endpoint para o usuário aceitar os termos de isenção de responsabilidade."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Marca os termos como aceitos pelo usuário."""
        request.user.terms_accepted = True
        request.user.save()
        return Response(
            {'message': 'Termos aceitos com sucesso'},
            status=status.HTTP_200_OK
        )


class GymLocationViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar localizações de academias do usuário."""
    serializer_class = GymLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GymLocation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def set_primary(self, request, pk=None):
        """Define uma academia como principal para geofencing."""
        gym = self.get_object()
        # Remove is_primary de todas as outras
        GymLocation.objects.filter(user=request.user).update(is_primary=False)
        # Define esta como principal
        gym.is_primary = True
        gym.save()
        return Response(
            {'message': f'{gym.name} definida como academia principal'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def set_gym_apps(self, request):
        preference = request.data.get('gym_app_preference', User.GymAppPreference.NONE)
        valid_values = {choice[0] for choice in User.GymAppPreference.choices}
        if preference not in valid_values:
            return Response(
                {'error': f'gym_app_preference deve ser um de: {", ".join(sorted(valid_values))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.gym_app_preference = preference
        request.user.wellhub_enabled = preference in {User.GymAppPreference.WELLHUB, User.GymAppPreference.BOTH}
        request.user.save(update_fields=['gym_app_preference', 'wellhub_enabled'])

        return Response(
            {
                'message': 'Preferencia de app de academia atualizada com sucesso.',
                'gym_app_preference': request.user.gym_app_preference,
                'wellhub_enabled': request.user.wellhub_enabled,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def enable_wellhub(self, request):
        """Ativa a integração com Wellhub para o usuário."""
        request.user.wellhub_enabled = True
        if request.user.gym_app_preference == User.GymAppPreference.NONE:
            request.user.gym_app_preference = User.GymAppPreference.WELLHUB
        elif request.user.gym_app_preference == User.GymAppPreference.TOTALPASS:
            request.user.gym_app_preference = User.GymAppPreference.BOTH
        request.user.save(update_fields=['wellhub_enabled', 'gym_app_preference'])
        return Response(
            {
                'message': 'Wellhub ativado com sucesso',
                'gym_app_preference': request.user.gym_app_preference,
                'wellhub_enabled': request.user.wellhub_enabled,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def disable_wellhub(self, request):
        """Desativa a integração com Wellhub para o usuário."""
        request.user.wellhub_enabled = False
        if request.user.gym_app_preference == User.GymAppPreference.BOTH:
            request.user.gym_app_preference = User.GymAppPreference.TOTALPASS
        elif request.user.gym_app_preference == User.GymAppPreference.WELLHUB:
            request.user.gym_app_preference = User.GymAppPreference.NONE
        request.user.save(update_fields=['wellhub_enabled', 'gym_app_preference'])
        return Response(
            {
                'message': 'Wellhub desativado',
                'gym_app_preference': request.user.gym_app_preference,
                'wellhub_enabled': request.user.wellhub_enabled,
            },
            status=status.HTTP_200_OK
        )
