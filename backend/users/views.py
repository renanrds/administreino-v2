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
    def enable_wellhub(self, request):
        """Ativa a integração com Wellhub para o usuário."""
        request.user.wellhub_enabled = True
        request.user.save()
        return Response(
            {'message': 'Wellhub ativado com sucesso'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def disable_wellhub(self, request):
        """Desativa a integração com Wellhub para o usuário."""
        request.user.wellhub_enabled = False
        request.user.save()
        return Response(
            {'message': 'Wellhub desativado'},
            status=status.HTTP_200_OK
        )
