import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Copy, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import api from '../services/api';
import type { Workout, MuscleGroup, WorkoutType } from '../types';
import { MUSCLE_GROUP_LABELS, WORKOUT_TYPE_LABELS } from '../types';

const MUSCLE_GROUPS = Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroup, string][];
const WORKOUT_TYPES = Object.entries(WORKOUT_TYPE_LABELS) as [WorkoutType, string][];

interface ParsedExercise {
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_kg?: number;
  notes?: string;
}

interface ParsedDay {
  day: string;
  focus: string;
  exercises: ParsedExercise[];
}

interface ParsedWorkout {
  name: string;
  description?: string;
  workout_type: string;
  days: ParsedDay[];
}

interface ImportError {
  field?: string;
  message: string;
}

export default function ImportWorkoutPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'review' | 'success'>('input');
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedWorkout | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; workouts: Workout[] } | null>(null);
  const [copied, setCopied] = useState(false);

  /** Remove markdown code fences that some AIs wrap around JSON */
  const cleanJSON = (str: string): string =>
    str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  const validateAndPreview = () => {
    setError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJSON(jsonInput));
    } catch {
      setError({
        message:
          'JSON inválido. Se a IA retornou o código envolto em blocos ```json, tente colar novamente — o app remove esses blocos automaticamente. Caso o erro persista, peça à IA: "retorne apenas o JSON sem blocos de código".',
      });
      return;
    }
    if (!parsed.name) { setError({ message: 'Campo "name" é obrigatório no JSON.' }); return; }
    if (!parsed.workout_type) { setError({ message: 'Campo "workout_type" é obrigatório no JSON.' }); return; }
    if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
      setError({ message: 'O JSON precisa ter pelo menos um dia em "days".' });
      return;
    }
    setParsedData(parsed as ParsedWorkout);
    setExpandedDays(new Set([0]));
    setStep('review');
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/workouts/import-from-json/', parsedData);
      setSuccessData(response.data);
      setStep('success');
      setJsonInput('');
    } catch (err: any) {
      setError({ message: err.response?.data?.error || 'Erro ao importar treino' });
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (idx: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // ── Inline edit helpers ──────────────────────────────────────────────────
  const updateWorkout = (field: keyof Pick<ParsedWorkout, 'name' | 'description' | 'workout_type'>, value: string) => {
    setParsedData(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const updateDay = (dayIdx: number, field: keyof Pick<ParsedDay, 'day' | 'focus'>, value: string) => {
    setParsedData(prev => {
      if (!prev) return prev;
      const days = prev.days.map((d, i) => i === dayIdx ? { ...d, [field]: value } : d);
      return { ...prev, days };
    });
  };

  const updateExercise = (dayIdx: number, exIdx: number, field: keyof ParsedExercise, value: string | number) => {
    setParsedData(prev => {
      if (!prev) return prev;
      const days = prev.days.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((ex, j) => j === exIdx ? { ...ex, [field]: value } : ex);
        return { ...d, exercises };
      });
      return { ...prev, days };
    });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setParsedData(prev => {
      if (!prev) return prev;
      const days = prev.days.map((d, i) => {
        if (i !== dayIdx) return d;
        return { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) };
      });
      return { ...prev, days };
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const exampleJSON = {
    name: "Treino ABC - Hipertrofia",
    description: "Programa de 3 dias focado em hipertrofia com volume moderado",
    workout_type: "hypertrophy",
    days: [
      {
        day: "A",
        focus: "Peito, Ombros e Tríceps",
        exercises: [
          {
            name: "Supino Reto com Halteres",
            muscle_group: "chest",
            sets: 4,
            reps: 8,
            rest_seconds: 120,
            weight_kg: 30,
            notes: "Movimento controlado e amplitude completa"
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-4"
        style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2a2a4a' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === 'review' ? setStep('input') : navigate('/workouts')}
            style={{ color: '#94a3b8' }}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-white">
              {step === 'review' ? 'Revisar Treino' : 'Importar Treino'}
            </h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {step === 'review' ? 'Confirme antes de importar' : 'Cole o JSON do treino gerado'}
            </p>
          </div>
          {step === 'review' && parsedData && (
            <span className="text-xs px-2 py-1 rounded-lg font-bold"
              style={{ background: 'rgba(255,138,31,0.14)', color: '#fdba74' }}>
              {parsedData.days.length} dia(s)
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">

        {/* ── INPUT STEP ── */}
        {step === 'input' && (
          <div className="space-y-6">
            {/* Instruções */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6' }}
              className="p-4 rounded-lg">
              <h3 className="font-bold text-white mb-2">Como usar:</h3>
              <ol className="text-sm space-y-1" style={{ color: '#cbd5e1' }}>
                <li>1. Vá para o <strong>Gerador de Prompts</strong></li>
                <li>2. Preencha os parâmetros e copie o prompt</li>
                <li>3. Cole em ChatGPT, Claude, Gemini ou outro IA</li>
                <li>4. Copie a resposta (pode incluir os blocos ```json – o app remove automaticamente)</li>
                <li>5. Cole abaixo e clique em <strong>Visualizar Treino</strong></li>
              </ol>
            </div>

            {/* JSON Input */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Código JSON do Treino</label>
              <textarea
                value={jsonInput}
                onChange={(e) => { setJsonInput(e.target.value); setError(null); }}
                placeholder={'Cole o JSON aqui (com ou sem os blocos ```json)...'}
                className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #2a2a4a' }}
                rows={12}
              />
            </div>

            {/* Erro */}
            {error && (
              <div className="flex gap-3 p-4 rounded-lg"
                style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444' }}>
                <AlertCircle size={20} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <p className="font-bold text-white">Erro na validação</p>
                  <p className="text-sm mt-1" style={{ color: '#cbd5e1' }}>{error.message}</p>
                </div>
              </div>
            )}

            {/* Exemplo JSON */}
            <details className="group">
              <summary className="cursor-pointer p-4 rounded-lg hover:bg-slate-800 transition-colors"
                style={{ background: 'rgba(30, 41, 59, 1)' }}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Ver exemplo de JSON</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </div>
              </summary>
              <div className="px-4 py-3 mt-2 rounded-lg" style={{ background: '#1e293b' }}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-slate-400">Exemplo de formato</p>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(exampleJSON, null, 2))}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-700 transition-colors"
                    style={{ color: '#60a5fa' }}
                  >
                    <Copy size={14} />
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre className="text-xs overflow-x-auto" style={{ color: '#cbd5e1' }}>
                  {JSON.stringify(exampleJSON, null, 2)}
                </pre>
              </div>
            </details>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => navigate('/workouts')}
                className="flex-1 px-4 py-3 rounded-lg font-bold transition-colors"
                style={{ background: '#334155', color: '#cbd5e1' }}
              >
                Cancelar
              </button>
              <button
                disabled={!jsonInput.trim()}
                onClick={validateAndPreview}
                style={{
                  background: jsonInput.trim() ? 'linear-gradient(135deg, #ff8a1f, #ff5a00)' : '#4b5563',
                  color: jsonInput.trim() ? '#fff' : '#9ca3af',
                }}
                className="flex-1 px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
                Visualizar Treino
              </button>
            </div>
          </div>
        )}

        {/* ── REVIEW STEP ── */}
        {step === 'review' && parsedData && (
          <div className="space-y-4">

            {/* ── Informações do Treino (editável) ── */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ff8a1f' }}>Informações do Treino</p>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Nome</label>
                <input
                  value={parsedData.name}
                  onChange={(e) => updateWorkout('name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-white outline-none text-sm font-semibold"
                  style={{ background: '#0f172a', border: '1px solid #2a2a4a' }}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Descrição</label>
                <textarea
                  value={parsedData.description ?? ''}
                  onChange={(e) => updateWorkout('description', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl text-white outline-none text-sm resize-none"
                  style={{ background: '#0f172a', border: '1px solid #2a2a4a', color: '#cbd5e1' }}
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Objetivo</label>
                <div className="grid grid-cols-2 gap-2">
                  {WORKOUT_TYPES.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => updateWorkout('workout_type', value)}
                      className="py-2 px-3 rounded-xl text-sm font-semibold transition-all text-left"
                      style={{
                        background: parsedData.workout_type === value ? 'rgba(255,138,31,0.2)' : '#0f172a',
                        border: `1px solid ${parsedData.workout_type === value ? '#ff8a1f' : '#2a2a4a'}`,
                        color: parsedData.workout_type === value ? '#fdba74' : '#64748b',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats rápidos */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs px-3 py-1 rounded-full font-bold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  {parsedData.days.length} {parsedData.days.length === 1 ? 'dia' : 'dias'}
                </span>
                <span className="text-xs px-3 py-1 rounded-full font-bold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                  {parsedData.days.reduce((acc, d) => acc + (d.exercises?.length ?? 0), 0)} exercícios
                </span>
              </div>
            </div>

            {/* ── Dias e exercícios (editável) ── */}
            <div className="space-y-3">
              {parsedData.days.map((day, dayIdx) => (
                <div key={dayIdx} className="rounded-2xl overflow-hidden"
                  style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>

                  {/* Day Header */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-800"
                    onClick={() => toggleDay(dayIdx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)', color: 'white' }}>
                        {day.day}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white text-sm">Dia {day.day}</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{day.focus}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(255,138,31,0.14)', color: '#fdba74' }}>
                        {day.exercises?.length ?? 0} exerc.
                      </span>
                      {expandedDays.has(dayIdx)
                        ? <ChevronDown size={16} style={{ color: '#ff8a1f' }} />
                        : <ChevronRight size={16} style={{ color: '#ff8a1f' }} />
                      }
                    </div>
                  </button>

                  {/* Day Body */}
                  {expandedDays.has(dayIdx) && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Foco do dia (editável) */}
                      <div>
                        <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#475569' }}>Foco do dia</label>
                        <input
                          value={day.focus}
                          onChange={(e) => updateDay(dayIdx, 'focus', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                          style={{ background: '#0f172a', border: '1px solid #2a2a4a', color: '#cbd5e1' }}
                        />
                      </div>

                      {/* Exercícios */}
                      {(day.exercises ?? []).map((ex, exIdx) => (
                        <div key={exIdx} className="rounded-xl p-3 space-y-3"
                          style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                          {/* Cabeçalho do exercício */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ff8a1f' }}>
                              Exercício {exIdx + 1}
                            </span>
                            {day.exercises.length > 1 && (
                              <button
                                onClick={() => removeExercise(dayIdx, exIdx)}
                                className="p-1 rounded-lg transition-colors hover:bg-red-900/30"
                                style={{ color: '#ef4444' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Nome */}
                          <input
                            value={ex.name}
                            onChange={(e) => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                            placeholder="Nome do exercício"
                            className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none text-white"
                            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
                          />

                          {/* Grupo muscular */}
                          <select
                            value={ex.muscle_group}
                            onChange={(e) => updateExercise(dayIdx, exIdx, 'muscle_group', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', color: '#cbd5e1' }}
                          >
                            {MUSCLE_GROUPS.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>

                          {/* Séries / Reps / Descanso / Carga */}
                          <div className="grid grid-cols-4 gap-2">
                            {([
                              { field: 'sets', label: 'Séries' },
                              { field: 'reps', label: 'Reps' },
                              { field: 'rest_seconds', label: 'Desc.(s)' },
                              { field: 'weight_kg', label: 'Carga(kg)' },
                            ] as const).map(({ field, label }) => (
                              <div key={field}>
                                <label className="block text-xs mb-1 text-center" style={{ color: '#475569' }}>{label}</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={(ex[field] as number | undefined) ?? ''}
                                  onChange={(e) => updateExercise(dayIdx, exIdx, field, e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none text-white"
                                  style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Error on confirm */}
            {error && (
              <div className="flex gap-3 p-4 rounded-lg"
                style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444' }}>
                <AlertCircle size={20} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <p className="font-bold text-white">Erro ao importar</p>
                  <p className="text-sm mt-1" style={{ color: '#cbd5e1' }}>{error.message}</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="pt-2">
              <button
                disabled={loading || !parsedData.name.trim()}
                onClick={handleImport}
                style={{
                  background: loading || !parsedData.name.trim() ? '#4b5563' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: loading || !parsedData.name.trim() ? '#9ca3af' : '#fff',
                }}
                className="w-full px-4 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed text-lg"
              >
                <Upload size={20} />
                {loading ? 'Importando...' : 'Importar Treino'}
              </button>
              <p className="text-xs text-center mt-2" style={{ color: '#475569' }}>
                Use a seta no topo para voltar e colar um novo JSON
              </p>
            </div>
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === 'success' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-block p-4 rounded-full mb-4" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle size={48} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Treino Importado!</h2>
              <p style={{ color: '#94a3b8' }} className="text-sm">{successData?.message}</p>
            </div>

            {/* Treinos Criados */}
            {successData?.workouts && successData.workouts.length > 0 && (
              <div className="p-4 rounded-lg"
                style={{ background: 'rgba(30, 41, 59, 1)', borderLeft: '4px solid #10b981' }}>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Treinos criados</p>
                    <p className="font-bold text-white">{successData.workouts.length} treino(s), separados por dia</p>
                  </div>
                  {successData.workouts.map((workout) => (
                    <div key={workout.id} className="rounded-lg p-3" style={{ background: '#0f172a' }}>
                      <p className="font-bold text-white">{workout.name}</p>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                        {workout.workout_type_display} · {workout.total_exercises} exercícios
                      </p>
                      {workout.description && (
                        <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>{workout.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => navigate('/workouts')}
                className="flex-1 px-4 py-3 rounded-lg font-bold transition-colors"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}
              >
                Ver Meus Treinos
              </button>
              <button
                onClick={() => { setStep('input'); setJsonInput(''); setSuccessData(null); setError(null); }}
                className="flex-1 px-4 py-3 rounded-lg font-bold transition-colors"
                style={{ background: '#334155', color: '#cbd5e1' }}
              >
                Importar Outro
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
