import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Dumbbell,
  Weight, RotateCcw, TrendingUp, Trash2
} from 'lucide-react';
import api from '../services/api';
import type { WorkoutSession, ExerciseLog, MuscleGroup } from '../types';
import { MUSCLE_GROUP_COLORS } from '../types';

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

function groupLogsByExercise(logs: ExerciseLog[]) {
  const grouped: Record<string, ExerciseLog[]> = {};
  for (const log of logs) {
    if (!grouped[log.exercise_name]) grouped[log.exercise_name] = [];
    grouped[log.exercise_name].push(log);
  }
  return grouped;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/sessions/${id}/`).then((r) => setSession(r.data)).finally(() => setLoading(false));
  }, [id]);

  const confirmDeleteSession = async () => {
    if (!session) return;

    try {
      setDeleting(true);
      await api.delete(`/sessions/${session.id}/`);
      navigate('/history');
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      alert('Não foi possível excluir este treino.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: '#ff8a1f', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!session) return null;

  const grouped = groupLogsByExercise(session.exercise_logs.filter((l) => l.is_completed));
  const totalVolume = session.exercise_logs.reduce((acc, l) => {
    if (l.is_completed && l.weight_kg) {
      return acc + (l.reps_done * Number(l.weight_kg));
    }
    return acc;
  }, 0);

  return (
    <div className="px-4 py-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-xl" style={{ background: '#1a1a2e', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">{session.workout_name}</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {new Date(session.started_at).toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-2 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
          title="Excluir treino"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-5">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
          style={{
            background: session.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: session.status === 'completed' ? '#10b981' : '#ef4444',
          }}>
          {session.status === 'completed'
            ? <><CheckCircle2 size={14} /> Concluído</>
            : <><XCircle size={14} /> Cancelado</>}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Duração', value: formatDuration(session.total_duration_seconds), icon: Clock, color: '#ff8a1f' },
          { label: 'Completado', value: `${session.completion_percentage}%`, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Séries Feitas', value: session.exercise_logs.filter((l) => l.is_completed).length, icon: RotateCcw, color: '#10b981' },
          { label: 'Volume Total', value: totalVolume > 0 ? `${totalVolume.toFixed(0)}kg` : '—', icon: Weight, color: '#ff5a00' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} style={{ color }} />
              <span className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</span>
            </div>
            <p className="text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Exercícios realizados */}
      <h2 className="font-bold text-white mb-3">Exercícios Realizados</h2>
      <div className="space-y-3">
        {Object.entries(grouped).map(([exName, logs]) => {
          const muscleGroup = logs[0]?.exercise_muscle_group as MuscleGroup | undefined;
          const color = muscleGroup ? (MUSCLE_GROUP_COLORS[muscleGroup] || '#ff8a1f') : '#ff8a1f';
          const totalExVolume = logs.reduce((acc, l) => acc + (l.reps_done * Number(l.weight_kg || 0)), 0);
          const maxWeight = Math.max(...logs.map((l) => Number(l.weight_kg || 0)));

          return (
            <div key={exName} className="rounded-2xl overflow-hidden"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="h-1" style={{ background: color }} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={16} style={{ color }} />
                    <span className="font-bold text-white">{exName}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${color}20`, color }}>
                    {logs[0]?.exercise_muscle_group}
                  </span>
                </div>

                {/* Tabela de séries */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-wider px-2"
                    style={{ color: '#94a3b8' }}>
                    <span>Série</span>
                    <span className="text-center">Reps</span>
                    <span className="text-right">Carga</span>
                  </div>
                  {logs.map((log) => (
                    <div key={log.id}
                      className="grid grid-cols-3 items-center px-3 py-2 rounded-xl"
                      style={{ background: '#0f0f1a' }}>
                      <span className="text-sm font-bold" style={{ color }}>#{log.set_number}</span>
                      <span className="text-sm font-bold text-white text-center">{log.reps_done} reps</span>
                      <span className="text-sm font-bold text-white text-right">
                        {log.weight_kg ? `${log.weight_kg}kg` : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Resumo do exercício */}
                <div className="flex items-center gap-4 mt-3 pt-3"
                  style={{ borderTop: '1px solid #2a2a4a' }}>
                  <div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Volume</p>
                    <p className="text-sm font-bold text-white">{totalExVolume.toFixed(0)}kg</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Carga Máx.</p>
                    <p className="text-sm font-bold text-white">{maxWeight > 0 ? `${maxWeight}kg` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Séries</p>
                    <p className="text-sm font-bold text-white">{logs.length}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-8">
          <Dumbbell size={40} className="mx-auto mb-2 opacity-20 text-white" />
          <p className="text-sm" style={{ color: '#94a3b8' }}>Nenhuma série registrada nesta sessão.</p>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h2 className="text-2xl font-black text-white text-center mb-2">Excluir treino?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#94a3b8' }}>
              Esta ação removerá <span className="text-white font-bold">{session.workout_name}</span> do histórico.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-bold transition-all active:scale-95"
                style={{
                  background: '#2a2a4a',
                  color: '#94a3b8',
                  border: '1px solid #3a3a5a'
                }}>
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-bold text-white active:scale-95 transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
