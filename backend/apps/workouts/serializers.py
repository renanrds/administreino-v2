from rest_framework import serializers
from .models import Workout, Exercise, WorkoutSession, ExerciseLog


class ExerciseSerializer(serializers.ModelSerializer):
    muscle_group_display = serializers.CharField(source='get_muscle_group_display', read_only=True)
    reps_display = serializers.SerializerMethodField()

    def get_reps_display(self, obj):
        if obj.min_reps and obj.max_reps and obj.min_reps != obj.max_reps:
            return f"{obj.min_reps}-{obj.max_reps}"
        return str(obj.reps)

    def validate(self, attrs):
        min_reps = attrs.get('min_reps')
        max_reps = attrs.get('max_reps')
        reps = attrs.get('reps')

        if min_reps is not None and max_reps is not None:
            if min_reps > max_reps:
                raise serializers.ValidationError({'min_reps': 'min_reps nao pode ser maior que max_reps.'})
            attrs['reps'] = max_reps
        elif reps is not None:
            attrs['min_reps'] = reps
            attrs['max_reps'] = reps

        return attrs

    class Meta:
        model = Exercise
        fields = [
            'id', 'name', 'muscle_group', 'muscle_group_display',
            'sets', 'reps', 'min_reps', 'max_reps', 'reps_display',
            'rest_seconds', 'weight_kg', 'notes', 'order', 'created_at'
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
    exercise_name = serializers.SerializerMethodField()
    exercise_muscle_group = serializers.SerializerMethodField()

    def get_exercise_name(self, obj):
        if obj.exercise_name_snapshot:
            return obj.exercise_name_snapshot
        return obj.exercise.name

    def get_exercise_muscle_group(self, obj):
        if obj.muscle_group_snapshot:
            return obj.get_muscle_group_snapshot_display()
        return obj.exercise.get_muscle_group_display()

    class Meta:
        model = ExerciseLog
        fields = [
            'id', 'exercise', 'exercise_name', 'exercise_muscle_group',
            'set_number', 'planned_reps', 'planned_min_reps', 'planned_max_reps',
            'planned_weight_kg', 'planned_rest_seconds',
            'reps_done', 'weight_kg', 'rest_seconds_taken', 'execution_seconds',
            'rpe', 'volume_kg', 'is_completed', 'notes', 'logged_at'
        ]
        read_only_fields = ['id', 'logged_at']


class WorkoutSessionSerializer(serializers.ModelSerializer):
    exercise_logs = ExerciseLogSerializer(many=True, read_only=True)
    workout_name = serializers.SerializerMethodField()
    workout_type = serializers.SerializerMethodField()
    completion_percentage = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    def get_workout_name(self, obj):
        return obj.workout_name_snapshot or obj.workout.name

    def get_workout_type(self, obj):
        return obj.workout_type_snapshot or obj.workout.workout_type

    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'workout', 'workout_name', 'workout_type',
            'status', 'status_display', 'started_at', 'finished_at',
            'total_duration_seconds', 'planned_exercises_count', 'planned_sets_count',
            'completed_sets_count', 'total_volume_kg', 'average_rpe',
            'notes', 'exercise_logs',
            'completion_percentage', 'created_at'
        ]
        read_only_fields = ['id', 'started_at', 'created_at', 'completion_percentage']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        session = super().create(validated_data)
        session.capture_workout_snapshot()
        session.save(update_fields=['workout_name_snapshot', 'workout_type_snapshot', 'planned_exercises_count', 'planned_sets_count'])
        return session


class WorkoutSessionListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de sessões."""
    workout_name = serializers.SerializerMethodField()
    workout_type = serializers.SerializerMethodField()
    completion_percentage = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    def get_workout_name(self, obj):
        return obj.workout_name_snapshot or obj.workout.name

    def get_workout_type(self, obj):
        return obj.workout_type_snapshot or obj.workout.workout_type

    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'workout', 'workout_name', 'workout_type', 'status', 'status_display',
            'started_at', 'finished_at', 'total_duration_seconds',
            'planned_sets_count', 'completed_sets_count', 'total_volume_kg',
            'completion_percentage', 'created_at'
        ]
