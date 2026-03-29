from django.contrib import admin
from .models import Workout, Exercise, WorkoutSession, ExerciseLog


class ExerciseInline(admin.TabularInline):
    model = Exercise
    extra = 1


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'workout_type', 'is_active', 'created_at']
    list_filter = ['workout_type', 'is_active']
    search_fields = ['name', 'user__email']
    inlines = [ExerciseInline]


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ['name', 'workout', 'muscle_group', 'sets', 'reps', 'weight_kg']
    list_filter = ['muscle_group']
    search_fields = ['name', 'workout__name']


class ExerciseLogInline(admin.TabularInline):
    model = ExerciseLog
    extra = 0


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ['workout', 'user', 'status', 'started_at', 'finished_at', 'total_duration_seconds']
    list_filter = ['status']
    search_fields = ['workout__name', 'user__email']
    inlines = [ExerciseLogInline]


@admin.register(ExerciseLog)
class ExerciseLogAdmin(admin.ModelAdmin):
    list_display = ['exercise', 'session', 'set_number', 'reps_done', 'weight_kg', 'is_completed']
    list_filter = ['is_completed']
