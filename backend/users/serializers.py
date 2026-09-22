from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import GymLocation
from .access import apps_payload_for_user, user_has_moneyger_access

User = get_user_model()


class GymLocationSerializer(serializers.ModelSerializer):
    """Serializer para localizações de academia do usuário."""
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        coerce_to_string=False  # Aceita números em vez de strings
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        coerce_to_string=False  # Aceita números em vez de strings
    )

    class Meta:
        model = GymLocation
        fields = ['id', 'name', 'gym_app', 'latitude', 'longitude', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']


def _user_public_dict(user):
    return {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'weight': float(user.weight) if user.weight is not None else None,
        'height': float(user.height) if user.height is not None else None,
        'wellhub_enabled': user.wellhub_enabled,
        'gym_app_preference': user.gym_app_preference,
        'gender': user.gender,
        'experience_level': user.experience_level,
        'age': user.age,
        'primary_goal': user.primary_goal,
        'weekly_training_days': user.weekly_training_days,
        'bio': user.bio,
        'terms_accepted': user.terms_accepted,
        'is_superuser': bool(user.is_superuser),
        'apps': apps_payload_for_user(user),
    }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token com dados extras do usuário."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = _user_public_dict(self.user)
        return data


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'gender', 'experience_level', 'age', 'primary_goal', 'weekly_training_days',
            'password', 'password2'
        ]

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'As senhas não conferem.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    gym_locations = GymLocationSerializer(many=True, read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    experience_level_display = serializers.CharField(source='get_experience_level_display', read_only=True)
    gym_app_preference_display = serializers.CharField(source='get_gym_app_preference_display', read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    apps = serializers.SerializerMethodField()

    def get_apps(self, obj):
        return apps_payload_for_user(obj)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'avatar', 'bio', 'weight', 'height',
            'gender', 'gender_display',
            'experience_level', 'experience_level_display',
            'age', 'primary_goal', 'weekly_training_days',
            'wellhub_enabled', 'gym_app_preference', 'gym_app_preference_display',
            'terms_accepted', 'gym_locations', 'created_at',
            'is_superuser', 'apps',
        ]
        read_only_fields = ['id', 'email', 'created_at', 'gym_locations', 'is_superuser', 'apps']


class AdminUserSerializer(serializers.ModelSerializer):
    moneyger = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'is_active', 'is_superuser', 'moneyger_enabled', 'moneyger',
        ]
        read_only_fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'is_superuser', 'moneyger',
        ]

    def get_moneyger(self, obj):
        return user_has_moneyger_access(obj)

    def validate_is_active(self, value):
        request = self.context.get('request')
        if (
            value is False
            and self.instance is not None
            and request is not None
            and self.instance.pk == request.user.pk
        ):
            raise serializers.ValidationError('Você não pode desativar a própria conta.')
        return value
