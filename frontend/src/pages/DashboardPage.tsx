import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Flame, Calendar, Clock, TrendingUp, ChevronRight, Play, Zap } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { DashboardData } from '../types';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/').then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const stats = data?.stats;
  const activeSession = data?.active_session;

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-in">
      {/* Saudação */}
      <div>
        <p className="text-sm" style={{ color: '#94a3b8' }}>Bom treino,</p>
        <h1 className="text-2xl font-black text-white">
          {user?.first_name || user?.username} 💪
        </h1>
      </div>

      {/* Sessão ativa */}
      {activeSession && (
        <div
          onClick={() => navigate(`/session/${activeSession.id}`)}
          className="rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Treino em andamento</span>
            </div>
            <ChevronRight size={20} className="text-white/70" />
          </div>
          <p className="text-xl font-black text-white mb-2">{activeSession.workout_name}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all"
                style={{ width: `${activeSession.completion_percentage}%` }} />
            </div>
            <span className="text-sm font-bold text-white">{activeSession.completion_percentage}%</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
            <Zap size={14} />
            <span>Toque para continuar</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total de Treinos', value: stats?.total_sessions ?? 0, icon: Flame, color: '#f59e0b' },
          { label: 'Esta Semana', value: stats?.sessions_this_week ?? 0, icon: Calendar, color: '#10b981' },
          { label: 'Este Mês', value: stats?.sessions_this_month ?? 0, icon: TrendingUp, color: '#6366f1' },
          {
            label: 'Duração Média',
            value: stats?.avg_duration_seconds ? formatDuration(stats.avg_duration_seconds) : '—',
            icon: Clock, color: '#8b5cf6'
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}20` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Ação rápida */}
      {!activeSession && (
        <button
          onClick={() => navigate('/workouts')}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
          <Play size={20} />
          Iniciar Novo Treino
        </button>
      )}

      {/* Sessões recentes */}
      {data?.recent_sessions && data.recent_sessions.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-white mb-3">Treinos Recentes</h2>
          <div className="space-y-2">
            {data.recent_sessions.map((session) => (
              <div key={session.id}
                onClick={() => navigate(`/history/${session.id}`)}
                className="flex items-center justify-between p-4 rounded-xl cursor-pointer active:scale-95 transition-transform"
                style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: session.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                    <Dumbbell size={18} style={{ color: session.status === 'completed' ? '#10b981' : '#ef4444' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{session.workout_name}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{formatDate(session.started_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    session.status === 'completed' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                    style={{
                      background: session.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'
                    }}>
                    {session.completion_percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data?.recent_sessions?.length === 0 && !activeSession && (
        <div className="text-center py-10">
          <Dumbbell size={48} className="mx-auto mb-3 opacity-20 text-white" />
          <p className="font-semibold text-white">Nenhum treino ainda</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Crie seu primeiro treino e comece agora!</p>
        </div>
      )}
    </div>
  );
}
