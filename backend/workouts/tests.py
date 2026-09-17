from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .models import Workout, Exercise, WorkoutSession, ExerciseLog, MuscleGroup, WorkoutType

User = get_user_model()


class WorkoutApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='athlete',
            email='athlete@example.com',
            password='testpass123',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_nested_create_is_atomic(self):
        payload = {
            'name': 'Treino A',
            'description': 'Teste',
            'workout_type': WorkoutType.HYPERTROPHY,
            'exercises': [
                {
                    'name': 'Supino',
                    'muscle_group': MuscleGroup.CHEST,
                    'sets': 3,
                    'reps': 10,
                    'rest_seconds': 90,
                    'order': 0,
                },
                {
                    'name': 'Crucifixo',
                    'muscle_group': MuscleGroup.CHEST,
                    'sets': 3,
                    'reps': 10,
                    'min_reps': 8,
                    'max_reps': 10,
                    'rest_seconds': 60,
                    'notes': 'Amplitude completa',
                    'order': 1,
                },
            ],
        }
        response = self.client.post('/api/workouts/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Workout.objects.filter(user=self.user).count(), 1)
        workout = Workout.objects.get(user=self.user)
        self.assertEqual(workout.exercises.filter(is_active=True).count(), 2)
        self.assertEqual(response.data['total_exercises'], 2)
        self.assertEqual(response.data['exercises'][1]['notes'], 'Amplitude completa')

    def test_nested_create_fails_without_exercises(self):
        payload = {
            'name': 'Vazio',
            'workout_type': WorkoutType.STRENGTH,
            'exercises': [],
        }
        response = self.client.post('/api/workouts/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Workout.objects.filter(user=self.user).count(), 0)

    def test_nested_update_soft_deletes_removed_exercise_and_keeps_logs(self):
        workout = Workout.objects.create(
            user=self.user,
            name='Treino B',
            workout_type=WorkoutType.HYPERTROPHY,
        )
        keep = Exercise.objects.create(
            workout=workout,
            name='Agachamento',
            muscle_group=MuscleGroup.LEGS,
            sets=4,
            reps=8,
            min_reps=8,
            max_reps=8,
            order=0,
        )
        remove = Exercise.objects.create(
            workout=workout,
            name='Leg Press',
            muscle_group=MuscleGroup.LEGS,
            sets=3,
            reps=12,
            min_reps=12,
            max_reps=12,
            order=1,
        )
        session = WorkoutSession.objects.create(user=self.user, workout=workout)
        log = ExerciseLog.objects.create(
            session=session,
            exercise=remove,
            set_number=1,
            reps_done=10,
            is_completed=True,
        )

        payload = {
            'name': 'Treino B',
            'description': '',
            'workout_type': WorkoutType.HYPERTROPHY,
            'exercises': [
                {
                    'id': keep.id,
                    'name': 'Agachamento',
                    'muscle_group': MuscleGroup.LEGS,
                    'sets': 4,
                    'reps': 8,
                    'rest_seconds': 120,
                    'order': 0,
                },
            ],
        }
        response = self.client.put(f'/api/workouts/{workout.id}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        remove.refresh_from_db()
        self.assertFalse(remove.is_active)
        self.assertEqual(workout.exercises.filter(is_active=True).count(), 1)
        self.assertTrue(ExerciseLog.objects.filter(id=log.id).exists())
        self.assertEqual(len(response.data['exercises']), 1)

    def test_list_total_exercises_matches_active_only(self):
        workout = Workout.objects.create(
            user=self.user,
            name='Lista',
            workout_type=WorkoutType.CARDIO,
        )
        Exercise.objects.create(
            workout=workout, name='Esteira', muscle_group=MuscleGroup.CARDIO,
            sets=1, reps=1, min_reps=1, max_reps=1, order=0, is_active=True,
        )
        Exercise.objects.create(
            workout=workout, name='Bike', muscle_group=MuscleGroup.CARDIO,
            sets=1, reps=1, min_reps=1, max_reps=1, order=1, is_active=False,
        )

        response = self.client.get('/api/workouts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['total_exercises'], 1)
        self.assertEqual(len(response.data[0]['exercises']), 1)

    def test_import_rolls_back_when_day_two_is_invalid(self):
        payload = {
            'name': 'Programa ABC',
            'workout_type': WorkoutType.HYPERTROPHY,
            'days': [
                {
                    'day': 'A',
                    'focus': 'Peito',
                    'exercises': [
                        {
                            'name': 'Supino',
                            'muscle_group': MuscleGroup.CHEST,
                            'sets': 3,
                            'reps': 10,
                        }
                    ],
                },
                {
                    'day': 'B',
                    'focus': 'Costas',
                    'exercises': [],  # invalid — empty day
                },
            ],
        }
        response = self.client.post('/api/workouts/import-from-json/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Workout.objects.filter(user=self.user).count(), 0)

    def test_import_creates_workouts_with_bulk_exercises(self):
        payload = {
            'name': 'Programa ABC',
            'description': 'Teste import',
            'workout_type': WorkoutType.HYPERTROPHY,
            'days': [
                {
                    'day': 'A',
                    'focus': 'Peito',
                    'exercises': [
                        {
                            'name': 'Supino',
                            'muscle_group': MuscleGroup.CHEST,
                            'sets': 3,
                            'reps': '8-10',
                            'notes': 'Controlado',
                        }
                    ],
                },
                {
                    'day': 'B',
                    'focus': 'Costas',
                    'exercises': [
                        {
                            'name': 'Puxada',
                            'muscle_group': MuscleGroup.BACK,
                            'sets': 4,
                            'reps': 10,
                        }
                    ],
                },
            ],
        }
        response = self.client.post('/api/workouts/import-from-json/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Workout.objects.filter(user=self.user, is_active=True).count(), 2)
        day_a = Workout.objects.get(name='Programa ABC - Dia A')
        self.assertEqual(day_a.exercises.filter(is_active=True).count(), 1)
        self.assertEqual(day_a.exercises.first().notes, 'Controlado')
        self.assertEqual(day_a.exercises.first().min_reps, 8)
        self.assertEqual(day_a.exercises.first().max_reps, 10)
        self.assertEqual(day_a.sequence_group, 'Programa ABC')
        self.assertEqual(day_a.sequence_order, 1)
        day_b = Workout.objects.get(name='Programa ABC - Dia B')
        self.assertEqual(day_b.sequence_order, 2)

    def test_import_respects_explicit_sequence_order(self):
        payload = {
            'name': 'Ciclo Ordem',
            'workout_type': WorkoutType.HYPERTROPHY,
            'days': [
                {
                    'day': 'B',
                    'sequence_order': 2,
                    'focus': 'Costas',
                    'exercises': [
                        {
                            'name': 'Puxada',
                            'muscle_group': MuscleGroup.BACK,
                            'sets': 3,
                            'reps': 10,
                        }
                    ],
                },
                {
                    'day': 'A',
                    'sequence_order': 1,
                    'focus': 'Peito',
                    'exercises': [
                        {
                            'name': 'Supino',
                            'muscle_group': MuscleGroup.CHEST,
                            'sets': 3,
                            'reps': 10,
                        }
                    ],
                },
            ],
        }
        response = self.client.post('/api/workouts/import-from-json/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        day_a = Workout.objects.get(name='Ciclo Ordem - Dia A')
        day_b = Workout.objects.get(name='Ciclo Ordem - Dia B')
        self.assertEqual(day_a.sequence_order, 1)
        self.assertEqual(day_b.sequence_order, 2)

        recommended = self.client.get('/api/workouts/recommended/')
        self.assertEqual(recommended.data['next_workout_id'], day_a.id)

    def _make_seq_workout(self, name, order, group='Ciclo ABC'):
        return Workout.objects.create(
            user=self.user,
            name=name,
            workout_type=WorkoutType.HYPERTROPHY,
            sequence_group=group,
            sequence_order=order,
        )

    def test_recommended_starts_at_first_in_sequence(self):
        w1 = self._make_seq_workout('A', 1)
        self._make_seq_workout('B', 2)
        self._make_seq_workout('C', 3)

        response = self.client.get('/api/workouts/recommended/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['next_workout_id'], w1.id)
        self.assertEqual(response.data['active_program_name'], 'Ciclo ABC')
        self.assertTrue(any(item['is_next'] for item in response.data['sequence']))

    def test_recommended_advances_and_wraps_after_completed_session(self):
        w1 = self._make_seq_workout('A', 1)
        w2 = self._make_seq_workout('B', 2)
        w3 = self._make_seq_workout('C', 3)

        session = WorkoutSession.objects.create(user=self.user, workout=w1)
        session.finish()

        response = self.client.get('/api/workouts/recommended/')
        self.assertEqual(response.data['next_workout_id'], w2.id)

        session2 = WorkoutSession.objects.create(user=self.user, workout=w3)
        session2.finish()
        # Last completed is C → next wraps to A
        response = self.client.get('/api/workouts/recommended/')
        self.assertEqual(response.data['next_workout_id'], w1.id)

    def test_reorder_updates_orders_and_recommendation(self):
        w1 = self._make_seq_workout('A', 1)
        w2 = self._make_seq_workout('B', 2)
        w3 = self._make_seq_workout('C', 3)

        response = self.client.post(
            '/api/workouts/reorder/',
            {
                'items': [
                    {'id': w3.id, 'sequence_order': 1, 'sequence_group': 'Novo Ciclo'},
                    {'id': w1.id, 'sequence_order': 2, 'sequence_group': 'Novo Ciclo'},
                    {'id': w2.id, 'sequence_order': 3, 'sequence_group': 'Novo Ciclo'},
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        w3.refresh_from_db()
        w1.refresh_from_db()
        self.assertEqual(w3.sequence_order, 1)
        self.assertEqual(w3.sequence_group, 'Novo Ciclo')
        self.assertEqual(w1.sequence_order, 2)

        recommended = self.client.get('/api/workouts/recommended/')
        self.assertEqual(recommended.data['next_workout_id'], w3.id)
        self.assertEqual(recommended.data['active_program_name'], 'Novo Ciclo')

    def test_create_auto_assigns_next_sequence_order(self):
        self._make_seq_workout('A', 1, group='Auto')
        payload = {
            'name': 'B',
            'workout_type': WorkoutType.HYPERTROPHY,
            'sequence_group': 'Auto',
            'exercises': [
                {
                    'name': 'Remada',
                    'muscle_group': MuscleGroup.BACK,
                    'sets': 3,
                    'reps': 10,
                    'order': 0,
                }
            ],
        }
        response = self.client.post('/api/workouts/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sequence_order'], 2)
        self.assertEqual(response.data['sequence_group'], 'Auto')
