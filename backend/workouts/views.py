from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from django.utils import timezone
from datetime import timedelta

from .models import Workout, Exercise, WorkoutSession, ExerciseLog
from .serializers import (
    WorkoutSerializer, WorkoutCreateSerializer, ExerciseSerializer,
    WorkoutSessionSerializer, WorkoutSessionListSerializer, ExerciseLogSerializer,
)


class WorkoutListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user, is_active=True)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WorkoutCreateSerializer
        return WorkoutSerializer


class WorkoutDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return WorkoutCreateSerializer
        return WorkoutSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExerciseListCreateView(generics.ListCreateAPIView):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        workout_id = self.kwargs['workout_id']
        return Exercise.objects.filter(workout__id=workout_id, workout__user=self.request.user)

    def perform_create(self, serializer):
        workout_id = self.kwargs['workout_id']
        workout = get_object_or_404(Workout, id=workout_id, user=self.request.user)
        serializer.save(workout=workout)


class ExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Exercise.objects.filter(workout__user=self.request.user)


class WorkoutSessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = WorkoutSession.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WorkoutSessionSerializer
        return WorkoutSessionListSerializer

    def create(self, request, *args, **kwargs):
        active = WorkoutSession.objects.filter(
            user=request.user, status=WorkoutSession.Status.IN_PROGRESS
        ).first()
        if active:
            return Response(
                {'error': 'Ja existe um treino em andamento.', 'session_id': active.id},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)


class WorkoutSessionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkoutSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutSession.objects.filter(user=self.request.user)


class FinishSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        session = get_object_or_404(WorkoutSession, pk=pk, user=request.user)
        if session.status != WorkoutSession.Status.IN_PROGRESS:
            return Response({'error': 'Esta sessao nao esta em andamento.'}, status=status.HTTP_400_BAD_REQUEST)
        session.finish()
        serializer = WorkoutSessionSerializer(session, context={'request': request})
        return Response(serializer.data)


class CancelSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        session = get_object_or_404(WorkoutSession, pk=pk, user=request.user)
        if session.status != WorkoutSession.Status.IN_PROGRESS:
            return Response({'error': 'Esta sessao nao esta em andamento.'}, status=status.HTTP_400_BAD_REQUEST)
        session.status = WorkoutSession.Status.CANCELLED
        session.finished_at = timezone.now()
        session.save()
        return Response({'message': 'Sessao cancelada.'})


class ExerciseLogListCreateView(generics.ListCreateAPIView):
    serializer_class = ExerciseLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs['session_id']
        return ExerciseLog.objects.filter(session__id=session_id, session__user=self.request.user)

    def perform_create(self, serializer):
        session_id = self.kwargs['session_id']
        session = get_object_or_404(WorkoutSession, id=session_id, user=self.request.user)
        serializer.save(session=session)
        workout = session.workout
        total_sets = sum(e.sets for e in workout.exercises.all())
        completed_logs = ExerciseLog.objects.filter(session=session, is_completed=True).count()
        if total_sets > 0 and completed_logs >= total_sets:
            session.finish()


class ExerciseLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExerciseLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExerciseLog.objects.filter(session__user=self.request.user)


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        active_session = WorkoutSession.objects.filter(user=user, status=WorkoutSession.Status.IN_PROGRESS).first()

        total_sessions = WorkoutSession.objects.filter(user=user, status=WorkoutSession.Status.COMPLETED).count()
        sessions_this_week = WorkoutSession.objects.filter(user=user, status=WorkoutSession.Status.COMPLETED, started_at__gte=week_ago).count()
        sessions_this_month = WorkoutSession.objects.filter(user=user, status=WorkoutSession.Status.COMPLETED, started_at__gte=month_ago).count()

        avg_duration = WorkoutSession.objects.filter(
            user=user, status=WorkoutSession.Status.COMPLETED, total_duration_seconds__isnull=False
        ).aggregate(avg=Avg('total_duration_seconds'))['avg']

        recent_sessions = WorkoutSession.objects.filter(user=user).order_by('-started_at')[:5]
        recent_data = WorkoutSessionListSerializer(recent_sessions, many=True, context={'request': request}).data

        return Response({
            'active_session': WorkoutSessionSerializer(active_session, context={'request': request}).data if active_session else None,
            'stats': {
                'total_sessions': total_sessions,
                'sessions_this_week': sessions_this_week,
                'sessions_this_month': sessions_this_month,
                'avg_duration_seconds': round(avg_duration) if avg_duration else 0,
                'total_workouts': Workout.objects.filter(user=user, is_active=True).count(),
            },
            'recent_sessions': recent_data,
        })


class WorkoutHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, workout_id):
        sessions = WorkoutSession.objects.filter(
            user=request.user, workout__id=workout_id, status=WorkoutSession.Status.COMPLETED
        ).order_by('-started_at')[:10]

        data = []
        for session in sessions:
            logs = ExerciseLog.objects.filter(session=session, is_completed=True)
            session_data = {
                'session_id': session.id,
                'date': session.started_at.strftime('%d/%m/%Y'),
                'duration_seconds': session.total_duration_seconds,
                'completion_percentage': session.completion_percentage,
                'exercises': {}
            }
            for log in logs:
                name = log.exercise.name
                if name not in session_data['exercises']:
                    session_data['exercises'][name] = []
                session_data['exercises'][name].append({
                    'set': log.set_number,
                    'reps': log.reps_done,
                    'weight': float(log.weight_kg) if log.weight_kg else 0,
                })
            data.append(session_data)

        return Response(data)
