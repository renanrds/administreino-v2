import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Copy, Download, Brain, Zap, Target, ExternalLink
} from 'lucide-react';
import type { WorkoutType } from '../types';
import { WORKOUT_TYPE_LABELS } from '../types';

const WORKOUT_TYPES = Object.entries(WORKOUT_TYPE_LABELS) as [WorkoutType, string][];

const SPLIT_TYPES = [
  { id: 'A', label: 'Treino A (Full Body / 1 dia)' },
  { id: 'AB', label: 'Treino A/B (2 dias)' },
  { id: 'ABC', label: 'Treino A/B/C (3 dias)' },
  { id: 'ABCD', label: 'Treino A/B/C/D (4 dias)' },
  { id: 'ABCDE', label: 'Treino A/B/C/D/E (5 dias)' },
  { id: 'ABCDEF', label: 'Treino A/B/C/D/E/F (6 dias)' },
  { id: 'PPL', label: 'Push/Pull/Legs (3 dias)' },
  { id: 'PPLPPL', label: 'Push/Pull/Legs (6 dias)' },
];

export default function PromptGeneratorPage() {
  const navigate = useNavigate();
  const [splitType, setSplitType] = useState('ABC');
  const [objective, setObjective] = useState<WorkoutType>('hypertrophy');
  const [experience, setExperience] = useState('intermediate');
  const [duration, setDuration] = useState('60');
  const [equipment, setEquipment] = useState('full');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const generatePrompt = (): string => {
    const objectiveLabel = WORKOUT_TYPE_LABELS[objective];
    
    const equipmentDesc = equipment === 'full' 
      ? 'completo (barra, halteres, máquinas, polias)'
      : equipment === 'minimal'
      ? 'mínimo (apenas halteres e barras)'
      : 'corpo livre e materiais básicos';

    const experienceDesc = experience === 'beginner'
      ? 'iniciante'
      : experience === 'intermediate'
      ? 'intermediário'
      : 'avançado';

    const splitDays = splitType.length === 1 ? '1 dia' : `${splitType.length} dias`;
    const splitLabel = SPLIT_TYPES.find(s => s.id === splitType)?.label || splitType;

    return `Você é um personal trainer especializado em criação de programas de treino personalizados.

Preciso que você crie um programa de treino com as seguintes especificações:

📋 ESPECIFICAÇÕES DO TREINO:
- **Split**: ${splitLabel} (${splitDays} de treino)
- **Objetivo Principal**: ${objectiveLabel}
- **Nível de Experiência**: ${experienceDesc}
- **Duração por Sessão**: aproximadamente ${duration} minutos
- **Equipamento Disponível**: ${equipmentDesc}
${notes ? `- **Observações Especiais**: ${notes}` : ''}

🎯 INSTRUÇÕES DE RESPOSTA:

Retorne EXATAMENTE no seguinte formato JSON, sem explicações adicionais:

\`\`\`json
{
  "name": "Nome do Treino ${splitType}",
  "description": "Descrição breve do programa",
  "workout_type": "${objective}",
  "days": [
    {
      "day": "A",
      "focus": "Focos musculares do dia A",
      "exercises": [
        {
          "name": "Nome do Exercício",
          "muscle_group": "chest|back|shoulders|biceps|triceps|legs|glutes|abs|calves|forearms|full_body|cardio",
          "sets": 3,
          "reps": 10,
          "rest_seconds": 60,
          "weight_kg": 50,
          "notes": "Opcional: observações sobre a execução"
        }
      ]
    }
  ]
}
\`\`\`

📝 DIRETRIZES:
- Cada dia deve ter entre 5-12 exercícios
- Progressão lógica: compostos primeiro, isolados depois
- Rest periods apropriados para o objetivo (Força: 120-180s, Hipertrofia: 60-90s, Resistência: 30-45s)
- Volume e intensidade adequados ao nível de experiência
- Variedade de exercícios dentro dos grupos musculares
- Considerar a recuperação entre grupos musculares
- **Nomes dos exercícios**: sempre em PORTUGUÊS do Brasil, o nome mais comum utilizado em academias brasileiras (ex: "Supino Reto", "Rosca Direta", "Leg Press 45°", "Puxada Frontal", "Cadeira Extensora"). Não use tradução literal do inglês.
${equipment === 'minimal' ? '\n- Adaptar exercícios para o equipamento limitado disponível' : ''}

⚠️ IMPORTANTE:
- Retorne APENAS o JSON com indentação de 2 espaços, SEM blocos de código markdown (não use as \`\`\`json)
- Os muscle_group devem ser exatamente um dos valores listados acima
- Use números realistas para sets, reps e rest_seconds
- Se não conseguir criar um treino viável com as especificações, retorne um treino padrão bem estruturado`;
  };

  const prompt = generatePrompt();

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

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a' }}>
      {/* Header */}
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
            <p className="text-xs" style={{ color: '#94a3b8' }}>Crie treinos com IA</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {!showPrompt ? (
          // Formulário
          <div className="space-y-6">
            {/* Split Type */}
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
                      border: splitType === split.id ? '1px solid #ff8a1f' : '1px solid #3a3a5a'
                    }}
                  >
                    <div className="font-black">{split.id}</div>
                    <div className="text-xs mt-1 opacity-75">{split.label.split('(')[1]?.replace(')', '')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Objective */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} style={{ color: '#10b981' }} />
                <label className="text-sm font-bold text-white">Objetivo Principal</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {WORKOUT_TYPES.map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setObjective(type)}
                    className="p-3 rounded-xl text-sm font-semibold transition-all text-left"
                    style={{
                      background: objective === type ? '#10b981' : '#2a2a4a',
                      color: objective === type ? 'white' : '#94a3b8',
                      border: objective === type ? '1px solid #10b981' : '1px solid #3a3a5a'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience & Duration */}
            <div className="grid grid-cols-2 gap-3">
              {/* Experience */}
              <div className="rounded-2xl p-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Experiência</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-semibold outline-none"
                  style={{ background: '#2a2a4a', color: 'white', border: '1px solid #3a3a5a' }}
                >
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                </select>
              </div>

              {/* Duration */}
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
                {[
                  { id: 'full', label: 'Completo' },
                  { id: 'minimal', label: 'Mínimo' },
                  { id: 'bodyweight', label: 'Corpo Livre' }
                ].map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => setEquipment(eq.id)}
                    className="p-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: equipment === eq.id ? '#ff5a00' : '#2a2a4a',
                      color: equipment === eq.id ? 'white' : '#94a3b8',
                      border: equipment === eq.id ? '1px solid #ff5a00' : '1px solid #3a3a5a'
                    }}
                  >
                    {eq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Observações (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Tenho lesão no ombro, treino 4x/semana, quero ganhar massa..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#2a2a4a', color: 'white', border: '1px solid #3a3a5a' }}
                rows={3}
              />
            </div>

            {/* Botão Gerar */}
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
          // Exibição do Prompt
          <div className="space-y-4">
            {/* Resumo */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <h2 className="text-lg font-black text-white mb-3">Resumo das Configurações</h2>
              <div className="space-y-2 text-sm" style={{ color: '#cbd5e1' }}>
                <p><strong>Split:</strong> {SPLIT_TYPES.find(s => s.id === splitType)?.label}</p>
                <p><strong>Objetivo:</strong> {WORKOUT_TYPE_LABELS[objective]}</p>
                <p><strong>Experiência:</strong> {experience === 'beginner' ? 'Iniciante' : experience === 'intermediate' ? 'Intermediário' : 'Avançado'}</p>
                <p><strong>Duração:</strong> {duration} min</p>
                <p><strong>Equipamento:</strong> {equipment === 'full' ? 'Completo' : equipment === 'minimal' ? 'Mínimo' : 'Corpo Livre'}</p>
              </div>
            </div>

            {/* Prompt Box */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <h3 className="text-sm font-bold text-white mb-4">Prompt para IA</h3>
              <div className="relative">
                <pre
                  className="w-full p-4 rounded-xl text-xs overflow-x-auto"
                  style={{
                    background: '#0f0f1a',
                    color: '#94a3b8',
                    border: '1px solid #2a2a4a',
                    maxHeight: '400px'
                  }}
                >
                  {prompt}
                </pre>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-2 right-2 p-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: '#2a2a4a' }}
                  title="Copiar para clipboard"
                >
                  <Copy size={16} style={{ color: '#10b981' }} />
                </button>
              </div>
              {copied && (
                <p className="text-xs mt-2" style={{ color: '#10b981' }}>✓ Copiado para clipboard!</p>
              )}
            </div>

            {/* Instruções */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,138,31,0.1)', border: '1px solid rgba(255,138,31,0.2)' }}>
              <h3 className="text-sm font-bold text-white mb-3">📋 Como Usar</h3>
              <ol className="text-xs space-y-2" style={{ color: '#cbd5e1' }}>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: '#ff8a1f' }}>1.</span>
                  <span>Copie o prompt usando o botão acima</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: '#ff8a1f' }}>2.</span>
                  <span>Cole em uma das IAs abaixo e envie</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: '#ff8a1f' }}>3.</span>
                  <span>A IA retornará um JSON — copie a resposta completa</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: '#ff8a1f' }}>4.</span>
                  <span>Clique em "Importar Treino" e cole o JSON para revisar e importar</span>
                </li>
              </ol>
            </div>

            {/* AI Provider Links */}
            <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <h3 className="text-sm font-bold text-white mb-3">Abrir IA e colar o prompt</h3>
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
              <p className="text-xs mt-2" style={{ color: '#475569' }}>Abre em nova aba — cole o prompt copiado</p>
            </div>

            {/* Botões de Ação */}
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
              {/* Instruções */}
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderLeft: '4px solid #22c55e' }} className="p-4 rounded-lg mt-6 space-y-2">
                <h3 className="font-bold text-white text-sm">Próximos passos:</h3>
                <ol className="text-sm space-y-1" style={{ color: '#cbd5e1' }}>
                  <li>1. Copie o prompt acima</li>
                  <li>2. Cole em ChatGPT, Claude ou outro IA</li>
                  <li>3. Copie a resposta em JSON</li>
                  <li>4. Clique em "Importar Treino" para adicionar ao app</li>
                </ol>
              </div>

              {/* Botão Importar */}
              <button
                onClick={() => navigate('/workouts/importar')}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
              >
                📥 Importar Treino
              </button>
          </div>
        )}
      </div>
    </div>
  );
}
