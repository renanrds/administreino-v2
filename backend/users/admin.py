from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, GymLocation

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username', 'first_name', 'last_name', 'wellhub_enabled', 'is_staff', 'created_at']
    list_filter = ['is_staff', 'is_active', 'wellhub_enabled']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']
    fieldsets = UserAdmin.fieldsets + (
        ('Perfil', {'fields': ('avatar', 'bio', 'weight', 'height')}),
        ('Wellhub', {'fields': ('wellhub_enabled',)}),
    )


@admin.register(GymLocation)
class GymLocationAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_primary', 'created_at']
    list_filter = ['is_primary', 'created_at']
    search_fields = ['user__username', 'user__email', 'name']
    ordering = ['-is_primary', '-created_at']
    fieldsets = (
        ('Informações', {'fields': ('user', 'name')}),
        ('Coordenadas', {'fields': ('latitude', 'longitude')}),
        ('Configuração', {'fields': ('is_primary',)}),
    )
    readonly_fields = ('created_at',)
