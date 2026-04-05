import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Dumbbell, Play, Pencil, Trash2, Loader2, Brain, Upload, Sparkles } from 'lucide-react';
import api from '../services/api';
import type { RecommendedWorkout, Workout, WorkoutType } from '../types';
import { WORKOUT_TYPE_LABELS } from '../types';

const TYPE_COLORS: Record<string, string> = {
  strength: '#f59e0b',
  hypertrophy: '#ff8a1f',
  endurance: '#10b981',
  cardio: '#ef4444',
  hiit: '#f97316',
  flexibility: '#ff5a00',
  functional: '#06b6d4',
};

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendedWorkout>({ next_workout_id: null });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | WorkoutType>('all');

  const fetchWorkouts = () => {
    setLoading(true);
    Promise.all([
      api.get('/workouts/'),
      api.get('/workouts/recommended/')
    ])
      .then(([workoutsRes, recommendationRes]) => {
        setWorkouts(workoutsRes.data);
        setRecommendation(recommendationRes.data);
      })
      .finally(() => setLoading(false));
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/workouts/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchWorkouts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover treino.');
    } finally {
      setDeleting(false);
    }
  };

  const logicData = useMemo(() => {
    const nextWorkoutId = recommendation.next_workout_id ?? null;
    const recommendedWorkout = workouts.find((workout) => workout.id === nextWorkoutId) || null;
    const referenceType = recommendedWorkout?.workout_type || null;

    const sortedByLogic = [...workouts].sort((a, b) => {
      if (nextWorkoutId && a.id === nextWorkoutId) return -1;
      if (nextWorkoutId && b.id === nextWorkoutId) return 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    return { nextWorkoutId, referenceType, sortedByLogic };
  }, [workouts, recommendation]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(workouts.map((w) => w.workout_type))) as WorkoutType[];
  }, [workouts]);

  const displayedWorkouts = useMemo(() => {
    const source = logicData.sortedByLogic;
    if (quickFilter === 'all') return source;
    if (quickFilter === 'today') {
      if (!logicData.referenceType) return source;
      return source.filter((w) => w.workout_type === logicData.referenceType);
    }
    return source.filter((w) => w.workout_type === quickFilter);
  }, [logicData, quickFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: '#ff8a1f', borderTopColor: 'transparent' }} />
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
          {logicData.nextWorkoutId && (
            <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: '#10b981' }}>
              <Sparkles size={12} />
              {recommendation.reason || 'Treino recomendado do dia no topo (sequencia logica)'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/workouts/gerar-prompt')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform"
            style={{ background: '#ff5a00' }}
            title="Gerar prompt para IA">
            <Brain size={18} />
          </button>
            <button
              onClick={() => navigate('/workouts/importar')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform"
              style={{ background: '#10b981' }}
              title="Importar treino">
              <Upload size={18} />
            </button>
          <button
            onClick={() => navigate('/workouts/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
            <Plus size={18} />
            Novo
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setQuickFilter('all')}
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
          style={{
            background: quickFilter === 'all' ? 'rgba(255,138,31,0.2)' : '#1a1a2e',
            border: `1px solid ${quickFilter === 'all' ? '#ff8a1f' : '#2a2a4a'}`,
            color: quickFilter === 'all' ? '#fdba74' : '#94a3b8',
          }}
        >
          Todos
        </button>

        {logicData.referenceType && (
          <button
            onClick={() => setQuickFilter('today')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            style={{
              background: quickFilter === 'today' ? 'rgba(16,185,129,0.2)' : '#1a1a2e',
              border: `1px solid ${quickFilter === 'today' ? '#10b981' : '#2a2a4a'}`,
              color: quickFilter === 'today' ? '#10b981' : '#94a3b8',
            }}
          >
            Sequência do dia
          </button>
        )}

        {availableTypes.map((type) => (
          <button
            key={type}
            onClick={() => setQuickFilter(type)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            style={{
              background: quickFilter === type ? `${TYPE_COLORS[type]}20` : '#1a1a2e',
              border: `1px solid ${quickFilter === type ? TYPE_COLORS[type] : '#2a2a4a'}`,
              color: quickFilter === type ? TYPE_COLORS[type] : '#94a3b8',
            }}
          >
            {WORKOUT_TYPE_LABELS[type]}
          </button>
        ))}
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
            style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
            Criar Treino
          </button>
        </div>
      ) : displayedWorkouts.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
          <Dumbbell size={42} className="mx-auto mb-3 opacity-20 text-white" />
          <p className="font-bold text-white">Nenhum treino nesse filtro</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            Tente outro filtro rápido para ver mais treinos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedWorkouts.map((workout) => {
            const color = TYPE_COLORS[workout.workout_type] || '#ff8a1f';
            const isRecommended = logicData.nextWorkoutId === workout.id;
            return (
              <div key={workout.id} className="rounded-2xl overflow-hidden"
                style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                {/* Barra colorida */}
                <div className="h-1" style={{ background: color }} />

                <div className="p-4">
                  {isRecommended && (
                    <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      <Sparkles size={12} />
                      Próximo treino recomendado
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1" onClick={() => navigate(`/workouts/${workout.id}/edit`)}>
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
                      style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
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
                      onClick={() => setDeleteTarget(workout)}
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: 'rgba(2,6,23,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl p-5"
            style={{ background: '#111827', border: '1px solid #334155' }}>
            <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#f59e0b' }}>
              Confirmar remoção
            </p>
            <h3 className="text-lg font-black text-white leading-tight">
              Remover treino "{deleteTarget.name}"?
            </h3>
            <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
              Essa ação exclui o treino e seus exercícios cadastrados. Não é possível desfazer.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="py-2.5 rounded-xl font-bold transition-all"
                style={{ background: '#334155', color: '#cbd5e1' }}>
                Manter treino
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="py-2.5 rounded-xl font-bold text-white transition-all disabled:cursor-not-allowed"
                style={{ background: deleting ? '#7f1d1d' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {deleting ? 'Removendo...' : 'Sim, remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
