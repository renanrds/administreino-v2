import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Copy, Download, Brain, Zap, Target, ExternalLink, UserRound, CalendarDays,
} from 'lucide-react';
import type { User, WorkoutType } from '../types';
import { WORKOUT_TYPE_LABELS } from '../types';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import {
  SPLIT_TYPES,
  WEEKDAYS,
  EXPERIENCE_LABELS,
  EQUIPMENT_LABELS,
  buildWorkoutPrompt,
  getMissingProfileHints,
  suggestSplitId,
  type EquipmentId,
  type ExperienceId,
  type SplitId,
  type WeekdayId,
} from '../lib/buildWorkoutPrompt';

const WORKOUT_TYPES = Object.entries(WORKOUT_TYPE_LABELS) as [WorkoutType, string][];

export default function PromptGeneratorPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);
  const [profileLoading, setProfileLoading] = useState(true);

  const [splitType, setSplitType] = useState<SplitId>('ABC');
  const [objectives, setObjectives] = useState<WorkoutType[]>(['hypertrophy']);
  const [experience, setExperience] = useState<ExperienceId>(
    (user?.experience_level as ExperienceId) || 'intermediate',
  );
  const [duration, setDuration] = useState('60');
  const [equipment, setEquipment] = useState<EquipmentId>('full');
  const [weekdays, setWeekdays] = useState<WeekdayId[]>([]);
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [profileHydrated, setProfileHydrated] = useState(false);

  const primaryObjective = objectives[0] ?? 'hypertrophy';
  const secondaryObjectives = objectives.slice(1);
  const activeProfile = profile || user;
  const missingHints = getMissingProfileHints(activeProfile);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    api.get('/auth/profile/')
      .then((r) => {
        if (cancelled) return;
        const data = r.data as User;
        setProfile(data);
        updateUser(data);

        if (!profileHydrated) {
          if (data.experience_level === 'beginner' || data.experience_level === 'intermediate' || data.experience_level === 'advanced') {
            setExperience(data.experience_level);
          }
          if (data.weekly_training_days && data.weekly_training_days >= 1 && data.weekly_training_days <= 6) {
            setSplitType(suggestSplitId(data.weekly_training_days));
          }
          if (data.primary_goal) {
            const goalLower = data.primary_goal.toLowerCase();
            const matched = (Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]).filter((key) => {
              const label = WORKOUT_TYPE_LABELS[key].toLowerCase();
              return goalLower.includes(label) || goalLower.includes(key);
            });
            if (matched.length) setObjectives(matched);
          }
          setProfileHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(user);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from profile fetch
  }, []);

  const toggleObjective = (type: WorkoutType) => {
    setObjectives((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const toggleWeekday = (id: WeekdayId) => {
    setWeekdays((prev) => {
      const next = prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id];
      // Keep calendar order (Mon→Sun)
      return WEEKDAYS.map((d) => d.id).filter((dayId) => next.includes(dayId));
    });
  };

  const prompt = useMemo(
    () =>
      buildWorkoutPrompt({
        splitType,
        objectives,
        experience,
        durationMinutes: Number(duration) || 60,
        equipment,
        notes,
        weekdays,
        user: activeProfile,
      }),
    [splitType, objectives, experience, duration, equipment, notes, weekdays, activeProfile],
  );

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const downloadAsText = () => {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(prompt)}`);
    element.setAttribute('download', `prompt-treino-${splitType}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const splitMeta = SPLIT_TYPES.find((s) => s.id === splitType)!;

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a' }}>
      <div className="sticky top-0 z-30 px-4 py-4"
        style={{ background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2a2a4a' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workouts')}
            style={{ color: '#94a3b8' }}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Gerador de Prompts</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Prompt personalizado com dados do seu perfil</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {!showPrompt ? (
          <div className="space-y-6">
            {/* Perfil */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <UserRound size={20} style={{ color: '#60a5fa' }} />
                  <label className="text-sm font-bold text-white">Dados do perfil</label>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(96,165,250,0.15)', color: '#93c5fd' }}
                >
                  Editar perfil
                </button>
              </div>
              {profileLoading ? (
                <p className="text-xs" style={{ color: '#64748b' }}>Carregando perfil…</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#cbd5e1' }}>
                    <p><span style={{ color: '#64748b' }}>Peso:</span> {activeProfile?.weight ? `${activeProfile.weight} kg` : '—'}</p>
                    <p><span style={{ color: '#64748b' }}>Altura:</span> {activeProfile?.height ? `${activeProfile.height} cm` : '—'}</p>
                    <p><span style={{ color: '#64748b' }}>Idade:</span> {activeProfile?.age ?? '—'}</p>
                    <p><span style={{ color: '#64748b' }}>Dias/sem.:</span> {activeProfile?.weekly_training_days ?? '—'}</p>
                    <p className="col-span-2">
                      <span style={{ color: '#64748b' }}>Nível:</span>{' '}
                      {activeProfile?.experience_level
                        ? EXPERIENCE_LABELS[activeProfile.experience_level as ExperienceId] || activeProfile.experience_level
                        : '—'}
                    </p>
                    {activeProfile?.primary_goal && (
                      <p className="col-span-2">
                        <span style={{ color: '#64748b' }}>Objetivo no perfil:</span> {activeProfile.primary_goal}
                      </p>
                    )}
                  </div>
                  {missingHints.length > 0 && (
                    <p className="text-xs mt-3" style={{ color: '#fbbf24' }}>
                      Complete no perfil para personalizar mais: {missingHints.join(', ')}.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Split */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={20} style={{ color: '#f59e0b' }} />
                <label className="text-sm font-bold text-white">Tipo de Split</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SPLIT_TYPES.map((split) => (
                  <button
                    key={split.id}
                    onClick={() => setSplitType(split.id)}
                    className="p-3 rounded-xl text-sm font-semibold transition-all text-left"
                    style={{
                      background: splitType === split.id ? '#ff8a1f' : '#2a2a4a',
                      color: splitType === split.id ? 'white' : '#94a3b8',
                      border: splitType === split.id ? '1px solid #ff8a1f' : '1px solid #3a3a5a',
                    }}
                  >
                    <div className="font-black">{split.id}</div>
                    <div className="text-xs mt-1 opacity-75">{split.days} dia(s)</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Weekdays */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={20} style={{ color: '#a78bfa' }} />
                <label className="text-sm font-bold text-white">Dias da semana</label>
              </div>
              <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
                Quais dias você pretende treinar? (opcional, melhora o encaixe do split)
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = weekdays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      onClick={() => toggleWeekday(day.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: selected ? 'rgba(167,139,250,0.25)' : '#2a2a4a',
                        color: selected ? '#ddd6fe' : '#94a3b8',
                        border: `1px solid ${selected ? '#a78bfa' : '#3a3a5a'}`,
                      }}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              {weekdays.length > 0 && weekdays.length !== splitMeta.days && (
                <p className="text-xs mt-3" style={{ color: '#fbbf24' }}>
                  Você marcou {weekdays.length} dia(s), mas o split tem {splitMeta.days} sessão(ões). O prompt pedirá à IA para encaixar.
                </p>
              )}
            </div>

            {/* Objectives */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target size={20} style={{ color: '#10b981' }} />
                <label className="text-sm font-bold text-white">Objetivos</label>
              </div>
              <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
                Toque para selecionar. O primeiro vira o principal; os seguintes são secundários.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {WORKOUT_TYPES.map(([type, label]) => {
                  const index = objectives.indexOf(type);
                  const selected = index >= 0;
                  const isPrimary = index === 0;
                  return (
                    <button
                      key={type}
                      onClick={() => toggleObjective(type)}
                      className="p-3 rounded-xl text-sm font-semibold transition-all text-left"
                      style={{
                        background: selected
                          ? (isPrimary ? '#10b981' : 'rgba(16,185,129,0.35)')
                          : '#2a2a4a',
                        color: selected ? 'white' : '#94a3b8',
                        border: selected ? '1px solid #10b981' : '1px solid #3a3a5a',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{label}</span>
                        {selected && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              background: isPrimary ? 'rgba(0,0,0,0.25)' : 'rgba(16,185,129,0.35)',
                              color: isPrimary ? '#fff' : '#a7f3d0',
                            }}
                          >
                            {isPrimary ? 'Principal' : `${index + 1}º`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Experiência</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value as ExperienceId)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-semibold outline-none"
                  style={{ background: '#2a2a4a', color: 'white', border: '1px solid #3a3a5a' }}
                >
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                </select>
              </div>

              <div className="rounded-2xl p-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Duração (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-semibold outline-none text-white"
                  style={{ background: '#2a2a4a', border: '1px solid #3a3a5a' }}
                  min="30"
                  max="180"
                />
              </div>
            </div>

            {/* Equipment */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Equipamento</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'full' as const, label: 'Completo' },
                  { id: 'minimal' as const, label: 'Mínimo' },
                  { id: 'bodyweight' as const, label: 'Corpo Livre' },
                ]).map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => setEquipment(eq.id)}
                    className="p-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: equipment === eq.id ? '#ff5a00' : '#2a2a4a',
                      color: equipment === eq.id ? 'white' : '#94a3b8',
                      border: equipment === eq.id ? '1px solid #ff5a00' : '1px solid #3a3a5a',
                    }}
                  >
                    {eq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Observações / restrições</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: lesão no ombro, prefiro máquinas, sem agachamento livre, foco em glúteos…"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#2a2a4a', color: 'white', border: '1px solid #3a3a5a' }}
                rows={3}
              />
            </div>

            <button
              onClick={() => setShowPrompt(true)}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)', boxShadow: '0 4px 20px rgba(255,138,31,0.28)' }}
            >
              <Brain size={20} />
              Gerar Prompt para IA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <h2 className="text-lg font-black text-white mb-3">Resumo</h2>
              <div className="space-y-2 text-sm" style={{ color: '#cbd5e1' }}>
                <p><strong>Split:</strong> {splitMeta.label}</p>
                <p><strong>Objetivo principal:</strong> {WORKOUT_TYPE_LABELS[primaryObjective]}</p>
                {secondaryObjectives.length > 0 && (
                  <p>
                    <strong>Secundários:</strong>{' '}
                    {secondaryObjectives.map((t) => WORKOUT_TYPE_LABELS[t]).join(', ')}
                  </p>
                )}
                <p><strong>Experiência:</strong> {EXPERIENCE_LABELS[experience]}</p>
                <p><strong>Duração:</strong> {duration} min</p>
                <p><strong>Equipamento:</strong> {EQUIPMENT_LABELS[equipment].split('(')[0].trim()}</p>
                {weekdays.length > 0 && (
                  <p>
                    <strong>Dias:</strong>{' '}
                    {weekdays.map((id) => WEEKDAYS.find((d) => d.id === id)?.short).join(', ')}
                  </p>
                )}
                {activeProfile?.weight && activeProfile?.height && (
                  <p>
                    <strong>Perfil:</strong> {activeProfile.weight} kg · {activeProfile.height} cm
                    {activeProfile.age ? ` · ${activeProfile.age} anos` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <h3 className="text-sm font-bold text-white mb-4">Prompt para IA</h3>
              <div className="relative">
                <pre
                  className="w-full p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap"
                  style={{
                    background: '#0f0f1a',
                    color: '#94a3b8',
                    border: '1px solid #2a2a4a',
                    maxHeight: '400px',
                  }}
                >
                  {prompt}
                </pre>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-2 right-2 p-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: '#2a2a4a' }}
                  title="Copiar"
                >
                  <Copy size={16} style={{ color: '#10b981' }} />
                </button>
              </div>
              {copied && (
                <p className="text-xs mt-2" style={{ color: '#10b981' }}>Copiado!</p>
              )}
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,138,31,0.1)', border: '1px solid rgba(255,138,31,0.2)' }}>
              <h3 className="text-sm font-bold text-white mb-3">Como usar</h3>
              <ol className="text-xs space-y-2" style={{ color: '#cbd5e1' }}>
                <li>1. Copie o prompt</li>
                <li>2. Cole em ChatGPT, Claude, Gemini ou Copilot</li>
                <li>3. Copie o JSON da resposta (já inclui a ordem com sequence_order)</li>
                <li>4. Importe em Importar Treino</li>
              </ol>
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <h3 className="text-sm font-bold text-white mb-3">Abrir IA</h3>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { name: 'ChatGPT', url: 'https://chatgpt.com/', bg: '#10a37f', abbr: 'GPT' },
                  { name: 'Claude', url: 'https://claude.ai/', bg: '#c96442', abbr: 'Cld' },
                  { name: 'Gemini', url: 'https://gemini.google.com/', bg: '#4285f4', abbr: 'Gem' },
                  { name: 'Copilot', url: 'https://copilot.microsoft.com/', bg: '#0078d4', abbr: 'Cop' },
                ] as const).map((ai) => (
                  <a
                    key={ai.name}
                    href={ai.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-90 active:scale-95"
                    style={{ background: ai.bg }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0"
                      style={{ background: 'rgba(0,0,0,0.25)', color: 'white' }}>
                      {ai.abbr}
                    </div>
                    <span className="text-white font-bold text-sm flex-1">{ai.name}</span>
                    <ExternalLink size={13} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPrompt(false)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-300 transition-all"
                style={{ background: '#2a2a4a', border: '1px solid #3a3a5a' }}
              >
                Editar
              </button>
              <button
                onClick={downloadAsText}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: '#ff5a00' }}
              >
                <Download size={16} />
                Baixar
              </button>
              <button
                onClick={copyToClipboard}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <Copy size={16} />
                Copiar
              </button>
            </div>

            <button
              onClick={() => navigate('/workouts/importar')}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
            >
              Importar Treino
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
