from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Modelo de usuário customizado para o Administreino."""
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True, default='')
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    wellhub_enabled = models.BooleanField(default=False, help_text="Ativa integração com Wellhub para geofencing")
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
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gym_locations')
    name = models.CharField(max_length=200, help_text="Nome da academia (ex: Academia Fitness, CrossFit)")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Latitude da academia")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Longitude da academia")
    is_primary = models.BooleanField(default=False, help_text="Academia padrão para geofencing")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Localização de Academia'
        verbose_name_plural = 'Localizações de Academias'
        unique_together = ('user', 'name')
        ordering = ['-is_primary', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.name}"
