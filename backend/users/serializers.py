from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import GymLocation

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


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token com dados extras do usuário."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'username': self.user.username,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'weight': float(self.user.weight) if self.user.weight is not None else None,
            'height': float(self.user.height) if self.user.height is not None else None,
            'wellhub_enabled': self.user.wellhub_enabled,
            'gym_app_preference': self.user.gym_app_preference,
            'gender': self.user.gender,
            'experience_level': self.user.experience_level,
            'age': self.user.age,
            'primary_goal': self.user.primary_goal,
            'weekly_training_days': self.user.weekly_training_days,
            'bio': self.user.bio,
            'terms_accepted': self.user.terms_accepted,
        }
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

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'avatar', 'bio', 'weight', 'height',
            'gender', 'gender_display',
            'experience_level', 'experience_level_display',
            'age', 'primary_goal', 'weekly_training_days',
            'wellhub_enabled', 'gym_app_preference', 'gym_app_preference_display',
            'terms_accepted', 'gym_locations', 'created_at'
        ]
        read_only_fields = ['id', 'email', 'created_at', 'gym_locations']
