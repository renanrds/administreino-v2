import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, Timer,
  Flame, X, Trophy, Zap, Play, Pause, XCircle, Plus,
  ArrowLeft, Loader2
} from 'lucide-react';
import api from '../services/api';
import type { WorkoutSession, Exercise, ExerciseLog } from '../types';
import { MUSCLE_GROUP_COLORS } from '../types';

// ─── Cronômetro de Descanso ──────────────────────────────────────────────────
function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) { clearInterval(intervalRef.current!); onDone(); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)' }}>
      <div className="text-center animate-slide-up">
        <p className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: '#94a3b8' }}>
          Tempo de Descanso
        </p>

        {/* Círculo de progresso */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#2a2a4a" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none"
              stroke={remaining <= 5 ? '#ef4444' : '#ff8a1f'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-white">{remaining}</span>
            <span className="text-sm" style={{ color: '#94a3b8' }}>segundos</span>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={() => setPaused(!paused)}
            className="px-6 py-3 rounded-xl font-bold flex items-center gap-2"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', color: '#e2e8f0' }}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
            {paused ? 'Retomar' : 'Pausar'}
          </button>
          <button onClick={onDone}
            className="px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
            Pular
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tela de Conclusão ───────────────────────────────────────────────────────
function CompletionScreen({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const duration = session.total_duration_seconds || 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)' }}>
      <div className="text-center animate-slide-up">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 60px rgba(16,185,129,0.5)' }}>
          <Trophy size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Treino Concluído!</h1>
        <p className="text-lg mb-8" style={{ color: '#94a3b8' }}>
          {session.workout_name}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl p-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Duração</p>
            <p className="text-2xl font-black text-white">{mins}:{secs.toString().padStart(2, '0')}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Completado</p>
            <p className="text-2xl font-black" style={{ color: '#10b981' }}>
              {session.completion_percentage}%
            </p>
          </div>
        </div>

        <button onClick={onClose}
          className="w-full py-4 rounded-2xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
interface SetState {
  exerciseId: number;
  setNumber: number;
  reps: number;
  weight: string;
  completed: boolean;
  logId?: number;
}

export default function ActiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SetState[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEx, setExpandedEx] = useState<number | null>(null);
  const [restTimer, setRestTimer] = useState<{ seconds: number } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusedWeight, setFocusedWeight] = useState<string>('');

  // Cronômetro total baseado na hora de início real
  useEffect(() => {
    if (!session?.started_at) return;
    
    const startTime = new Date(session.started_at).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diffInSeconds = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(diffInSeconds > 0 ? diffInSeconds : 0);
    };

    updateTimer(); // Atualiza imediatamente ao carregar
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [session?.started_at]);

  const formatElapsed = () => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Carrega sessão
  useEffect(() => {
    const load = async () => {
      try {
        const { data: sessionData } = await api.get(`/sessions/${id}/`);
        setSession(sessionData);

        // Carrega exercícios do treino
        const { data: workoutData } = await api.get(`/workouts/${sessionData.workout}/`);
        const exs: Exercise[] = workoutData.exercises;
        setExercises(exs);

        // Expande primeiro exercício
        if (exs.length > 0) setExpandedEx(exs[0].id);

        // Monta estado das séries
        const initialSets: SetState[] = [];
        for (const ex of exs) {
          for (let s = 1; s <= ex.sets; s++) {
            const existingLog = sessionData.exercise_logs.find(
              (l: ExerciseLog) => l.exercise === ex.id && l.set_number === s
            );
            initialSets.push({
              exerciseId: ex.id,
              setNumber: s,
              reps: existingLog?.reps_done ?? ex.reps,
              weight: existingLog?.weight_kg?.toString() ?? ex.weight_kg?.toString() ?? '',
              completed: existingLog?.is_completed ?? false,
              logId: existingLog?.id,
            });
          }
        }
        setSets(initialSets);

        if (sessionData.status === 'completed') {
          setShowCompletion(true);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const getExerciseSets = (exerciseId: number) =>
    sets.filter((s) => s.exerciseId === exerciseId);

  const getExerciseProgress = (exerciseId: number) => {
    const exSets = getExerciseSets(exerciseId);
    const done = exSets.filter((s) => s.completed).length;
    return { done, total: exSets.length };
  };

  const updateSet = (exerciseId: number, setNumber: number, field: 'reps' | 'weight', value: string) => {
    setSets((prev) => {
      const updated = prev.map((s) =>
        s.exerciseId === exerciseId && s.setNumber === setNumber
          ? { ...s, [field]: field === 'reps' ? parseInt(value) || 0 : value }
          : s
      );

      // Se atualizando peso, preenche a próxima série também
      if (field === 'weight' && value) {
        const nextSetIdx = updated.findIndex(
          (s) => s.exerciseId === exerciseId && s.setNumber === setNumber + 1
        );

        if (nextSetIdx !== -1 && !updated[nextSetIdx].weight) {
          updated[nextSetIdx].weight = value;
        }
      }

      return updated;
    });
  };

  const addWeightToSet = (exerciseId: number, setNumber: number, weightToAdd: number) => {
    setSets((prev) => prev.map((s) => {
      if (s.exerciseId === exerciseId && s.setNumber === setNumber) {
        const currentWeight = s.weight ? parseFloat(s.weight) : 0;
        const newWeight = currentWeight + weightToAdd;
        return { ...s, weight: newWeight.toString() };
      }
      return s;
    }));
  };

  const completeSet = async (exerciseId: number, setNumber: number) => {
    const setData = sets.find((s) => s.exerciseId === exerciseId && s.setNumber === setNumber);
    if (!setData) return;

    const ex = exercises.find((e) => e.id === exerciseId);
    const payload = {
      exercise: exerciseId,
      set_number: setNumber,
      reps_done: setData.reps,
      weight_kg: setData.weight || null,
      is_completed: true,
    };

    try {
      let logId = setData.logId;
      if (logId) {
        await api.patch(`/logs/${logId}/`, payload);
      } else {
        const { data } = await api.post(`/sessions/${id}/logs/`, payload);
        logId = data.id;
      }

      setSets((prev) => prev.map((s) =>
        s.exerciseId === exerciseId && s.setNumber === setNumber
          ? { ...s, completed: true, logId }
          : s
      ));

      // Verifica se treino foi concluído automaticamente
      const { data: updatedSession } = await api.get(`/sessions/${id}/`);
      setSession(updatedSession);

      if (updatedSession.status === 'completed') {
        setShowCompletion(true);
        return;
      }

      // Inicia timer de descanso
      if (ex && ex.rest_seconds > 0) {
        setRestTimer({ seconds: ex.rest_seconds });
      }
    } catch (err) {
      console.error('Erro ao registrar série:', err);
    }
  };

  const uncompleteSet = async (exerciseId: number, setNumber: number) => {
    const setData = sets.find((s) => s.exerciseId === exerciseId && s.setNumber === setNumber);
    if (!setData || !setData.logId) return;

    try {
      await api.delete(`/logs/${setData.logId}/`);

      setSets((prev) => prev.map((s) =>
        s.exerciseId === exerciseId && s.setNumber === setNumber
          ? { ...s, completed: false, logId: undefined }
          : s
      ));

      // Atualiza sessão
      const { data: updatedSession } = await api.get(`/sessions/${id}/`);
      setSession(updatedSession);
    } catch (err) {
      console.error('Erro ao descompletar série:', err);
    }
  };

  const handleFinish = () => {
    setShowFinishModal(true);
  };

  const confirmFinish = async () => {
    setCompleting(true);
    try {
      const { data } = await api.post(`/sessions/${id}/finish/`);
      setSession(data);
      setShowCompletion(true);
    } finally {
      setCompleting(false);
      setShowFinishModal(false);
    }
  };

  const confirmCancelSession = async () => {
    setCancelling(true);
    try {
      await api.post(`/sessions/${id}/cancel/`);
      navigate('/');
    } catch (err) {
      console.error('Erro ao cancelar treino:', err);
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 rounded-full border-2 animate-spin"
          style={{ borderColor: '#ff8a1f', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!session) return null;

  if (showCompletion && session.status === 'completed') {
    return <CompletionScreen session={session} onClose={() => navigate('/')} />;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a' }}>
      {restTimer && (
        <RestTimer seconds={restTimer.seconds} onDone={() => setRestTimer(null)} />
      )}

      {/* Modal de Confirmação de Finalização */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 animate-slide-up"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            {/* Ícone */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
                <Trophy size={32} className="text-white" />
              </div>
            </div>

            {/* Conteúdo */}
            <h2 className="text-2xl font-black text-white text-center mb-2">Finalizar Treino?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#94a3b8' }}>
              {progressPct < 100
                ? `Você completou ${progressPct}% do treino. Tem certeza que deseja finalizar?`
                : 'Parabéns! Você completou todo o treino!'
              }
            </p>

            {/* Resumo */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}>
                <div className="flex items-center gap-2">
                  <Timer size={16} style={{ color: '#ff8a1f' }} />
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Duração</span>
                </div>
                <span className="font-bold text-white font-mono">{formatElapsed()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}>
                <div className="flex items-center gap-2">
                  <Flame size={16} style={{ color: '#f59e0b' }} />
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Progresso</span>
                </div>
                <span className="font-bold text-white">{completedSets}/{totalSets} séries</span>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                disabled={completing}
                className="flex-1 py-3 rounded-xl font-bold transition-all active:scale-95"
                style={{
                  background: '#2a2a4a',
                  color: '#94a3b8',
                  border: '1px solid #3a3a5a'
                }}>
                Continuar Treino
              </button>
              <button
                onClick={confirmFinish}
                disabled={completing}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{
                  background: progressPct < 100
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'linear-gradient(135deg, #10b981, #059669)'
                }}>
                {completing ? <Loader2 size={18} className="animate-spin" /> : <Trophy size={18} />}
                {completing ? 'Finalizando...' : 'Finalizar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 animate-slide-up"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
                <X size={30} className="text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white text-center mb-2">Cancelar Treino?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#94a3b8' }}>
              Seu progresso atual não será finalizado. Você poderá iniciar um novo treino depois.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl font-bold transition-all active:scale-95"
                style={{
                  background: '#2a2a4a',
                  color: '#94a3b8',
                  border: '1px solid #3a3a5a'
                }}>
                Voltar
              </button>
              <button
                onClick={confirmCancelSession}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {cancelling ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header fixo */}
      <div className="sticky top-0 z-30 px-4 py-3"
        style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2a2a4a' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} style={{ color: '#94a3b8' }}>
            <ArrowLeft size={22} />
          </button>
          <div className="text-center">
            <p className="font-black text-white text-base leading-tight">{session.workout_name}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs" style={{ color: '#94a3b8' }}>Em andamento</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <Timer size={14} style={{ color: '#ff8a1f' }} />
            <span className="text-sm font-bold text-white font-mono">{formatElapsed()}</span>
          </div>
        </div>

        {/* Barra de progresso geral */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Flame size={14} style={{ color: '#f59e0b' }} />
              <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                {completedSets}/{totalSets} séries
              </span>
            </div>
            <span className="text-sm font-black" style={{
              color: progressPct >= 100 ? '#10b981' : progressPct >= 50 ? '#f59e0b' : '#ff8a1f'
            }}>
              {progressPct}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: '#2a2a4a' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: progressPct >= 100
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : progressPct >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                  : 'linear-gradient(90deg, #ff8a1f, #ff5a00)',
                boxShadow: `0 0 12px ${progressPct >= 100 ? '#10b981' : '#ff8a1f'}80`
              }} />
          </div>
        </div>
      </div>

      {/* Motivação */}
      {progressPct > 0 && progressPct < 100 && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(255,138,31,0.1)', border: '1px solid rgba(255,138,31,0.2)' }}>
          <Zap size={14} style={{ color: '#ff8a1f' }} />
          <p className="text-xs font-semibold" style={{ color: '#a5b4fc' }}>
            {progressPct < 30 ? 'Ótimo começo! Continue assim! 🔥'
              : progressPct < 60 ? 'Você está na metade! Não pare agora! 💪'
              : progressPct < 90 ? 'Quase lá! Falta pouco! ⚡'
              : 'Última etapa! Dê tudo de si! 🏆'}
          </p>
        </div>
      )}

      {/* Lista de exercícios */}
      <div className="px-4 py-3 space-y-3 pb-32">
        {exercises.map((ex, exIdx) => {
          const { done, total } = getExerciseProgress(ex.id);
          const isExpanded = expandedEx === ex.id;
          const exColor = MUSCLE_GROUP_COLORS[ex.muscle_group] || '#ff8a1f';
          const allDone = done === total;

          return (
            <div key={ex.id} className="rounded-2xl overflow-hidden"
              style={{
                background: '#1a1a2e',
                border: `1px solid ${allDone ? '#10b981' : '#2a2a4a'}`,
                boxShadow: allDone ? '0 0 20px rgba(16,185,129,0.15)' : 'none',
              }}>
              {/* Cabeçalho do exercício */}
              <button
                className="w-full flex items-center justify-between p-4"
                onClick={() => setExpandedEx(isExpanded ? null : ex.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm"
                    style={{ background: allDone ? '#10b981' : `${exColor}20`, color: allDone ? 'white' : exColor }}>
                    {allDone ? <CheckCircle2 size={20} /> : exIdx + 1}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-sm">{ex.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `${exColor}20`, color: exColor }}>
                        {ex.muscle_group_display}
                      </span>
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {ex.sets}×{ex.reps}
                        {ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold"
                    style={{ color: allDone ? '#10b981' : '#94a3b8' }}>
                    {done}/{total}
                  </span>
                  {isExpanded ? <ChevronUp size={18} style={{ color: '#94a3b8' }} /> : <ChevronDown size={18} style={{ color: '#94a3b8' }} />}
                </div>
              </button>

              {/* Séries expandidas */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid #2a2a4a' }}>
                  {/* Cabeçalho das colunas */}
                  <div className="grid grid-cols-4 gap-2 pt-3 pb-1">
                    {['Série', 'Reps', 'Carga (kg)', 'Status'].map((h) => (
                      <span key={h} className="text-xs font-bold uppercase tracking-wider text-center"
                        style={{ color: '#94a3b8' }}>{h}</span>
                    ))}
                  </div>

                  {getExerciseSets(ex.id).map((setData) => {
                // Pesos comuns recomendados
                const commonWeights = [1, 2, 5, 10].filter(
                  (w) => !setData.weight || Math.abs(w - parseFloat(setData.weight)) >= 2.5
                );
                const recentWeights = getExerciseSets(ex.id)
                  .filter((s) => s.setNumber < setData.setNumber && s.weight)
                  .map((s) => parseFloat(s.weight))
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .slice(-2);

                return (
                  <div key={setData.setNumber}>
                    <div
                      className="grid grid-cols-4 gap-2 items-center p-2 rounded-xl transition-all"
                      style={{
                        background: setData.completed ? 'rgba(16,185,129,0.1)' : '#0f0f1a',
                        border: `1px solid ${setData.completed ? 'rgba(16,185,129,0.3)' : '#2a2a4a'}`,
                      }}>
                      {/* Número da série */}
                      <div className="flex items-center justify-center">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                          style={{
                            background: setData.completed ? '#10b981' : `${exColor}20`,
                            color: setData.completed ? 'white' : exColor,
                          }}>
                          {setData.setNumber}
                        </span>
                      </div>

                      {/* Reps */}
                      <input
                        type="number"
                        min={0}
                        value={setData.reps}
                        disabled={setData.completed}
                        onChange={(e) => updateSet(ex.id, setData.setNumber, 'reps', e.target.value)}
                        className="w-full py-2 rounded-lg text-center text-sm font-bold text-white outline-none"
                        style={{
                          background: setData.completed ? 'transparent' : '#1a1a2e',
                          border: `1px solid ${setData.completed ? 'transparent' : '#2a2a4a'}`,
                          color: setData.completed ? '#10b981' : 'white',
                        }} />

                      {/* Peso */}
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={setData.weight}
                          disabled={setData.completed}
                          onChange={(e) => {
                            updateSet(ex.id, setData.setNumber, 'weight', e.target.value);
                            setFocusedWeight(`${ex.id}-${setData.setNumber}`);
                          }}
                          onFocus={() => setFocusedWeight(`${ex.id}-${setData.setNumber}`)}
                          onBlur={() => setFocusedWeight('')}
                          placeholder="—"
                          className="w-full py-2 pr-6 rounded-lg text-center text-sm font-bold outline-none"
                          style={{
                            background: setData.completed ? 'transparent' : '#1a1a2e',
                            border: `1px solid ${setData.completed ? 'transparent' : '#2a2a4a'}`,
                            color: setData.completed ? '#10b981' : 'white',
                          }} />
                        {setData.weight && !setData.completed && (
                          <button
                            onMouseDown={() => updateSet(ex.id, setData.setNumber, 'weight', '')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-80 transition-opacity"
                            style={{ color: '#94a3b8' }}
                            title="Limpar peso">
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>

                      {/* Botão completar */}
                      <div className="flex justify-center">
                        {setData.completed ? (
                          <button
                            onClick={() => uncompleteSet(ex.id, setData.setNumber)}
                            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform hover:opacity-80"
                            title="Descompletar série"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid #10b981' }}>
                            <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                          </button>
                        ) : (
                          <button
                            onClick={() => completeSet(ex.id, setData.setNumber)}
                            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                            style={{ background: `${exColor}20`, border: `2px solid ${exColor}` }}>
                            <Circle size={14} style={{ color: exColor }} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick-select de pesos */}
                    {focusedWeight === `${ex.id}-${setData.setNumber}` && !setData.completed && (
                      <div className="mt-2 px-2 space-y-2" onMouseDown={(e) => e.preventDefault()}>
                        {/* Pesos recentes */}
                        {recentWeights.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs font-semibold px-2 py-1" style={{ color: '#94a3b8' }}>
                              Último:
                            </span>
                            {recentWeights.map((w) => (
                              <button
                                key={w}
                                onMouseDown={() => {
                                  addWeightToSet(ex.id, setData.setNumber, w);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                                style={{
                                  background: setData.weight === w.toString() ? '#ff8a1f' : '#1a1a2e',
                                  border: `1px solid ${setData.weight === w.toString() ? '#ff8a1f' : '#2a2a4a'}`,
                                  color: setData.weight === w.toString() ? 'white' : '#94a3b8',
                                }}>
                                +{w}kg
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Pesos comuns */}
                        <div className="flex gap-2 flex-wrap">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(16,185,129,0.2)', border: '1.5px solid #10b981' }}>
                            <Plus size={14} style={{ color: '#10b981' }} />
                          </div>
                          {commonWeights.slice(0, 4).map((w) => (
                            <button
                              key={w}
                              onMouseDown={() => {
                                addWeightToSet(ex.id, setData.setNumber, w);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                              style={{
                                background: '#0f0f1a',
                                border: '1px solid #2a2a4a',
                                color: '#94a3b8',
                              }}>
                              +{w}kg
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

                  {/* Info de descanso */}
                  <div className="flex items-center gap-1.5 mt-2 px-1"
                    style={{ color: '#94a3b8' }}>
                    <Timer size={12} />
                    <span className="text-xs">Descanso: {ex.rest_seconds}s</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão de finalizar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom"
        style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2a2a4a' }}>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCancelModal(true)}
            className="p-3 rounded-xl"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', color: '#ef4444' }}>
            <X size={20} />
          </button>
          <button
            onClick={handleFinish}
            disabled={completing}
            className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{
              background: progressPct < 30
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : progressPct < 60
                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                : progressPct < 90
                ? 'linear-gradient(135deg, #ff8a1f, #ff5a00)'
                : 'linear-gradient(135deg, #10b981, #059669)'
            }}>
            {completing ? <Loader2 size={20} className="animate-spin" /> : <Trophy size={20} />}
            {completing ? 'Finalizando...'
              : progressPct < 30 ? `Finalizar (${progressPct}% completo)`
              : progressPct < 60 ? `Na metade! ${progressPct}%`
              : progressPct < 90 ? `Quase! ${progressPct}%`
              : 'Finalizar Treino'}
          </button>
        </div>
      </div>
    </div>
  );
}