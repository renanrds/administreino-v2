import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, Timer,
  Flame, X, Trophy, Zap, Play, Pause, XCircle, Plus, Minus,
  ArrowLeft, Loader2, HelpCircle
} from 'lucide-react';
import api from '../services/api';
import type { WorkoutSession, Exercise, ExerciseLog } from '../types';
import { MUSCLE_GROUP_COLORS } from '../types';

// ─── Cronômetro de Descanso (flutuante e arrastável) ─────────────────────────
function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ x: 100, y: 400 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; dragging: boolean }>({
    startX: 0, startY: 0, originX: 100, originY: 400, dragging: false
  });
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, dragging: true };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    let newX = dragRef.current.originX + dx;
    let newY = dragRef.current.originY + dy;
    const el = containerRef.current;
    if (el) {
      newX = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newX));
      newY = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newY));
    }
    setPos({ x: newX, y: newY });
  };
  const handlePointerUp = () => { dragRef.current.dragging = false; };

  const pct = ((seconds - remaining) / seconds) * 100;
  const circleSize = expanded ? 120 : 80;
  const r = expanded ? 26 : 22;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 select-none"
      style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="rounded-2xl shadow-2xl"
        style={{
          background: 'rgba(15,15,26,0.95)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${remaining <= 5 ? 'rgba(239,68,68,0.8)' : 'rgba(255,138,31,0.6)'}`,
          boxShadow: `0 0 18px ${remaining <= 5 ? 'rgba(239,68,68,0.35)' : 'rgba(255,138,31,0.25)'}, inset 0 0 12px ${remaining <= 5 ? 'rgba(239,68,68,0.08)' : 'rgba(255,138,31,0.06)'}`,
          minWidth: expanded ? 200 : undefined,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {expanded ? (
          /* ── Modo expandido ── */
          <div className="p-4 text-center cursor-pointer" onClick={() => setExpanded(false)}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
              Descanso
            </p>
            <div className="relative mx-auto mb-3" style={{ width: circleSize, height: circleSize }}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r={r} fill="none" stroke="#2a2a4a" strokeWidth="5" />
                <circle cx="30" cy="30" r={r} fill="none"
                  stroke={remaining <= 5 ? '#ef4444' : '#ff8a1f'}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * r}`}
                  strokeDashoffset={`${2 * Math.PI * r * (1 - pct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{remaining}</span>
                <span className="text-[10px]" style={{ color: '#94a3b8' }}>seg</span>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={(e) => { e.stopPropagation(); setPaused(!paused); }}
                className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1"
                style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', color: '#e2e8f0' }}>
                {paused ? <Play size={14} /> : <Pause size={14} />}
                {paused ? 'Retomar' : 'Pausar'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDone(); }}
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
                Pular
              </button>
            </div>
          </div>
        ) : (
          /* ── Modo compacto (pill) ── */
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          >
            <div className="relative" style={{ width: circleSize, height: circleSize }}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r={r} fill="none" stroke="#2a2a4a" strokeWidth="5" />
                <circle cx="30" cy="30" r={r} fill="none"
                  stroke={remaining <= 5 ? '#ef4444' : '#ff8a1f'}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * r}`}
                  strokeDashoffset={`${2 * Math.PI * r * (1 - pct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-white">{remaining}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">Descanso</span>
              <span className="text-[10px]" style={{ color: '#94a3b8' }}>{remaining}s</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDone(); }} className="ml-1">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contador de Repetições ──────────────────────────────────────────────────
const REP_TEMPO_MS = 3000;

function isAlternatingExercise(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('alternad') || lower.includes('unilateral');
}

interface RepCounterProps {
  targetReps: number;
  exerciseName: string;
  isAlternating: boolean;
  currentWeight: string;
  onComplete: (repsDone: number, weight: string) => void;
  onCancel: () => void;
}

function RepCounter({ targetReps, exerciseName, isAlternating, currentWeight, onComplete, onCancel }: RepCounterProps) {
  const [phase, setPhase] = useState<'countdown' | 'counting' | 'finished'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [currentRep, setCurrentRep] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [weight, setWeight] = useState(currentWeight);

  // Countdown 3-2-1
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('counting');
      setCurrentRep(1);
      setPulse(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Advance reps
  useEffect(() => {
    if (phase !== 'counting') return;
    if (currentRep >= targetReps) {
      setPhase('finished');
      return;
    }
    const timer = setTimeout(() => {
      setCurrentRep((prev) => prev + 1);
      setPulse(true);
    }, REP_TEMPO_MS);
    return () => clearTimeout(timer);
  }, [phase, currentRep, targetReps]);

  // Pulse animation reset
  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 250);
    return () => clearTimeout(t);
  }, [pulse]);

  const handleStop = () => setPhase('finished');
  const decreaseRep = () => setCurrentRep((prev) => Math.max(0, prev - 1));
  const increaseRep = () => setCurrentRep((prev) => Math.min(targetReps * 2, prev + 1));
  const decreaseWeight = () => setWeight((prev) => {
    const v = parseFloat(prev) || 0;
    const next = Math.max(0, v - 0.5);
    return next % 1 === 0 ? next.toString() : next.toFixed(1);
  });
  const increaseWeight = () => setWeight((prev) => {
    const v = parseFloat(prev) || 0;
    const next = v + 0.5;
    return next % 1 === 0 ? next.toString() : next.toFixed(1);
  });
  const pct = targetReps > 0 ? (currentRep / targetReps) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)' }}>
      <div className="text-center w-full max-w-sm">
        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
          {exerciseName}
        </p>
        <p className="text-xs mb-6" style={{ color: '#64748b' }}>
          {isAlternating
            ? `Alternado — ${targetReps} movimentos (${Math.round(targetReps / 2)} cada lado)`
            : phase === 'countdown' ? 'Prepare-se...'
              : phase === 'finished' ? 'Série concluída!'
                : 'Contagem de repetições'}
        </p>

        {/* Círculo de progresso */}
        <div className="relative w-56 h-56 mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#2a2a4a" strokeWidth="6" />
            {phase !== 'countdown' && (
              <circle cx="50" cy="50" r="44" fill="none"
                stroke={phase === 'finished' ? '#10b981' : '#ff8a1f'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'countdown' ? (
              <span className="text-8xl font-black transition-transform duration-200"
                style={{
                  color: '#ff8a1f', textShadow: '0 0 40px rgba(255,138,31,0.5)',
                  transform: pulse ? 'scale(1.2)' : 'scale(1)'
                }}>
                {countdown || 'GO'}
              </span>
            ) : (
              <>
                <span className="text-7xl font-black text-white transition-transform duration-200"
                  style={{
                    transform: pulse ? 'scale(1.15)' : 'scale(1)',
                    textShadow: phase === 'finished'
                      ? '0 0 40px rgba(16,185,129,0.5)'
                      : '0 0 40px rgba(255,138,31,0.3)',
                  }}>
                  {currentRep}
                </span>
                <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
                  de {targetReps}
                </span>
              </>
            )}
          </div>
        </div>

        {phase === 'countdown' && (
          <button onClick={onCancel}
            className="w-full py-3 rounded-xl font-bold"
            style={{ color: '#94a3b8', background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            Cancelar
          </button>
        )}

        {phase === 'counting' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseRep}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.65)',
                  boxShadow: '0 0 12px rgba(239,68,68,0.22)',
                  color: '#fca5a5'
                }}>
                <Minus size={16} />
                REP
              </button>
              <button
                onClick={increaseRep}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.65)',
                  boxShadow: '0 0 12px rgba(16,185,129,0.22)',
                  color: '#86efac'
                }}>
                <Plus size={16} />
                REP
              </button>
            </div>
            <button onClick={handleStop}
              className="w-full py-5 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
              <Pause size={24} />
              Parar ({currentRep} reps)
            </button>
            <button onClick={onCancel} className="w-full py-3 rounded-xl font-bold"
              style={{ color: '#94a3b8' }}>
              Cancelar
            </button>
          </div>
        )}

        {phase === 'finished' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseRep}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.65)',
                  boxShadow: '0 0 12px rgba(239,68,68,0.22)',
                  color: '#fca5a5'
                }}>
                <Minus size={16} />
                REP
              </button>
              <button
                onClick={increaseRep}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.65)',
                  boxShadow: '0 0 12px rgba(16,185,129,0.22)',
                  color: '#86efac'
                }}>
                <Plus size={16} />
                REP
              </button>
            </div>
            {/* Ajuste rápido de peso */}
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseWeight}
                className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.65)',
                  boxShadow: '0 0 12px rgba(239,68,68,0.22)',
                  color: '#fca5a5'
                }}>
                <Minus size={14} />
                0.5kg
              </button>
              <div className="flex flex-col items-center px-2">
                <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>PESO</span>
                <span className="text-xl font-black text-white">{weight || '—'}</span>
                <span className="text-[10px]" style={{ color: '#64748b' }}>kg</span>
              </div>
              <button
                onClick={increaseWeight}
                className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.65)',
                  boxShadow: '0 0 12px rgba(16,185,129,0.22)',
                  color: '#86efac'
                }}>
                <Plus size={14} />
                0.5kg
              </button>
            </div>
            <button onClick={() => onComplete(currentRep, weight)}
              className="w-full py-5 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)', boxShadow: '0 0 30px rgba(255,138,31,0.3)' }}>
              <Timer size={24} />
              Iniciar Descanso
            </button>
            <button onClick={onCancel} className="w-full py-3 rounded-xl font-bold"
              style={{ color: '#94a3b8' }}>
              Cancelar
            </button>
          </div>
        )}
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
  const [restTimer, setRestTimer] = useState<{ seconds: number; fromExerciseId: number; fromSetNumber: number; autoNext: boolean } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusedWeight, setFocusedWeight] = useState<string>('');
  const [nextSetHighlight, setNextSetHighlight] = useState<string>('');
  const [repCounter, setRepCounter] = useState<{
    exerciseId: number; setNumber: number; targetReps: number;
    exerciseName: string; isAlternating: boolean; weight: string;
  } | null>(null);
  const [videoModal, setVideoModal] = useState<{ videoId: string; exerciseName: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

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

  const findNextPendingSet = (currentSets: SetState[], currentExerciseId: number, currentSetNumber: number) => {
    const currentExercisePending = currentSets
      .filter((s) => s.exerciseId === currentExerciseId && !s.completed && s.setNumber > currentSetNumber)
      .sort((a, b) => a.setNumber - b.setNumber);

    if (currentExercisePending.length > 0) {
      return currentExercisePending[0];
    }

    const orderedExerciseIds = exercises.map((exercise) => exercise.id);
    const currentExerciseIdx = orderedExerciseIds.findIndex((id) => id === currentExerciseId);

    for (let idx = currentExerciseIdx + 1; idx < orderedExerciseIds.length; idx += 1) {
      const exerciseId = orderedExerciseIds[idx];
      const nextPending = currentSets
        .filter((s) => s.exerciseId === exerciseId && !s.completed)
        .sort((a, b) => a.setNumber - b.setNumber)[0];
      if (nextPending) {
        return nextPending;
      }
    }

    return null;
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

  const replaceWeightForSet = (exerciseId: number, setNumber: number, weightValue: number) => {
    setSets((prev) => prev.map((s) => {
      if (s.exerciseId === exerciseId && s.setNumber === setNumber) {
        return { ...s, weight: weightValue.toString() };
      }
      return s;
    }));
  };

  const applyWeightDownFromSet = (exerciseId: number, setNumber: number, weightValue: number) => {
    setSets((prev) => prev.map((s) => {
      if (s.exerciseId === exerciseId && s.setNumber >= setNumber && !s.completed) {
        return { ...s, weight: weightValue.toString() };
      }
      return s;
    }));
  };

  const completeSet = async (exerciseId: number, setNumber: number, repsOverride?: number, autoNext = false, weightOverride?: string) => {
    const setData = sets.find((s) => s.exerciseId === exerciseId && s.setNumber === setNumber);
    if (!setData) return;

    const ex = exercises.find((e) => e.id === exerciseId);
    const payload = {
      exercise: exerciseId,
      set_number: setNumber,
      reps_done: repsOverride ?? setData.reps,
      weight_kg: (weightOverride !== undefined ? weightOverride : setData.weight) || null,
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

      let nextPendingKey = '';
      setSets((prev) => {
        const updatedSets = prev.map((s) =>
          s.exerciseId === exerciseId && s.setNumber === setNumber
            ? { ...s, completed: true, logId }
            : s
        );

        const pending = findNextPendingSet(updatedSets, exerciseId, setNumber);
        if (pending) {
          nextPendingKey = `${pending.exerciseId}-${pending.setNumber}`;
          setExpandedEx(pending.exerciseId);
        }

        return updatedSets;
      });
      setNextSetHighlight(nextPendingKey);

      // Verifica se treino foi concluído automaticamente
      const { data: updatedSession } = await api.get(`/sessions/${id}/`);
      setSession(updatedSession);

      if (updatedSession.status === 'completed') {
        setShowCompletion(true);
        return;
      }

      // Inicia timer de descanso
      if (ex && ex.rest_seconds > 0) {
        setRestTimer({ seconds: ex.rest_seconds, fromExerciseId: exerciseId, fromSetNumber: setNumber, autoNext });
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

  const startRepCounter = (exerciseId: number, setNumber: number) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    const setData = sets.find((s) => s.exerciseId === exerciseId && s.setNumber === setNumber);
    if (!ex || !setData) return;

    const alternating = isAlternatingExercise(ex.name);
    const target = alternating ? setData.reps * 2 : setData.reps;

    setRepCounter({
      exerciseId,
      setNumber,
      targetReps: target,
      exerciseName: ex.name,
      isAlternating: alternating,
      weight: setData.weight,
    });
  };

  const handleRepCounterComplete = async (counterReps: number, adjustedWeight: string) => {
    if (!repCounter) return;
    const { exerciseId, setNumber, isAlternating: alt } = repCounter;
    const actualReps = alt ? Math.round(counterReps / 2) : counterReps;

    setSets((prev) => prev.map((s) =>
      s.exerciseId === exerciseId && s.setNumber === setNumber
        ? { ...s, reps: actualReps, weight: adjustedWeight }
        : s
    ));

    setRepCounter(null);
    await completeSet(exerciseId, setNumber, actualReps, true, adjustedWeight);
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
        <RestTimer seconds={restTimer.seconds} onDone={() => {
          const { fromExerciseId, fromSetNumber, autoNext } = restTimer;
          setRestTimer(null);
          if (!autoNext) return;
          // Auto-inicia o rep counter da próxima série pendente (mesmo exercício apenas)
          const nextPending = findNextPendingSet(sets, fromExerciseId, fromSetNumber);
          if (nextPending && nextPending.exerciseId === fromExerciseId) {
            const nextEx = exercises.find((e) => e.id === nextPending.exerciseId);
            if (nextEx) {
              const alt = isAlternatingExercise(nextEx.name);
              const target = alt ? nextPending.reps * 2 : nextPending.reps;
              setExpandedEx(nextPending.exerciseId);
              const nextSetData = sets.find((s) => s.exerciseId === nextPending.exerciseId && s.setNumber === nextPending.setNumber);
              setRepCounter({
                exerciseId: nextPending.exerciseId,
                setNumber: nextPending.setNumber,
                targetReps: target,
                exerciseName: nextEx.name,
                isAlternating: alt,
                weight: nextSetData?.weight ?? '',
              });
            }
          }
        }} />
      )}

      {repCounter && (
        <RepCounter
          targetReps={repCounter.targetReps}
          exerciseName={repCounter.exerciseName}
          isAlternating={repCounter.isAlternating}
          currentWeight={repCounter.weight}
          onComplete={handleRepCounterComplete}
          onCancel={() => setRepCounter(null)}
        />
      )}

      {/* Modal de Vídeo */}
      {videoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)' }}
          onClick={() => setVideoModal(null)}>
          <div className="w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white truncate">{videoModal.exerciseName}</p>
              <button onClick={() => setVideoModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#2a2a4a' }}>
                <X size={16} className="text-white" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoModal.videoId}?autoplay=1&mute=1&rel=0`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={videoModal.exerciseName}
              />
            </div>
          </div>
        </div>
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
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-white text-sm">{ex.name}</p>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (videoLoading) return;
                          setVideoLoading(true);
                          try {
                            const { data } = await api.get('/youtube-search/', { params: { q: ex.name } });
                            if (data.video_id) {
                              setVideoModal({ videoId: data.video_id, exerciseName: ex.name });
                            } else {
                              window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' como fazer')}`, '_blank');
                            }
                          } catch {
                            window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' como fazer')}`, '_blank');
                          } finally {
                            setVideoLoading(false);
                          }
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                        title="Ver vídeo demonstrativo">
                        <HelpCircle size={14} style={{ color: '#94a3b8' }} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `${exColor}20`, color: exColor }}>
                        {ex.muscle_group_display}
                      </span>
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {ex.sets}×{ex.reps_display || (ex.min_reps && ex.max_reps && ex.min_reps !== ex.max_reps ? `${ex.min_reps}-${ex.max_reps}` : ex.reps)}
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
                  <div className="pt-2" />

                  {getExerciseSets(ex.id).map((setData) => {
                    // Pesos comuns recomendados
                    const commonWeights = [0.5, 1, 2, 5, 10].filter(
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
                          className="flex items-center gap-2 p-3 rounded-xl transition-all"
                          style={{
                            background: setData.completed
                              ? 'rgba(16,185,129,0.1)'
                              : nextSetHighlight === `${setData.exerciseId}-${setData.setNumber}`
                                ? 'rgba(255,138,31,0.12)'
                                : '#0f0f1a',
                            border: `1px solid ${setData.completed
                              ? 'rgba(16,185,129,0.3)'
                              : nextSetHighlight === `${setData.exerciseId}-${setData.setNumber}`
                                ? 'rgba(255,138,31,0.45)'
                                : '#2a2a4a'}`,
                          }}>
                          {/* Número da série */}
                          <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{
                              background: setData.completed ? '#10b981' : `${exColor}20`,
                              color: setData.completed ? 'white' : exColor,
                            }}>
                            {setData.setNumber}
                          </span>

                          {/* Reps */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="number"
                              min={0}
                              value={setData.reps}
                              disabled={setData.completed}
                              onChange={(e) => updateSet(ex.id, setData.setNumber, 'reps', e.target.value)}
                              className="w-full py-2 rounded-lg text-center text-sm font-bold outline-none"
                              style={{
                                background: setData.completed ? 'transparent' : '#1a1a2e',
                                border: `1px solid ${setData.completed ? 'transparent' : '#2a2a4a'}`,
                                color: setData.completed ? '#10b981' : 'white',
                              }} />
                            <span className="block text-center text-[10px] mt-0.5" style={{ color: '#64748b' }}>reps</span>
                          </div>

                          {/* Peso */}
                          <div className="flex-1 min-w-0 relative">
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
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-80 transition-opacity"
                                style={{ color: '#94a3b8' }}
                                title="Limpar peso">
                                <XCircle size={14} />
                              </button>
                            )}
                            <span className="block text-center text-[10px] mt-0.5" style={{ color: '#64748b' }}>kg</span>
                          </div>

                          {/* Play - contagem de reps */}
                          {!setData.completed && (
                            <button
                              onClick={() => startRepCounter(ex.id, setData.setNumber)}
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                              style={{ background: 'rgba(255,138,31,0.15)', border: '2px solid #ff8a1f' }}
                              title="Iniciar contagem de reps">
                              <Play size={16} style={{ color: '#ff8a1f' }} fill="#ff8a1f" />
                            </button>
                          )}

                          {/* Botão completar */}
                          <div className="flex-shrink-0">
                            {setData.completed ? (
                              <button
                                onClick={() => uncompleteSet(ex.id, setData.setNumber)}
                                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform hover:opacity-80"
                                title="Descompletar série"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid #10b981' }}>
                                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                              </button>
                            ) : (
                              <button
                                onClick={() => completeSet(ex.id, setData.setNumber)}
                                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                style={{ background: `${exColor}20`, border: `2px solid ${exColor}` }}>
                                <Circle size={14} style={{ color: exColor }} />
                              </button>
                            )}
                          </div>
                        </div>

                        {nextSetHighlight === `${setData.exerciseId}-${setData.setNumber}` && !setData.completed && (
                          <p className="text-[11px] px-2 mt-1" style={{ color: '#fdba74' }}>
                            Próxima série sugerida
                          </p>
                        )}

                        {/* Quick-select de pesos */}
                        {focusedWeight === `${ex.id}-${setData.setNumber}` && !setData.completed && (
                          <div className="mt-2 px-2 space-y-2" onMouseDown={(e) => e.preventDefault()}>
                            {/* Pesos recentes */}
                            {recentWeights.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                <span className="text-xs font-semibold px-2 py-1" style={{ color: '#94a3b8' }}>
                                  Último:
                                </span>
                                <button
                                  onMouseDown={() => {
                                    const lastWeight = recentWeights[recentWeights.length - 1];
                                    applyWeightDownFromSet(ex.id, setData.setNumber, lastWeight);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                                  style={{
                                    background: 'rgba(255,138,31,0.12)',
                                    border: '1px solid rgba(255,138,31,0.5)',
                                    color: '#fdba74',
                                  }}>
                                  Atualizar Abaixo
                                </button>
                                {recentWeights.map((w) => (
                                  <button
                                    key={w}
                                    onMouseDown={() => {
                                      replaceWeightForSet(ex.id, setData.setNumber, w);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                                    style={{
                                      background: setData.weight === w.toString() ? '#ff8a1f' : '#1a1a2e',
                                      border: `1px solid ${setData.weight === w.toString() ? '#ff8a1f' : '#2a2a4a'}`,
                                      color: setData.weight === w.toString() ? 'white' : '#94a3b8',
                                    }}>
                                    {w}kg
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