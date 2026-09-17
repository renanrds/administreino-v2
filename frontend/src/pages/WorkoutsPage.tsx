import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Dumbbell, Play, Pencil, Trash2, Loader2, Brain, Upload, Sparkles,
  ListOrdered, Check, X, GripVertical,
} from 'lucide-react';
import api from '../services/api';
import type { Workout, WorkoutType } from '../types';
import { WORKOUT_TYPE_LABELS } from '../types';
import {
  deleteWorkout,
  fetchRecommended,
  fetchWorkouts,
  formatApiError,
  reorderWorkouts,
  workoutKeys,
} from '../lib/workoutsApi';

const TYPE_COLORS: Record<string, string> = {
  strength: '#f59e0b',
  hypertrophy: '#ff8a1f',
  endurance: '#10b981',
  cardio: '#ef4444',
  hiit: '#f97316',
  flexibility: '#ff5a00',
  functional: '#06b6d4',
};

function sortBySequence(a: Workout, b: Workout) {
  const groupA = (a.effective_sequence_group || a.sequence_group || 'Geral').toLowerCase();
  const groupB = (b.effective_sequence_group || b.sequence_group || 'Geral').toLowerCase();
  if (groupA !== groupB) return groupA.localeCompare(groupB, 'pt-BR');
  const orderA = a.sequence_order && a.sequence_order > 0 ? a.sequence_order : 9999;
  const orderB = b.sequence_order && b.sequence_order > 0 ? b.sequence_order : 9999;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, 'pt-BR');
}

type WorkoutCardProps = {
  workout: Workout;
  index: number;
  orderingMode: boolean;
  isRecommended: boolean;
  orderNum: number | null;
  groupLabel: string;
  starting: number | null;
  onStart: (workout: Workout) => void;
  onEdit: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
};

function SortableWorkoutCard({
  workout,
  index,
  orderingMode,
  isRecommended,
  orderNum,
  groupLabel,
  starting,
  onStart,
  onEdit,
  onDelete,
}: WorkoutCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workout.id, disabled: !orderingMode });

  const color = TYPE_COLORS[workout.workout_type] || '#ff8a1f';
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 20 : undefined,
    boxShadow: isDragging ? '0 12px 40px rgba(0,0,0,0.45)' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: '#1a1a2e', border: `1px solid ${isDragging ? '#a78bfa' : '#2a2a4a'}` }}
      className="rounded-2xl overflow-hidden"
    >
      <div className="h-1" style={{ background: color }} />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {orderingMode && (
            <button
              type="button"
              className="mt-1 p-2 rounded-xl touch-none cursor-grab active:cursor-grabbing"
              style={{ background: '#0f0f1a', color: '#c4b5fd', border: '1px solid #2a2a4a' }}
              aria-label={`Arrastar ${workout.name}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={18} />
            </button>
          )}

          <div className="flex-1" onClick={() => !orderingMode && onEdit(workout)}>
            {isRecommended && (
              <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <Sparkles size={12} />
                Próximo treino recomendado
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {orderNum != null && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(167,139,250,0.2)', color: '#c4b5fd' }}>
                  #{orderNum}
                </span>
              )}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#0f0f1a', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
                {groupLabel}
              </span>
            </div>
            <h3 className="font-bold text-white text-lg leading-tight mt-1">{workout.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${color}20`, color }}>
                {WORKOUT_TYPE_LABELS[workout.workout_type]}
              </span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                {workout.total_exercises} exercício(s)
              </span>
            </div>
            {workout.description && !orderingMode && (
              <p className="text-xs mt-1 line-clamp-1" style={{ color: '#94a3b8' }}>
                {workout.description}
              </p>
            )}
            {orderingMode && (
              <p className="text-[11px] mt-2" style={{ color: '#64748b' }}>
                Posição {index + 1} · arraste pelo ícone ⋮⋮
              </p>
            )}
          </div>
        </div>

        {!orderingMode && workout.exercises.length > 0 && (
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

        {!orderingMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStart(workout)}
              disabled={starting === workout.id}
              className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
              {starting === workout.id
                ? <Loader2 size={16} className="animate-spin" />
                : <Play size={16} />}
              {starting === workout.id ? 'Iniciando...' : 'Iniciar'}
            </button>
            <button
              onClick={() => onEdit(workout)}
              className="p-2.5 rounded-xl transition-colors"
              style={{ background: '#0f0f1a', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(workout)}
              className="p-2.5 rounded-xl transition-colors"
              style={{ background: '#0f0f1a', color: '#ef4444', border: '1px solid #2a2a4a' }}>
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | WorkoutType>('all');
  const [orderingMode, setOrderingMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState<Workout[]>([]);
  const [draftGroup, setDraftGroup] = useState('Geral');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const workoutsQuery = useQuery({
    queryKey: workoutKeys.lists(),
    queryFn: fetchWorkouts,
  });

  const recommendationQuery = useQuery({
    queryKey: workoutKeys.recommended(),
    queryFn: fetchRecommended,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWorkout(id),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
    onError: (err: any) => {
      alert(formatApiError(err, 'Erro ao arquivar treino.'));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: reorderWorkouts,
    onSuccess: () => {
      setOrderingMode(false);
      setDraftOrder([]);
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
    onError: (err: any) => {
      alert(formatApiError(err, 'Erro ao salvar ordem.'));
    },
  });

  const workouts = workoutsQuery.data ?? [];
  const recommendation = recommendationQuery.data ?? { next_workout_id: null };
  const loading = workoutsQuery.isLoading || recommendationQuery.isLoading;

  useEffect(() => {
    if (!orderingMode) return;
    const sorted = [...workouts].sort(sortBySequence);
    setDraftOrder(sorted);
    const groups = Array.from(
      new Set(sorted.map((w) => w.effective_sequence_group || w.sequence_group || 'Geral')),
    );
    setDraftGroup(groups[0] || 'Geral');
  }, [orderingMode, workouts]);

  const handleStart = async (workout: Workout) => {
    setStarting(workout.id);
    try {
      const { data } = await api.post('/sessions/', { workout: workout.id });
      navigate(`/session/${data.id}`);
    } catch (err: any) {
      if (err.response?.data?.session_id) {
        navigate(`/session/${err.response.data.session_id}`);
      } else {
        alert(formatApiError(err, 'Erro ao iniciar treino.'));
      }
    } finally {
      setStarting(null);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftOrder((items) => {
      const oldIndex = items.findIndex((w) => w.id === active.id);
      const newIndex = items.findIndex((w) => w.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const saveOrder = () => {
    const groupName = draftGroup.trim() || 'Geral';
    reorderMutation.mutate(
      draftOrder.map((w, idx) => ({
        id: w.id,
        sequence_order: idx + 1,
        sequence_group: groupName,
      })),
    );
  };

  const logicData = useMemo(() => {
    const nextWorkoutId = recommendation.next_workout_id ?? null;
    const recommendedWorkout = workouts.find((workout) => workout.id === nextWorkoutId) || null;
    const referenceType = recommendedWorkout?.workout_type || null;

    const sortedByLogic = [...workouts].sort((a, b) => {
      if (nextWorkoutId && a.id === nextWorkoutId) return -1;
      if (nextWorkoutId && b.id === nextWorkoutId) return 1;
      return sortBySequence(a, b);
    });

    return { nextWorkoutId, referenceType, sortedByLogic, recommendedWorkout };
  }, [workouts, recommendation]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(workouts.map((w) => w.workout_type))) as WorkoutType[];
  }, [workouts]);

  const displayedWorkouts = useMemo(() => {
    if (orderingMode) return draftOrder;
    const source = logicData.sortedByLogic;
    if (quickFilter === 'all') return source;
    if (quickFilter === 'today') {
      if (!logicData.referenceType) return source;
      return source.filter((w) => w.workout_type === logicData.referenceType);
    }
    return source.filter((w) => w.workout_type === quickFilter);
  }, [logicData, quickFilter, orderingMode, draftOrder]);

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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Meus Treinos</h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{workouts.length} treino(s) cadastrado(s)</p>
          {logicData.nextWorkoutId && !orderingMode && (
            <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: '#10b981' }}>
              <Sparkles size={12} />
              {recommendation.reason || 'Próximo treino da sequência no topo'}
              {recommendation.active_program_name
                ? ` · ciclo “${recommendation.active_program_name}”`
                : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!orderingMode && (
            <>
              <button
                onClick={() => setOrderingMode(true)}
                disabled={workouts.length < 2}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform disabled:opacity-40"
                style={{ background: '#334155' }}
                title="Definir ordem da sequência">
                <ListOrdered size={18} />
              </button>
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
            </>
          )}
        </div>
      </div>

      {orderingMode && (
        <div className="mb-4 rounded-2xl p-4 space-y-3"
          style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)' }}>
          <p className="text-sm font-bold text-white">Ordenar sequência de treinos</p>
          <p className="text-xs" style={{ color: '#c4b5fd' }}>
            Arraste pelo ícone ⋮⋮ para definir a ordem. O “próximo recomendado” avança nessa sequência após cada treino concluído.
          </p>
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Nome do ciclo
            </label>
            <input
              value={draftGroup}
              onChange={(e) => setDraftGroup(e.target.value)}
              placeholder="Ex: Hipertrofia ABC"
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setOrderingMode(false); setDraftOrder([]); }}
              disabled={reorderMutation.isPending}
              className="flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: '#334155', color: '#cbd5e1' }}
            >
              <X size={16} /> Cancelar
            </button>
            <button
              onClick={saveOrder}
              disabled={reorderMutation.isPending || draftOrder.length === 0}
              className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}
            >
              {reorderMutation.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : <Check size={16} />}
              Salvar ordem
            </button>
          </div>
        </div>
      )}

      {!orderingMode && (
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
      )}

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
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={orderingMode ? handleDragEnd : undefined}
        >
          <SortableContext
            items={displayedWorkouts.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
            disabled={!orderingMode}
          >
            <div className="space-y-3">
              {displayedWorkouts.map((workout, index) => {
                const orderNum = orderingMode
                  ? index + 1
                  : (workout.sequence_order && workout.sequence_order > 0 ? workout.sequence_order : null);
                const groupLabel = orderingMode
                  ? draftGroup
                  : (workout.effective_sequence_group || workout.sequence_group || 'Geral');

                return (
                  <SortableWorkoutCard
                    key={workout.id}
                    workout={workout}
                    index={index}
                    orderingMode={orderingMode}
                    isRecommended={!orderingMode && logicData.nextWorkoutId === workout.id}
                    orderNum={orderNum}
                    groupLabel={groupLabel}
                    starting={starting}
                    onStart={handleStart}
                    onEdit={(w) => navigate(`/workouts/${w.id}/edit`)}
                    onDelete={setDeleteTarget}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: 'rgba(2,6,23,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl p-5"
            style={{ background: '#111827', border: '1px solid #334155' }}>
            <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#f59e0b' }}>
              Confirmar arquivamento
            </p>
            <h3 className="text-lg font-black text-white leading-tight">
              Arquivar treino "{deleteTarget.name}"?
            </h3>
            <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
              O treino sai da lista ativa. O histórico de sessões permanece.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className="py-2.5 rounded-xl font-bold transition-all"
                style={{ background: '#334155', color: '#cbd5e1' }}>
                Manter treino
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="py-2.5 rounded-xl font-bold text-white transition-all disabled:cursor-not-allowed"
                style={{ background: deleteMutation.isPending ? '#7f1d1d' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {deleteMutation.isPending ? 'Arquivando...' : 'Sim, arquivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
