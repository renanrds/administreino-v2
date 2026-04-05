from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Modelo de usuário customizado para o Administreino."""
    class Gender(models.TextChoices):
        MALE = 'male', 'Masculino'
        FEMALE = 'female', 'Feminino'
        NON_BINARY = 'non_binary', 'Nao-binario'
        OTHER = 'other', 'Outro'
        PREFER_NOT_TO_SAY = 'prefer_not_to_say', 'Prefiro nao informar'

    class ExperienceLevel(models.TextChoices):
        BEGINNER = 'beginner', 'Iniciante'
        INTERMEDIATE = 'intermediate', 'Intermediario'
        ADVANCED = 'advanced', 'Avancado'

    class GymAppPreference(models.TextChoices):
        NONE = 'none', 'Nenhum'
        WELLHUB = 'wellhub', 'Wellhub'
        TOTALPASS = 'totalpass', 'Totalpass'
        BOTH = 'both', 'Wellhub e Totalpass'

    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True, default='')
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    wellhub_enabled = models.BooleanField(default=False, help_text="Ativa integração com Wellhub para geofencing")
    gender = models.CharField(max_length=20, choices=Gender.choices, blank=True, default='')
    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevel.choices,
        default=ExperienceLevel.INTERMEDIATE,
    )
    age = models.PositiveIntegerField(null=True, blank=True)
    primary_goal = models.CharField(max_length=120, blank=True, default='')
    weekly_training_days = models.PositiveIntegerField(null=True, blank=True)
    gym_app_preference = models.CharField(
        max_length=20,
        choices=GymAppPreference.choices,
        default=GymAppPreference.NONE,
    )
    terms_accepted = models.BooleanField(default=False, help_text="Usuário aceitou os termos de isenção de responsabilidade")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return self.email


class GymLocation(models.Model):
    """Localização de academia do usuário para geofencing do Wellhub."""
    class GymApp(models.TextChoices):
        WELLHUB = 'wellhub', 'Wellhub'
        TOTALPASS = 'totalpass', 'Totalpass'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gym_locations')
    name = models.CharField(max_length=200, help_text="Nome da academia (ex: Academia Fitness, CrossFit)")
    gym_app = models.CharField(max_length=20, choices=GymApp.choices, default=GymApp.WELLHUB)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Latitude da academia")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Longitude da academia")
    is_primary = models.BooleanField(default=False, help_text="Academia padrão para geofencing")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Localização de Academia'
        verbose_name_plural = 'Localizações de Academias'
        unique_together = ('user', 'gym_app', 'name')
        ordering = ['-is_primary', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.name}"
