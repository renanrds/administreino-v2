from django.db import transaction
from django.db.models import Max as models_Max
from rest_framework import serializers

from .models import Workout, Exercise, WorkoutSession, ExerciseLog, MuscleGroup, WorkoutType


def parse_reps_input(raw_value):
    import re

    if isinstance(raw_value, int):
        return raw_value, raw_value, raw_value

    if isinstance(raw_value, str):
        text = raw_value.strip().replace(' ', '')
        if text.isdigit():
            value = int(text)
            return value, value, value

        range_match = re.match(r"^(\d+)-(\d+)$", text)
        if range_match:
            min_reps = int(range_match.group(1))
            max_reps = int(range_match.group(2))
            if min_reps > max_reps:
                min_reps, max_reps = max_reps, min_reps
            return max_reps, min_reps, max_reps

    raise serializers.ValidationError('Formato de reps invalido. Use numero (10) ou intervalo (8-10).')


class ExerciseSerializer(serializers.ModelSerializer):
    muscle_group_display = serializers.CharField(source='get_muscle_group_display', read_only=True)
    reps_display = serializers.SerializerMethodField()

    def get_reps_display(self, obj):
        if obj.min_reps and obj.max_reps and obj.min_reps != obj.max_reps:
            return f"{obj.min_reps}-{obj.max_reps}"
        return str(obj.reps)

    def validate(self, attrs):
        min_reps = attrs.get('min_reps', getattr(self.instance, 'min_reps', None) if self.instance else None)
        max_reps = attrs.get('max_reps', getattr(self.instance, 'max_reps', None) if self.instance else None)
        reps = attrs.get('reps', getattr(self.instance, 'reps', None) if self.instance else None)

        if min_reps is not None and max_reps is not None:
            if min_reps > max_reps:
                raise serializers.ValidationError({'min_reps': 'min_reps nao pode ser maior que max_reps.'})
            attrs['reps'] = max_reps
        elif reps is not None and 'min_reps' not in attrs and 'max_reps' not in attrs:
            attrs['min_reps'] = reps
            attrs['max_reps'] = reps

        return attrs

    class Meta:
        model = Exercise
        fields = [
            'id', 'name', 'muscle_group', 'muscle_group_display',
            'sets', 'reps', 'min_reps', 'max_reps', 'reps_display',
            'rest_seconds', 'weight_kg', 'notes', 'order', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_active']


class ExerciseNestedWriteSerializer(serializers.Serializer):
    """Writable nested exercise payload for create/update of a workout."""
    id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=200)
    muscle_group = serializers.ChoiceField(choices=MuscleGroup.choices)
    sets = serializers.IntegerField(min_value=1, default=3)
    reps = serializers.IntegerField(required=False, min_value=1)
    min_reps = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    max_reps = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    rest_seconds = serializers.IntegerField(min_value=0, default=60)
    weight_kg = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    order = serializers.IntegerField(required=False, min_value=0)

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
        else:
            raise serializers.ValidationError({'reps': 'Informe reps ou o intervalo min_reps/max_reps.'})

        return attrs


class WorkoutSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)
    workout_type_display = serializers.CharField(source='get_workout_type_display', read_only=True)
    total_exercises = serializers.SerializerMethodField()
    effective_sequence_group = serializers.CharField(read_only=True)

    def get_total_exercises(self, obj):
        annotated = getattr(obj, 'annotated_total_exercises', None)
        if annotated is not None:
            return annotated
        if hasattr(obj, '_prefetched_objects_cache') and 'exercises' in obj._prefetched_objects_cache:
            return len(obj.exercises.all())
        return obj.exercises.filter(is_active=True).count()

    class Meta:
        model = Workout
        fields = [
            'id', 'name', 'description', 'workout_type', 'workout_type_display',
            'is_active', 'sequence_group', 'sequence_order', 'effective_sequence_group',
            'exercises', 'total_exercises', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'effective_sequence_group']


class WorkoutWriteSerializer(serializers.ModelSerializer):
    exercises = ExerciseNestedWriteSerializer(many=True, required=False)

    class Meta:
        model = Workout
        fields = [
            'id', 'name', 'description', 'workout_type', 'is_active',
            'sequence_group', 'sequence_order', 'exercises',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if self.instance is None and not attrs.get('exercises'):
            raise serializers.ValidationError({'exercises': 'Informe ao menos um exercicio.'})
        if self.instance is not None and 'exercises' in attrs and not attrs.get('exercises'):
            raise serializers.ValidationError({'exercises': 'Informe ao menos um exercicio.'})
        return attrs

    def create(self, validated_data):
        exercises_data = validated_data.pop('exercises')
        user = self.context['request'].user
        with transaction.atomic():
            if not validated_data.get('sequence_order'):
                group = (validated_data.get('sequence_group') or '').strip()
                max_order = (
                    Workout.objects.filter(user=user, is_active=True, sequence_group=group)
                    .aggregate(m=models_Max('sequence_order'))
                    .get('m')
                    or 0
                )
                validated_data['sequence_order'] = max_order + 1

            workout = Workout.objects.create(user=user, **validated_data)
            Exercise.objects.bulk_create([
                Exercise(
                    workout=workout,
                    name=ex['name'],
                    muscle_group=ex['muscle_group'],
                    sets=ex.get('sets', 3),
                    reps=ex['reps'],
                    min_reps=ex.get('min_reps'),
                    max_reps=ex.get('max_reps'),
                    rest_seconds=ex.get('rest_seconds', 60),
                    weight_kg=ex.get('weight_kg'),
                    notes=ex.get('notes', ''),
                    order=ex.get('order', i),
                    is_active=True,
                )
                for i, ex in enumerate(exercises_data)
            ])
        return workout

    def update(self, instance, validated_data):
        exercises_data = validated_data.pop('exercises', None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if exercises_data is not None:
                kept_ids = []
                to_create = []

                for i, ex in enumerate(exercises_data):
                    order = ex.get('order', i)
                    ex_id = ex.get('id')
                    fields = {
                        'name': ex['name'],
                        'muscle_group': ex['muscle_group'],
                        'sets': ex.get('sets', 3),
                        'reps': ex['reps'],
                        'min_reps': ex.get('min_reps'),
                        'max_reps': ex.get('max_reps'),
                        'rest_seconds': ex.get('rest_seconds', 60),
                        'weight_kg': ex.get('weight_kg'),
                        'notes': ex.get('notes', ''),
                        'order': order,
                        'is_active': True,
                    }

                    if ex_id:
                        existing = Exercise.objects.filter(
                            id=ex_id, workout=instance
                        ).first()
                        if existing:
                            for key, val in fields.items():
                                setattr(existing, key, val)
                            existing.save()
                            kept_ids.append(existing.id)
                            continue

                    to_create.append(Exercise(workout=instance, **fields))

                if to_create:
                    created = Exercise.objects.bulk_create(to_create)
                    kept_ids.extend(e.id for e in created if e.id)

                # Soft-delete exercises removed from the payload.
                Exercise.objects.filter(workout=instance, is_active=True).exclude(
                    id__in=kept_ids
                ).update(is_active=False)

        return instance

    def to_representation(self, instance):
        # Reload with active exercises for a consistent response shape.
        from django.db.models import Prefetch, Count, Q

        workout = (
            Workout.objects.filter(pk=instance.pk)
            .prefetch_related(
                Prefetch('exercises', queryset=Exercise.objects.filter(is_active=True))
            )
            .annotate(
                annotated_total_exercises=Count('exercises', filter=Q(exercises__is_active=True))
            )
            .first()
        )
        return WorkoutSerializer(workout, context=self.context).data


class WorkoutCreateSerializer(serializers.ModelSerializer):
    """Legacy header-only create (kept for compatibility with exercise endpoints)."""

    class Meta:
        model = Workout
        fields = ['id', 'name', 'description', 'workout_type', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ImportExerciseSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    muscle_group = serializers.ChoiceField(choices=MuscleGroup.choices)
    sets = serializers.IntegerField(min_value=1, default=3)
    reps = serializers.JSONField(required=False, default=10)  # int or "8-10" string
    rest_seconds = serializers.IntegerField(min_value=0, default=60)
    weight_kg = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_reps(self, value):
        try:
            reps, min_reps, max_reps = parse_reps_input(value)
        except serializers.ValidationError:
            raise
        except Exception as exc:
            raise serializers.ValidationError(str(exc))
        return {'reps': reps, 'min_reps': min_reps, 'max_reps': max_reps}


class ImportDaySerializer(serializers.Serializer):
    day = serializers.CharField(required=False, allow_blank=True, default='Dia')
    focus = serializers.CharField(required=False, allow_blank=True, default='')
    sequence_order = serializers.IntegerField(required=False, min_value=1)
    exercises = ImportExerciseSerializer(many=True)

    def validate_exercises(self, value):
        if not value:
            raise serializers.ValidationError('Cada dia precisa ter ao menos 1 exercicio.')
        return value


class ProgramImportSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    workout_type = serializers.ChoiceField(choices=WorkoutType.choices)
    days = ImportDaySerializer(many=True)

    def validate_days(self, value):
        if not value:
            raise serializers.ValidationError('Campo "days" deve ser uma lista com ao menos 1 dia.')
        explicit = [d.get('sequence_order') for d in value if d.get('sequence_order') is not None]
        if explicit and len(explicit) != len(value):
            raise serializers.ValidationError(
                'Se usar sequence_order, informe em TODOS os dias.'
            )
        if explicit and len(set(explicit)) != len(explicit):
            raise serializers.ValidationError('sequence_order nao pode se repetir entre dias.')
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        base_name = validated_data['name']
        base_description = validated_data.get('description', '')
        workout_type = validated_data['workout_type']
        days = list(validated_data['days'])
        # Ordem explícita no JSON tem prioridade; senão preserva a ordem do array.
        if any(d.get('sequence_order') is not None for d in days):
            days.sort(key=lambda d: int(d['sequence_order']))
        created_workouts = []

        with transaction.atomic():
            for index, day_data in enumerate(days):
                day_label = str(day_data.get('day') or 'Dia').strip() or 'Dia'
                day_focus = str(day_data.get('focus') or '').strip()
                day_description = base_description
                if day_focus:
                    day_description = (
                        f"{base_description} | Foco: {day_focus}"
                        if base_description
                        else f"Foco: {day_focus}"
                    )

                sequence_order = day_data.get('sequence_order') or (index + 1)

                workout = Workout.objects.create(
                    user=user,
                    name=f"{base_name} - Dia {day_label}",
                    description=day_description,
                    workout_type=workout_type,
                    is_active=True,
                    sequence_group=base_name[:120],
                    sequence_order=sequence_order,
                )

                exercises = []
                for order, exercise_data in enumerate(day_data['exercises']):
                    reps_data = exercise_data['reps']
                    exercises.append(
                        Exercise(
                            workout=workout,
                            name=exercise_data['name'],
                            muscle_group=exercise_data['muscle_group'],
                            sets=exercise_data.get('sets', 3),
                            reps=reps_data['reps'],
                            min_reps=reps_data['min_reps'],
                            max_reps=reps_data['max_reps'],
                            rest_seconds=exercise_data.get('rest_seconds', 60),
                            weight_kg=exercise_data.get('weight_kg'),
                            notes=exercise_data.get('notes', ''),
                            order=order,
                            is_active=True,
                        )
                    )
                Exercise.objects.bulk_create(exercises)
                created_workouts.append(workout)

        return created_workouts


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
        session.save(update_fields=[
            'workout_name_snapshot', 'workout_type_snapshot',
            'planned_exercises_count', 'planned_sets_count',
        ])
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
