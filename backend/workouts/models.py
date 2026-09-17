from django.db import models
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

User = get_user_model()


class MuscleGroup(models.TextChoices):
    CHEST = "chest", "Peito"
    BACK = "back", "Costas"
    SHOULDERS = "shoulders", "Ombros"
    BICEPS = "biceps", "Biceps"
    TRICEPS = "triceps", "Triceps"
    LEGS = "legs", "Pernas"
    GLUTES = "glutes", "Gluteos"
    ABS = "abs", "Abdomen"
    CALVES = "calves", "Panturrilha"
    FOREARMS = "forearms", "Antebraco"
    FULL_BODY = "full_body", "Corpo Inteiro"
    CARDIO = "cardio", "Cardio"


class WorkoutType(models.TextChoices):
    STRENGTH = "strength", "Forca"
    HYPERTROPHY = "hypertrophy", "Hipertrofia"
    ENDURANCE = "endurance", "Resistencia"
    CARDIO = "cardio", "Cardio"
    HIIT = "hiit", "HIIT"
    FLEXIBILITY = "flexibility", "Flexibilidade"
    FUNCTIONAL = "functional", "Funcional"


class Workout(models.Model):
    """Treino - conjunto de exercicios."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="workouts")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    workout_type = models.CharField(max_length=20, choices=WorkoutType.choices, default=WorkoutType.HYPERTROPHY)
    is_active = models.BooleanField(default=True)
    # Ciclo de treinos: mesmo sequence_group + sequence_order define o "próximo" recomendado.
    sequence_group = models.CharField(
        max_length=120,
        blank=True,
        default="",
        help_text="Nome do ciclo/programa (ex.: Hipertrofia ABC). Vazio = grupo Geral.",
    )
    sequence_order = models.PositiveIntegerField(
        default=0,
        help_text="Ordem no ciclo (1, 2, 3…). 0 = sem ordem explícita (cai no fim).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Treino"
        verbose_name_plural = "Treinos"
        ordering = ["sequence_order", "name", "-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"], name="workout_user_active_idx"),
            models.Index(
                fields=["user", "is_active", "sequence_group", "sequence_order"],
                name="workout_user_seq_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.name}"

    @property
    def effective_sequence_group(self):
        return (self.sequence_group or "").strip() or "Geral"


class Exercise(models.Model):
    """Exercicio dentro de um treino."""
    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="exercises")
    name = models.CharField(max_length=200)
    muscle_group = models.CharField(max_length=20, choices=MuscleGroup.choices)
    sets = models.PositiveIntegerField(default=3)
    reps = models.PositiveIntegerField(default=12)
    min_reps = models.PositiveIntegerField(null=True, blank=True)
    max_reps = models.PositiveIntegerField(null=True, blank=True)
    rest_seconds = models.PositiveIntegerField(default=60)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Exercicio"
        verbose_name_plural = "Exercicios"
        ordering = ["order", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(min_reps__isnull=True) | Q(max_reps__isnull=True) | Q(min_reps__lte=models.F("max_reps")),
                name="exercise_min_reps_lte_max_reps",
            ),
        ]

    def __str__(self):
        return f"{self.workout.name} - {self.name}"


class WorkoutSession(models.Model):
    """Sessao de treino - uma execucao de um treino."""

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "Em Andamento"
        COMPLETED = "completed", "Concluido"
        CANCELLED = "cancelled", "Cancelado"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="sessions")
    workout_name_snapshot = models.CharField(max_length=200, blank=True, default="")
    workout_type_snapshot = models.CharField(max_length=20, choices=WorkoutType.choices, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    total_duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    planned_exercises_count = models.PositiveIntegerField(default=0)
    planned_sets_count = models.PositiveIntegerField(default=0)
    completed_sets_count = models.PositiveIntegerField(default=0)
    total_volume_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_rpe = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sessao de Treino"
        verbose_name_plural = "Sessoes de Treino"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.user.username} - {self.workout.name} - {self.started_at.strftime('%d/%m/%Y')}"

    @property
    def completion_percentage(self):
        total = self.planned_sets_count or self.exercise_logs.count()
        if total == 0:
            return 0
        completed = self.exercise_logs.filter(is_completed=True).count()
        return round((completed / total) * 100)

    def capture_workout_snapshot(self):
        if not self.workout_id:
            return
        self.workout_name_snapshot = self.workout.name
        self.workout_type_snapshot = self.workout.workout_type
        exercises = list(self.workout.exercises.filter(is_active=True))
        self.planned_exercises_count = len(exercises)
        self.planned_sets_count = sum(ex.sets for ex in exercises)

    def update_aggregates(self):
        logs = self.exercise_logs.all()
        self.completed_sets_count = logs.filter(is_completed=True).count()
        self.total_volume_kg = sum((log.volume_kg or 0) for log in logs)

        rpe_values = [float(log.rpe) for log in logs if log.rpe is not None]
        if rpe_values:
            self.average_rpe = round(sum(rpe_values) / len(rpe_values), 2)
        else:
            self.average_rpe = None

    def finish(self):
        self.status = self.Status.COMPLETED
        self.finished_at = timezone.now()
        if self.started_at:
            delta = self.finished_at - self.started_at
            self.total_duration_seconds = int(delta.total_seconds())
        self.update_aggregates()
        self.save()


class ExerciseLog(models.Model):
    """Log de execucao de um exercicio em uma sessao."""
    session = models.ForeignKey(WorkoutSession, on_delete=models.CASCADE, related_name="exercise_logs")
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="logs")
    exercise_name_snapshot = models.CharField(max_length=200, blank=True, default="")
    muscle_group_snapshot = models.CharField(max_length=20, choices=MuscleGroup.choices, blank=True, default="")
    set_number = models.PositiveIntegerField()
    planned_reps = models.PositiveIntegerField(null=True, blank=True)
    planned_min_reps = models.PositiveIntegerField(null=True, blank=True)
    planned_max_reps = models.PositiveIntegerField(null=True, blank=True)
    planned_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    planned_rest_seconds = models.PositiveIntegerField(null=True, blank=True)
    reps_done = models.PositiveIntegerField(default=0)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    rest_seconds_taken = models.PositiveIntegerField(null=True, blank=True)
    execution_seconds = models.PositiveIntegerField(null=True, blank=True)
    rpe = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    volume_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")
    logged_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Log de Exercicio"
        verbose_name_plural = "Logs de Exercicios"
        ordering = ["set_number", "logged_at"]
        unique_together = ["session", "exercise", "set_number"]

    def __str__(self):
        return f"{self.session} - {self.exercise.name} - Serie {self.set_number}"

    def save(self, *args, **kwargs):
        # Keep a historical snapshot so comparisons remain valid after exercise edits.
        if self.exercise_id:
            if not self.exercise_name_snapshot:
                self.exercise_name_snapshot = self.exercise.name
            if not self.muscle_group_snapshot:
                self.muscle_group_snapshot = self.exercise.muscle_group
            if self.planned_reps is None:
                self.planned_reps = self.exercise.reps
            if self.planned_min_reps is None:
                self.planned_min_reps = self.exercise.min_reps
            if self.planned_max_reps is None:
                self.planned_max_reps = self.exercise.max_reps
            if self.planned_rest_seconds is None:
                self.planned_rest_seconds = self.exercise.rest_seconds
            if self.planned_weight_kg is None:
                self.planned_weight_kg = self.exercise.weight_kg

        if self.weight_kg is not None and self.reps_done is not None:
            self.volume_kg = self.weight_kg * self.reps_done
        else:
            self.volume_kg = 0

        super().save(*args, **kwargs)

        # Keep session totals ready for dashboard and historical comparisons.
        if self.session_id:
            self.session.update_aggregates()
            self.session.save(update_fields=['completed_sets_count', 'total_volume_kg', 'average_rpe'])
