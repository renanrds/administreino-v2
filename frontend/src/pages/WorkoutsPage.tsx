import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Dumbbell, ChevronRight, Play, Pencil, Trash2, Loader2 } from 'lucide-react';
import api from '../services/api';
import type { Workout } from '../types';
import { WORKOUT_TYPE_LABELS } from '../types';

const TYPE_COLORS: Record<string, string> = {
  strength: '#f59e0b',
  hypertrophy: '#6366f1',
  endurance: '#10b981',
  cardio: '#ef4444',
  hiit: '#f97316',
  flexibility: '#8b5cf6',
  functional: '#06b6d4',
};

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);

  const fetchWorkouts = () => {
    setLoading(true);
    api.get('/workouts/').then((r) => setWorkouts(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchWorkouts(); }, []);

  const handleStart = async (workout: Workout) => {
    setStarting(workout.id);
    try {
      const { data } = await api.post('/sessions/', { workout: workout.id });
      navigate(`/session/${data.id}`);
    } catch (err: any) {
      if (err.response?.data?.session_id) {
        navigate(`/session/${err.response.data.session_id}`);
      } else {
        alert(err.response?.data?.error || 'Erro ao iniciar treino.');
      }
    } finally {
      setStarting(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este treino?')) return;
    await api.delete(`/workouts/${id}/`);
    fetchWorkouts();
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Meus Treinos</h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{workouts.length} treino(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => navigate('/workouts/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Plus size={18} />
          Novo
        </button>
      </div>

      {/* Lista */}
      {workouts.length === 0 ? (
        <div className="text-center py-16">
          <Dumbbell size={56} className="mx-auto mb-4 opacity-20 text-white" />
          <p className="text-lg font-bold text-white">Nenhum treino criado</p>
          <p className="text-sm mt-1 mb-6" style={{ color: '#94a3b8' }}>
            Crie seu primeiro treino para começar
          </p>
          <button
            onClick={() => navigate('/workouts/new')}
            className="px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            Criar Treino
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const color = TYPE_COLORS[workout.workout_type] || '#6366f1';
            return (
              <div key={workout.id} className="rounded-2xl overflow-hidden"
                style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                {/* Barra colorida */}
                <div className="h-1" style={{ background: color }} />

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1" onClick={() => navigate(`/workouts/${workout.id}`)}>
                      <h3 className="font-bold text-white text-lg leading-tight">{workout.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}20`, color }}>
                          {WORKOUT_TYPE_LABELS[workout.workout_type]}
                        </span>
                        <span className="text-xs" style={{ color: '#94a3b8' }}>
                          {workout.total_exercises} exercício(s)
                        </span>
                      </div>
                      {workout.description && (
                        <p className="text-xs mt-1 line-clamp-1" style={{ color: '#94a3b8' }}>
                          {workout.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Exercícios preview */}
                  {workout.exercises.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {workout.exercises.slice(0, 4).map((ex) => (
                        <span key={ex.id} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: '#0f0f1a', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
                          {ex.name}
                        </span>
                      ))}
                      {workout.exercises.length > 4 && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: '#0f0f1a', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
                          +{workout.exercises.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStart(workout)}
                      disabled={starting === workout.id}
                      className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      {starting === workout.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Play size={16} />}
                      {starting === workout.id ? 'Iniciando...' : 'Iniciar'}
                    </button>
                    <button
                      onClick={() => navigate(`/workouts/${workout.id}/edit`)}
                      className="p-2.5 rounded-xl transition-colors"
                      style={{ background: '#0f0f1a', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(workout.id)}
                      className="p-2.5 rounded-xl transition-colors"
                      style={{ background: '#0f0f1a', color: '#ef4444', border: '1px solid #2a2a4a' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
