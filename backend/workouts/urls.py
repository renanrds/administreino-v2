from django.urls import path
from .views import (
    WorkoutListCreateView, WorkoutDetailView,
    ExerciseListCreateView, ExerciseDetailView,
    WorkoutSessionListCreateView, WorkoutSessionDetailView,
    FinishSessionView, CancelSessionView,
    ExerciseLogListCreateView, ExerciseLogDetailView,
    DashboardView, WorkoutHistoryView,
    ImportWorkoutFromJSONView, RecommendedWorkoutView, WorkoutReorderView,
    YouTubeSearchView,
)

urlpatterns = [
    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('workouts/recommended/', RecommendedWorkoutView.as_view(), name='workout-recommended'),
    path('workouts/reorder/', WorkoutReorderView.as_view(), name='workout-reorder'),

    # Workouts
    path('workouts/', WorkoutListCreateView.as_view(), name='workout-list'),
    path('workouts/<int:pk>/', WorkoutDetailView.as_view(), name='workout-detail'),
    path('workouts/import-from-json/', ImportWorkoutFromJSONView.as_view(), name='import-from-json'),

    # Exercises (nested under workout)
    path('workouts/<int:workout_id>/exercises/', ExerciseListCreateView.as_view(), name='exercise-list'),
    path('exercises/<int:pk>/', ExerciseDetailView.as_view(), name='exercise-detail'),

    # Sessions
    path('sessions/', WorkoutSessionListCreateView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', WorkoutSessionDetailView.as_view(), name='session-detail'),
    path('sessions/<int:pk>/finish/', FinishSessionView.as_view(), name='session-finish'),
    path('sessions/<int:pk>/cancel/', CancelSessionView.as_view(), name='session-cancel'),

    # Exercise Logs (nested under session)
    path('sessions/<int:session_id>/logs/', ExerciseLogListCreateView.as_view(), name='log-list'),
    path('logs/<int:pk>/', ExerciseLogDetailView.as_view(), name='log-detail'),

    # History
    path('workouts/<int:workout_id>/history/', WorkoutHistoryView.as_view(), name='workout-history'),

    # YouTube search
    path('youtube-search/', YouTubeSearchView.as_view(), name='youtube-search'),
]
