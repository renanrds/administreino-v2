from django.db import models
from django.contrib.auth import get_user_model
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Treino"
        verbose_name_plural = "Treinos"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.name}"

    @property
    def total_exercises(self):
        return self.exercises.count()


class Exercise(models.Model):
    """Exercicio dentro de um treino."""
    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="exercises")
    name = models.CharField(max_length=200)
    muscle_group = models.CharField(max_length=20, choices=MuscleGroup.choices)
    sets = models.PositiveIntegerField(default=3)
    reps = models.PositiveIntegerField(default=12)
    rest_seconds = models.PositiveIntegerField(default=60)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Exercicio"
        verbose_name_plural = "Exercicios"
        ordering = ["order", "created_at"]

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
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    total_duration_seconds = models.PositiveIntegerField(null=True, blank=True)
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
        total = self.exercise_logs.count()
        if total == 0:
            return 0
        completed = self.exercise_logs.filter(is_completed=True).count()
        return round((completed / total) * 100)

    def finish(self):
        self.status = self.Status.COMPLETED
        self.finished_at = timezone.now()
        if self.started_at:
            delta = self.finished_at - self.started_at
            self.total_duration_seconds = int(delta.total_seconds())
        self.save()


class ExerciseLog(models.Model):
    """Log de execucao de um exercicio em uma sessao."""
    session = models.ForeignKey(WorkoutSession, on_delete=models.CASCADE, related_name="exercise_logs")
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="logs")
    set_number = models.PositiveIntegerField()
    reps_done = models.PositiveIntegerField(default=0)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    rest_seconds_taken = models.PositiveIntegerField(null=True, blank=True)
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
