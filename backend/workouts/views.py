from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Avg, Count, Prefetch, Q
from django.utils import timezone
from datetime import timedelta
import re
import urllib.request
import urllib.parse

from .models import Workout, Exercise, WorkoutSession, ExerciseLog
from .serializers import (
    WorkoutSerializer, WorkoutWriteSerializer, ExerciseSerializer,
    WorkoutSessionSerializer, WorkoutSessionListSerializer, ExerciseLogSerializer,
    ProgramImportSerializer,
)


PROGRAM_DAY_SUFFIX_PATTERN = re.compile(r"\s*-\s*DIA\s+([A-Z0-9]+)\s*$", re.IGNORECASE)
PROGRAM_TREINO_SUFFIX_PATTERN = re.compile(r"\s*-\s*TREINO\s+([A-Z0-9]+)\s*$", re.IGNORECASE)


def parse_sequence_order(workout_name):
    """Fallback legado para nomes sem sequence_order preenchido."""
    upper = workout_name.upper()
    for pattern in [
        re.compile(r"DIA\s*([A-Z])"),
        re.compile(r"TREINO\s*([A-Z])"),
    ]:
        match = pattern.search(upper)
        if match:
            code = ord(match.group(1))
            if 65 <= code <= 90:
                return code - 64

    if re.search(r"\bPUSH\b", upper):
        return 1
    if re.search(r"\bPULL\b", upper):
        return 2
    if re.search(r"\bLEGS\b", upper):
        return 3

    single_letter = re.search(r"\b([A-F])\b", upper)
    if single_letter:
        return ord(single_letter.group(1)) - 64

    numeric = re.search(r"\b(\d{1,2})\b", upper)
    if numeric:
        return int(numeric.group(1))

    return 999


def parse_program_base(workout_name):
    for pattern in [PROGRAM_DAY_SUFFIX_PATTERN, PROGRAM_TREINO_SUFFIX_PATTERN]:
        match = pattern.search(workout_name)
        if match:
            return workout_name[:match.start()].strip().lower()
    return workout_name.strip().lower()


def workout_sequence_group_key(workout):
    group = (workout.sequence_group or '').strip()
    if group:
        return group.lower()
    return parse_program_base(workout.name) or 'geral'


def workout_sequence_sort_key(workout):
    order = workout.sequence_order if workout.sequence_order and workout.sequence_order > 0 else parse_sequence_order(workout.name)
    return (order, workout.name.lower(), workout.id)


def resolve_next_workout(workouts, last_workout=None):
    """Retorna (next_workout, active_group_display, reason).

    Prioriza sequence_group + sequence_order explícitos; nomes legados
    (Dia A/B, Push/Pull) só entram como fallback via workout_sequence_sort_key.
    """
    if not workouts:
        return None, None, None

    if last_workout is None:
        first = min(workouts, key=workout_sequence_sort_key)
        return (
            first,
            first.effective_sequence_group,
            'Sem historico concluido. Primeiro treino da sequencia sugerido.',
        )

    last_group = workout_sequence_group_key(last_workout)
    same_program = [w for w in workouts if workout_sequence_group_key(w) == last_group]

    if not same_program:
        same_program = [
            w for w in workouts
            if w.workout_type == getattr(last_workout, 'workout_type', None)
        ]

    if not same_program:
        same_program = list(workouts)

    same_program.sort(key=workout_sequence_sort_key)
    last_index = next((i for i, w in enumerate(same_program) if w.id == last_workout.id), -1)
    if last_index >= 0:
        next_workout = same_program[(last_index + 1) % len(same_program)]
        reason = 'Sequencia do ciclo: avancou para o proximo treino.'
    else:
        next_workout = same_program[0]
        reason = 'Ultimo treino fora do ciclo ativo; reiniciando a sequencia.'

    return next_workout, next_workout.effective_sequence_group, reason


def _workout_queryset_for_user(user):
    return (
        Workout.objects.filter(user=user)
        .prefetch_related(
            Prefetch('exercises', queryset=Exercise.objects.filter(is_active=True))
        )
        .annotate(annotated_total_exercises=Count('exercises', filter=Q(exercises__is_active=True)))
    )


class WorkoutListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            _workout_queryset_for_user(self.request.user)
            .filter(is_active=True)
            .order_by('sequence_group', 'sequence_order', 'name', 'id')
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WorkoutWriteSerializer
        return WorkoutSerializer


class WorkoutDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return _workout_queryset_for_user(self.request.user)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return WorkoutWriteSerializer
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
        return Exercise.objects.filter(
            workout__id=workout_id,
            workout__user=self.request.user,
            is_active=True,
        )

    def perform_create(self, serializer):
        workout_id = self.kwargs['workout_id']
        workout = get_object_or_404(Workout, id=workout_id, user=self.request.user)
        serializer.save(workout=workout)


class ExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Exercise.objects.filter(workout__user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


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


class WorkoutSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkoutSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutSession.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        session = self.get_object()
        if session.status == WorkoutSession.Status.IN_PROGRESS:
            return Response({'error': 'Nao e possivel excluir uma sessao em andamento.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


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
        total_sets = session.planned_sets_count or sum(
            e.sets for e in session.workout.exercises.filter(is_active=True)
        )
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


class YouTubeSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Parâmetro q é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        search_query = urllib.parse.quote_plus(query + ' como fazer exercício')
        url = f'https://www.youtube.com/results?search_query={search_query}'

        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR,pt;q=0.9'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
            match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
            if match:
                return Response({'video_id': match.group(1)})
            return Response({'video_id': None})
        except Exception:
            return Response({'video_id': None})


class RecommendedWorkoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        workouts = list(
            Workout.objects.filter(user=request.user, is_active=True)
            .order_by('sequence_group', 'sequence_order', 'name', 'id')
        )
        if not workouts:
            return Response({'next_workout_id': None})

        latest_completed = WorkoutSession.objects.filter(
            user=request.user,
            status=WorkoutSession.Status.COMPLETED,
        ).select_related('workout').order_by('-finished_at', '-started_at').first()

        last_workout = latest_completed.workout if latest_completed else None
        next_workout, active_group, reason = resolve_next_workout(workouts, last_workout)

        # Sequence payload: ciclo ativo primeiro, depois demais, sempre por sequence_order.
        active_key = workout_sequence_group_key(next_workout) if next_workout else None

        def sequence_payload_key(w):
            group_key = workout_sequence_group_key(w)
            in_active = 0 if active_key and group_key == active_key else 1
            return (in_active, *workout_sequence_sort_key(w))

        return Response({
            'next_workout_id': next_workout.id if next_workout else None,
            'active_program_name': active_group,
            'last_workout_name': (
                (latest_completed.workout_name_snapshot or last_workout.name)
                if latest_completed and last_workout else None
            ),
            'reason': reason,
            'sequence': [
                {
                    'id': w.id,
                    'name': w.name,
                    'sequence_group': w.effective_sequence_group,
                    'sequence_order': w.sequence_order,
                    'is_next': next_workout is not None and w.id == next_workout.id,
                }
                for w in sorted(workouts, key=sequence_payload_key)
            ],
        })


class WorkoutReorderView(APIView):
    """Atualiza sequence_group / sequence_order de varios treinos de uma vez."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get('items')
        if not isinstance(items, list) or not items:
            return Response(
                {'error': 'Envie items: [{id, sequence_order, sequence_group?}].'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = []
        for item in items:
            if not isinstance(item, dict) or 'id' not in item or 'sequence_order' not in item:
                return Response(
                    {'error': 'Cada item precisa de id e sequence_order.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                ids.append(int(item['id']))
                int(item['sequence_order'])
            except (TypeError, ValueError):
                return Response(
                    {'error': 'id e sequence_order devem ser inteiros.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        owned = {
            w.id: w
            for w in Workout.objects.filter(user=request.user, id__in=ids)
        }
        missing = [i for i in ids if i not in owned]
        if missing:
            return Response(
                {'error': f'Treinos nao encontrados: {missing}'},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            for item in items:
                workout = owned[int(item['id'])]
                workout.sequence_order = max(0, int(item['sequence_order']))
                if 'sequence_group' in item and item['sequence_group'] is not None:
                    workout.sequence_group = str(item['sequence_group'])[:120]
                workout.save(update_fields=['sequence_group', 'sequence_order', 'updated_at'])

        workouts = list(_workout_queryset_for_user(request.user).filter(is_active=True))
        return Response({
            'message': f'{len(items)} treino(s) reordenado(s).',
            'workouts': WorkoutSerializer(workouts, many=True, context={'request': request}).data,
        })


class ImportWorkoutFromJSONView(APIView):
    """Importa um programa gerado por IA (JSON) como N treinos, um por dia.

    Payload:
    {
      "name": "Nome do Programa",
      "description": "Opcional",
      "workout_type": "hypertrophy",
      "days": [
        {
          "day": "A",
          "focus": "Peito",
          "exercises": [
            {
              "name": "Supino",
              "muscle_group": "chest",
              "sets": 3,
              "reps": "8-10",
              "rest_seconds": 90,
              "weight_kg": 40,
              "notes": "Opcional"
            }
          ]
        }
      ]
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ProgramImportSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        created_workouts = serializer.save()

        workout_ids = [w.id for w in created_workouts]
        workouts = list(
            _workout_queryset_for_user(request.user).filter(id__in=workout_ids)
        )
        # Preserve creation order (queryset may reorder by -created_at).
        by_id = {w.id: w for w in workouts}
        ordered = [by_id[wid] for wid in workout_ids if wid in by_id]

        return Response(
            {
                'message': f'{len(ordered)} treino(s) importado(s) com sucesso, um por dia.',
                'workouts': WorkoutSerializer(ordered, many=True, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
