import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, CheckCircle2, XCircle,
  TrendingUp, ChevronRight, Trash2
} from 'lucide-react';
import api from '../../../services/api';
import type { WorkoutSession } from '../../../types';

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<WorkoutSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    api.get(`/sessions/${params}`)
      .then((r) => setSessions(r.data))
      .finally(() => setLoading(false));
  }, [filter]);

  const completed = sessions.filter((s) => s.status === 'completed');
  const totalTime = completed.reduce((acc, s) => acc + (s.total_duration_seconds || 0), 0);
  const avgCompletion = completed.length > 0
    ? Math.round(completed.reduce((acc, s) => acc + s.completion_percentage, 0) / completed.length)
    : 0;

  const openDeleteModal = (session: WorkoutSession) => {
    setSessionToDelete(session);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/sessions/${sessionToDelete.id}/`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      alert('Não foi possível excluir este treino.');
    } finally {
      setDeleting(false);
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

  return (
    <div className="px-4 py-5 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white">Histórico</h1>
        <p className="text-sm" style={{ color: '#94a3b8' }}>{sessions.length} sessão(ões) registrada(s)</p>
      </div>

      {/* Resumo */}
      {completed.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Concluídos', value: completed.length, color: '#10b981' },
            { label: 'Tempo Total', value: formatDuration(totalTime), color: '#ff8a1f' },
            { label: 'Taxa Média', value: `${avgCompletion}%`, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-3 text-center"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <p className="text-lg font-black" style={{ color }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'completed', label: 'Concluídos' },
          { key: 'cancelled', label: 'Cancelados' },
        ].map(({ key, label }) => (
          <button key={key}
            onClick={() => setFilter(key as typeof filter)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: filter === key ? 'rgba(255,138,31,0.2)' : '#1a1a2e',
              border: `1px solid ${filter === key ? '#ff8a1f' : '#2a2a4a'}`,
              color: filter === key ? '#ff8a1f' : '#94a3b8',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto mb-3 opacity-20 text-white" />
          <p className="font-semibold text-white">Nenhuma sessão encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id}
              onClick={() => navigate(`/history/${session.id}`)}
              className="rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: session.status === 'completed'
                        ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'
                    }}>
                    {session.status === 'completed'
                      ? <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                      : <XCircle size={20} style={{ color: '#ef4444' }} />}
                  </div>
                  <div>
                    <p className="font-bold text-white">{session.workout_name}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {formatDate(session.started_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {session.status !== 'in_progress' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(session);
                      }}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#f87171' }}
                      title="Excluir treino"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <ChevronRight size={18} style={{ color: '#94a3b8' }} />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} style={{ color: '#ff8a1f' }} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    {formatDuration(session.total_duration_seconds)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} style={{ color: '#f59e0b' }} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    {session.completion_percentage}% completo
                  </span>
                </div>
              </div>

              {/* Mini barra de progresso */}
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a4a' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${session.completion_percentage}%`,
                    background: session.status === 'completed'
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h2 className="text-2xl font-black text-white text-center mb-2">Excluir treino?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#94a3b8' }}>
              Esta ação removerá <span className="text-white font-bold">{sessionToDelete.workout_name}</span> do histórico.
            </p>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
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
