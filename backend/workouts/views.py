from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import Workout, Exercise, WorkoutSession, ExerciseLog
from .models import MuscleGroup, WorkoutType
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
        session.update_aggregates()
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
        total_sets = session.planned_sets_count or sum(e.sets for e in session.workout.exercises.all())
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
                name = log.exercise_name_snapshot or log.exercise.name
                if name not in session_data['exercises']:
                    session_data['exercises'][name] = []
                session_data['exercises'][name].append({
                    'set': log.set_number,
                    'reps': log.reps_done,
                    'weight': float(log.weight_kg) if log.weight_kg else 0,
                    'planned_reps': log.planned_reps,
                    'planned_weight': float(log.planned_weight_kg) if log.planned_weight_kg else 0,
                    'rpe': float(log.rpe) if log.rpe else None,
                })
            data.append(session_data)

        return Response(data)


class ImportWorkoutFromJSONView(APIView):
    """Endpoint para importar um treino gerado por IA em formato JSON."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Recebe um JSON do treino e cria o Workout com seus exercícios.
        Formato esperado:
        {
            "name": "Nome do Treino",
            "description": "Descrição breve",
            "workout_type": "strength|hypertrophy|etc",
            "days": [
                {
                    "day": "A",
                    "focus": "Focos musculares",
                    "exercises": [
                        {
                            "name": "Nome do exercício",
                            "muscle_group": "chest|back|etc",
                            "sets": 3,
                            "reps": 10,
                            "rest_seconds": 60,
                            "weight_kg": 50 (opcional),
                            "notes": "Observações" (opcional)
                        }
                    ]
                }
            ]
        }
        """
        try:
            data = request.data
            
            # Validação básica
            if not data.get('name'):
                return Response(
                    {'error': 'Campo "name" é obrigatório'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not data.get('workout_type'):
                return Response(
                    {'error': 'Campo "workout_type" é obrigatório'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar workout_type
            valid_types = [choice[0] for choice in WorkoutType.choices]
            if data['workout_type'] not in valid_types:
                return Response(
                    {'error': f'workout_type deve ser um de: {", ".join(valid_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            base_name = data['name']
            base_description = data.get('description', '')
            days = data.get('days', [])
            if not isinstance(days, list) or len(days) == 0:
                return Response(
                    {'error': 'Campo "days" deve ser uma lista com ao menos 1 dia'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            valid_groups = [choice[0] for choice in MuscleGroup.choices]
            created_workouts = []

            with transaction.atomic():
                for day_data in days:
                    day_label = str(day_data.get('day', '')).strip() or 'Dia'
                    day_focus = str(day_data.get('focus', '')).strip()
                    exercises_list = day_data.get('exercises', [])

                    if not isinstance(exercises_list, list) or len(exercises_list) == 0:
                        return Response(
                            {'error': f'O dia "{day_label}" precisa ter ao menos 1 exercício'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    day_description = base_description
                    if day_focus:
                        day_description = f"{base_description} | Foco: {day_focus}" if base_description else f"Foco: {day_focus}"

                    workout = Workout.objects.create(
                        user=request.user,
                        name=f"{base_name} - Dia {day_label}",
                        description=day_description,
                        workout_type=data['workout_type'],
                        is_active=True
                    )

                    for exercise_order, exercise_data in enumerate(exercises_list):
                        # Validar campos obrigatórios do exercício
                        if not exercise_data.get('name'):
                            return Response(
                                {'error': f'Todos os exercícios do dia "{day_label}" devem ter um "name"'},
                                status=status.HTTP_400_BAD_REQUEST
                            )

                        muscle_group = exercise_data.get('muscle_group')
                        if not muscle_group or muscle_group not in valid_groups:
                            return Response(
                                {'error': f'muscle_group deve ser um de: {", ".join(valid_groups)}'},
                                status=status.HTTP_400_BAD_REQUEST
                            )

                        Exercise.objects.create(
                            workout=workout,
                            name=exercise_data['name'],
                            muscle_group=muscle_group,
                            sets=exercise_data.get('sets', 3),
                            reps=exercise_data.get('reps', 10),
                            rest_seconds=exercise_data.get('rest_seconds', 60),
                            weight_kg=exercise_data.get('weight_kg'),
                            notes=exercise_data.get('notes', ''),
                            order=exercise_order
                        )

                    created_workouts.append(workout)
            
            # Serializar e retornar os treinos criados por dia
            serializer = WorkoutSerializer(created_workouts, many=True, context={'request': request})
            return Response(
                {
                    'message': f'{len(created_workouts)} treino(s) importado(s) com sucesso, um por dia.',
                    'workouts': serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            return Response(
                {'error': f'Erro ao importar treino: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
