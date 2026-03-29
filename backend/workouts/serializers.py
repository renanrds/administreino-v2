from rest_framework import serializers
from .models import Workout, Exercise, WorkoutSession, ExerciseLog


class ExerciseSerializer(serializers.ModelSerializer):
    muscle_group_display = serializers.CharField(source='get_muscle_group_display', read_only=True)

    class Meta:
        model = Exercise
        fields = [
            'id', 'name', 'muscle_group', 'muscle_group_display',
            'sets', 'reps', 'rest_seconds', 'weight_kg', 'notes', 'order', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class WorkoutSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)
    workout_type_display = serializers.CharField(source='get_workout_type_display', read_only=True)
    total_exercises = serializers.IntegerField(read_only=True)

    class Meta:
        model = Workout
        fields = [
            'id', 'name', 'description', 'workout_type', 'workout_type_display',
            'is_active', 'exercises', 'total_exercises', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkoutCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workout
        fields = ['id', 'name', 'description', 'workout_type', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ExerciseLogSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)
    exercise_muscle_group = serializers.CharField(source='exercise.get_muscle_group_display', read_only=True)

    class Meta:
        model = ExerciseLog
        fields = [
            'id', 'exercise', 'exercise_name', 'exercise_muscle_group',
            'set_number', 'reps_done', 'weight_kg', 'rest_seconds_taken',
            'is_completed', 'notes', 'logged_at'
        ]
        read_only_fields = ['id', 'logged_at']


class WorkoutSessionSerializer(serializers.ModelSerializer):
    exercise_logs = ExerciseLogSerializer(many=True, read_only=True)
    workout_name = serializers.CharField(source='workout.name', read_only=True)
    workout_type = serializers.CharField(source='workout.workout_type', read_only=True)
    completion_percentage = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'workout', 'workout_name', 'workout_type',
            'status', 'status_display', 'started_at', 'finished_at',
            'total_duration_seconds', 'notes', 'exercise_logs',
            'completion_percentage', 'created_at'
        ]
        read_only_fields = ['id', 'started_at', 'created_at', 'completion_percentage']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class WorkoutSessionListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de sessões."""
    workout_name = serializers.CharField(source='workout.name', read_only=True)
    completion_percentage = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'workout', 'workout_name', 'status', 'status_display',
            'started_at', 'finished_at', 'total_duration_seconds',
            'completion_percentage', 'created_at'
        ]
