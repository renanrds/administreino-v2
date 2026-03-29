import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, GripVertical,
  Dumbbell, Timer, RotateCcw, Weight
} from 'lucide-react';
import api from '../services/api';
import type { Exercise, Workout, MuscleGroup, WorkoutType } from '../types';
import { MUSCLE_GROUP_LABELS, WORKOUT_TYPE_LABELS } from '../types';

const MUSCLE_GROUPS = Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroup, string][];
const WORKOUT_TYPES = Object.entries(WORKOUT_TYPE_LABELS) as [WorkoutType, string][];

interface ExerciseForm {
  id?: number;
  name: string;
  muscle_group: MuscleGroup;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_kg: string;
  notes: string;
  order: number;
}

const defaultExercise = (): ExerciseForm => ({
  name: '', muscle_group: 'chest', sets: 3, reps: 12,
  rest_seconds: 60, weight_kg: '', notes: '', order: 0
});

export default function WorkoutFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('hypertrophy');
  const [exercises, setExercises] = useState<ExerciseForm[]>([defaultExercise()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/workouts/${id}/`).then((r) => {
        const w: Workout = r.data;
        setName(w.name);
        setDescription(w.description || '');
        setWorkoutType(w.workout_type);
        setExercises(w.exercises.map((e) => ({
          id: e.id, name: e.name, muscle_group: e.muscle_group,
          sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds,
          weight_kg: e.weight_kg?.toString() || '', notes: e.notes || '',
          order: e.order
        })));
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const addExercise = () => {
    setExercises([...exercises, { ...defaultExercise(), order: exercises.length }]);
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, field: keyof ExerciseForm, value: any) => {
    setExercises(exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Informe o nome do treino.');
    if (exercises.some((e) => !e.name.trim())) return alert('Todos os exercícios precisam de nome.');

    setSaving(true);
    try {
      let workoutId = id;

      if (isEdit) {
        await api.patch(`/workouts/${id}/`, { name, description, workout_type: workoutType });
      } else {
        const { data } = await api.post('/workouts/', { name, description, workout_type: workoutType });
        workoutId = data.id;
      }

      // Salvar exercícios
      for (let i = 0; i < exercises.length; i++) {
        const ex = { ...exercises[i], order: i, weight_kg: exercises[i].weight_kg || null };
        if (ex.id) {
          await api.patch(`/exercises/${ex.id}/`, ex);
        } else {
          await api.post(`/workouts/${workoutId}/exercises/`, ex);
        }
      }

      navigate('/workouts');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar treino.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl" style={{ background: '#1a1a2e', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">{isEdit ? 'Editar Treino' : 'Novo Treino'}</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Dados do treino */}
      <div className="rounded-2xl p-4 mb-4 space-y-4"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <h2 className="font-bold text-white text-sm uppercase tracking-wider">Informações do Treino</h2>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Nome *
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Treino A - Peito e Tríceps"
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
            style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {WORKOUT_TYPES.map(([value, label]) => (
              <button key={value} onClick={() => setWorkoutType(value)}
                className="py-2 px-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: workoutType === value ? 'rgba(99,102,241,0.2)' : '#0f0f1a',
                  border: `1px solid ${workoutType === value ? '#6366f1' : '#2a2a4a'}`,
                  color: workoutType === value ? '#6366f1' : '#94a3b8',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Descrição
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Observações sobre o treino..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none resize-none"
            style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
        </div>
      </div>

      {/* Exercícios */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">Exercícios ({exercises.length})</h2>
          <button onClick={addExercise}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', color: '#6366f1' }}>
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map((ex, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              {/* Header do exercício */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ background: '#0f0f1a', borderBottom: '1px solid #2a2a4a' }}>
                <div className="flex items-center gap-2">
                  <GripVertical size={16} style={{ color: '#94a3b8' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>
                    Exercício {idx + 1}
                  </span>
                </div>
                {exercises.length > 1 && (
                  <button onClick={() => removeExercise(idx)} style={{ color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                    Nome do Exercício *
                  </label>
                  <div className="relative">
                    <Dumbbell size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6366f1' }} />
                    <input value={ex.name} onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                      placeholder="Ex: Supino Reto"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white placeholder-slate-500 outline-none text-sm"
                      style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
                  </div>
                </div>

                {/* Grupo muscular */}
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                    Grupo Muscular
                  </label>
                  <select value={ex.muscle_group}
                    onChange={(e) => updateExercise(idx, 'muscle_group', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-white outline-none text-sm"
                    style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}>
                    {MUSCLE_GROUPS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Séries, Reps, Descanso */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { field: 'sets', label: 'Séries', icon: <RotateCcw size={12} />, min: 1 },
                    { field: 'reps', label: 'Reps', icon: <Dumbbell size={12} />, min: 1 },
                    { field: 'rest_seconds', label: 'Descanso(s)', icon: <Timer size={12} />, min: 0 },
                  ].map(({ field, label, icon, min }) => (
                    <div key={field}>
                      <label className="flex items-center gap-1 text-xs font-semibold mb-1 uppercase tracking-wider"
                        style={{ color: '#94a3b8' }}>
                        {icon} {label}
                      </label>
                      <input
                        type="number"
                        min={min}
                        value={ex[field as keyof ExerciseForm] as number}
                        onChange={(e) => updateExercise(idx, field as keyof ExerciseForm, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 rounded-xl text-white outline-none text-sm text-center font-bold"
                        style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
                    </div>
                  ))}
                </div>

                {/* Carga */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold mb-1 uppercase tracking-wider"
                    style={{ color: '#94a3b8' }}>
                    <Weight size={12} /> Carga (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={ex.weight_kg}
                    onChange={(e) => updateExercise(idx, 'weight_kg', e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-4 py-2.5 rounded-xl text-white placeholder-slate-500 outline-none text-sm"
                    style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão salvar final */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform mb-4"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
        {saving ? 'Salvando...' : 'Salvar Treino'}
      </button>
    </div>
  );
}
