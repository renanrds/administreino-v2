import api from '../services/api';
import type { RecommendedWorkout, Workout } from '../types';

export const workoutKeys = {
  all: ['workouts'] as const,
  lists: () => [...workoutKeys.all, 'list'] as const,
  detail: (id: string | number) => [...workoutKeys.all, 'detail', String(id)] as const,
  recommended: () => [...workoutKeys.all, 'recommended'] as const,
};

export async function fetchWorkouts(): Promise<Workout[]> {
  const { data } = await api.get('/workouts/');
  return data;
}

export async function fetchWorkout(id: string | number): Promise<Workout> {
  const { data } = await api.get(`/workouts/${id}/`);
  return data;
}

export async function fetchRecommended(): Promise<RecommendedWorkout> {
  const { data } = await api.get('/workouts/recommended/');
  return data;
}

export type NestedExercisePayload = {
  id?: number;
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  min_reps: number;
  max_reps: number;
  rest_seconds: number;
  weight_kg: number | null;
  notes: string;
  order: number;
};

export type WorkoutWritePayload = {
  name: string;
  description: string;
  workout_type: string;
  exercises: NestedExercisePayload[];
  sequence_group?: string;
  sequence_order?: number;
};

export async function createWorkout(payload: WorkoutWritePayload): Promise<Workout> {
  const { data } = await api.post('/workouts/', payload);
  return data;
}

export async function updateWorkout(id: string | number, payload: WorkoutWritePayload): Promise<Workout> {
  const { data } = await api.put(`/workouts/${id}/`, payload);
  return data;
}

export async function deleteWorkout(id: number): Promise<void> {
  await api.delete(`/workouts/${id}/`);
}

export type ReorderItem = {
  id: number;
  sequence_order: number;
  sequence_group?: string;
};

export async function reorderWorkouts(items: ReorderItem[]): Promise<{ message: string; workouts: Workout[] }> {
  const { data } = await api.post('/workouts/reorder/', { items });
  return data;
}

export async function importWorkoutsFromJson(payload: unknown): Promise<{ message: string; workouts: Workout[] }> {
  const { data } = await api.post('/workouts/import-from-json/', payload);
  return data;
}

export function formatApiError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d: any) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d))).join(' ');
  }
  // Flatten DRF field errors
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'error' || key === 'detail') continue;
    if (typeof value === 'string') parts.push(`${key}: ${value}`);
    else if (Array.isArray(value)) parts.push(`${key}: ${value.join(' ')}`);
    else if (value && typeof value === 'object') parts.push(`${key}: ${JSON.stringify(value)}`);
  }
  return parts.length ? parts.join(' | ') : fallback;
}
