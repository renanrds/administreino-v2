import type { User, WorkoutType } from '../types';
import { WORKOUT_TYPE_LABELS } from '../types';

export type EquipmentId = 'full' | 'minimal' | 'bodyweight';
export type ExperienceId = 'beginner' | 'intermediate' | 'advanced';
export type WeekdayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAYS: { id: WeekdayId; label: string; short: string }[] = [
  { id: 'mon', label: 'Segunda', short: 'Seg' },
  { id: 'tue', label: 'Terça', short: 'Ter' },
  { id: 'wed', label: 'Quarta', short: 'Qua' },
  { id: 'thu', label: 'Quinta', short: 'Qui' },
  { id: 'fri', label: 'Sexta', short: 'Sex' },
  { id: 'sat', label: 'Sábado', short: 'Sáb' },
  { id: 'sun', label: 'Domingo', short: 'Dom' },
];

export const SPLIT_TYPES = [
  { id: 'A', label: 'Treino A (Full Body / 1 dia)', days: 1, dayLabels: ['A'] },
  { id: 'AB', label: 'Treino A/B (2 dias)', days: 2, dayLabels: ['A', 'B'] },
  { id: 'ABC', label: 'Treino A/B/C (3 dias)', days: 3, dayLabels: ['A', 'B', 'C'] },
  { id: 'ABCD', label: 'Treino A/B/C/D (4 dias)', days: 4, dayLabels: ['A', 'B', 'C', 'D'] },
  { id: 'ABCDE', label: 'Treino A/B/C/D/E (5 dias)', days: 5, dayLabels: ['A', 'B', 'C', 'D', 'E'] },
  { id: 'ABCDEF', label: 'Treino A/B/C/D/E/F (6 dias)', days: 6, dayLabels: ['A', 'B', 'C', 'D', 'E', 'F'] },
  { id: 'PPL', label: 'Push/Pull/Legs (3 dias)', days: 3, dayLabels: ['Push', 'Pull', 'Legs'] },
  { id: 'PPLPPL', label: 'Push/Pull/Legs (6 dias)', days: 6, dayLabels: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'] },
] as const;

export type SplitId = (typeof SPLIT_TYPES)[number]['id'];

export const GENDER_LABELS: Record<NonNullable<User['gender']>, string> = {
  male: 'Masculino',
  female: 'Feminino',
  non_binary: 'Não-binário',
  other: 'Outro',
  prefer_not_to_say: 'Prefiro não informar',
  '': '',
};

export const EXPERIENCE_LABELS: Record<ExperienceId, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  full: 'Academia completa (barra, halteres, máquinas, polias)',
  minimal: 'Equipamento mínimo (halteres e barras)',
  bodyweight: 'Corpo livre / materiais básicos',
};

export type PromptBuilderInput = {
  splitType: SplitId;
  objectives: WorkoutType[];
  experience: ExperienceId;
  durationMinutes: number;
  equipment: EquipmentId;
  notes: string;
  weekdays: WeekdayId[];
  user: User | null;
};

function getSplit(splitType: SplitId) {
  return SPLIT_TYPES.find((s) => s.id === splitType) ?? SPLIT_TYPES[2];
}

function computeBmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}

function bmiHint(bmi: number): string {
  if (bmi < 18.5) return 'abaixo do peso — priorizar ganho de massa com déficit calórico negativo a evitar';
  if (bmi < 25) return 'faixa adequada — manter progressão sustentável';
  if (bmi < 30) return 'sobrepeso — considerar composição corporal e condicionamento base';
  return 'obesidade — priorizar técnica, impacto articular baixo e progressão gradual';
}

function volumeGuidance(durationMinutes: number): string {
  if (durationMinutes <= 45) {
    return 'Sessão curta (≤45 min): 4–6 exercícios/dia, 2–3 séries nos compostos, priorizar densidade.';
  }
  if (durationMinutes <= 60) {
    return 'Sessão média (46–60 min): 5–8 exercícios/dia, 3–4 séries nos compostos.';
  }
  if (durationMinutes <= 90) {
    return 'Sessão longa (61–90 min): 6–10 exercícios/dia, volume moderado-alto com recuperação adequada.';
  }
  return 'Sessão muito longa (>90 min): 8–12 exercícios/dia, evitar volume excessivo que prejudique a recuperação.';
}

function levelStrategy(experience: ExperienceId): string {
  if (experience === 'advanced') {
    return 'Para avançado: low volume relativo (menos exercícios por sessão), alta intensidade, foco em compostos, 1–2 isoladores estratégicos e controle de fadiga.';
  }
  if (experience === 'beginner') {
    return 'Para iniciante: técnica e aprendizado motor primeiro, volume moderado, evitar falha em todas as séries, padrões de movimento básicos.';
  }
  return 'Para intermediário: progressão linear/ondulatória moderada com equilíbrio entre volume e intensidade.';
}

function buildDaysJsonExample(dayLabels: readonly string[], primaryObjective: WorkoutType): string {
  const days = dayLabels.map((day, index) => {
    const focusHint =
      day === 'Push'
        ? 'Peito, Ombros e Tríceps'
        : day === 'Pull'
          ? 'Costas e Bíceps'
          : day === 'Legs'
            ? 'Pernas e Glúteos'
            : `Foco muscular do Dia ${day}`;
    return `    {
      "day": "${day}",
      "sequence_order": ${index + 1},
      "focus": "${focusHint}",
      "exercises": [
        {
          "name": "Nome do Exercício em Português",
          "muscle_group": "chest|back|shoulders|biceps|triceps|legs|glutes|abs|calves|forearms|full_body|cardio",
          "sets": 3,
          "reps": "${primaryObjective === 'strength' ? '4-6' : primaryObjective === 'endurance' ? '12-15' : '8-10'}",
          "rest_seconds": ${primaryObjective === 'strength' ? 150 : primaryObjective === 'endurance' || primaryObjective === 'hiit' ? 45 : 90},
          "weight_kg": null,
          "notes": "Opcional: execução, tempo sob tensão, cuidado com lesão"
        }
      ]
    }${index < dayLabels.length - 1 ? ',' : ''}`;
  });
  return days.join('\n');
}

function suggestSplitForDays(daysPerWeek: number): SplitId {
  if (daysPerWeek <= 1) return 'A';
  if (daysPerWeek === 2) return 'AB';
  if (daysPerWeek === 3) return 'ABC';
  if (daysPerWeek === 4) return 'ABCD';
  if (daysPerWeek === 5) return 'ABCDE';
  return 'ABCDEF';
}

export function suggestSplitId(daysPerWeek: number): SplitId {
  return suggestSplitForDays(daysPerWeek);
}

export function buildWorkoutPrompt(input: PromptBuilderInput): string {
  const split = getSplit(input.splitType);
  const primary = input.objectives[0] ?? 'hypertrophy';
  const secondary = input.objectives.slice(1);
  const primaryLabel = WORKOUT_TYPE_LABELS[primary];
  const secondaryLabels = secondary.map((t) => WORKOUT_TYPE_LABELS[t]);
  const duration = Math.max(20, Math.min(180, Number(input.durationMinutes) || 60));
  const user = input.user;

  const weekdayLabels = input.weekdays
    .map((id) => WEEKDAYS.find((d) => d.id === id)?.label)
    .filter(Boolean) as string[];

  const daysPerWeek =
    weekdayLabels.length > 0
      ? weekdayLabels.length
      : user?.weekly_training_days || split.days;

  const bmi = computeBmi(
    user?.weight != null ? Number(user.weight) : null,
    user?.height != null ? Number(user.height) : null,
  );

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    || user?.username
    || null;

  const profileLines: string[] = [];
  if (displayName) profileLines.push(`- **Nome**: ${displayName}`);
  if (user?.gender && user.gender !== 'prefer_not_to_say' && GENDER_LABELS[user.gender]) {
    profileLines.push(`- **Gênero**: ${GENDER_LABELS[user.gender]}`);
  }
  if (user?.age) profileLines.push(`- **Idade**: ${user.age} anos`);
  if (user?.weight) profileLines.push(`- **Peso**: ${user.weight} kg`);
  if (user?.height) profileLines.push(`- **Altura**: ${user.height} cm`);
  if (bmi != null) profileLines.push(`- **IMC aproximado**: ${bmi} (${bmiHint(bmi)})`);
  if (user?.experience_level) {
    profileLines.push(
      `- **Nível no perfil**: ${EXPERIENCE_LABELS[user.experience_level as ExperienceId] || user.experience_level}`,
    );
  }
  if (user?.primary_goal) {
    profileLines.push(`- **Objetivo textual do perfil**: ${user.primary_goal}`);
  }
  if (user?.weekly_training_days) {
    profileLines.push(`- **Dias/semana cadastrados no perfil**: ${user.weekly_training_days}`);
  }
  if (user?.bio?.trim()) {
    profileLines.push(`- **Bio / contexto**: ${user.bio.trim()}`);
  }
  if (user?.gym_app_preference && user.gym_app_preference !== 'none') {
    const gymLabel =
      user.gym_app_preference === 'both'
        ? 'Wellhub + TotalPass'
        : user.gym_app_preference === 'wellhub'
          ? 'Wellhub'
          : 'TotalPass';
    profileLines.push(`- **App de academia**: ${gymLabel} (provável treino em academia convencional)`);
  }

  const splitMismatch =
    daysPerWeek !== split.days
      ? `- **Atenção de calendário**: o aluno pretende treinar ~${daysPerWeek}x/semana, mas o split escolhido tem ${split.days} sessões. Priorize o split escolhido e oriente como encaixar na semana (ex.: repetir ciclo ou deixar dias de descanso).`
      : '';

  const weekdayBlock = weekdayLabels.length
    ? `- **Dias da semana pretendidos**: ${weekdayLabels.join(', ')} (${weekdayLabels.length} dias)`
    : user?.weekly_training_days
      ? `- **Frequência desejada**: ${user.weekly_training_days} dias por semana (dias específicos não informados)`
      : `- **Frequência**: alinhar ao split de ${split.days} sessões/semana`;

  const secondaryBlock = secondaryLabels.length
    ? `- **Objetivos secundários** (ordem de prioridade): ${secondaryLabels.join(', ')}`
    : '';

  const restGuide =
    primary === 'strength'
      ? 'Força: 120–180s'
      : primary === 'hypertrophy'
        ? 'Hipertrofia: 60–120s'
        : primary === 'endurance' || primary === 'cardio' || primary === 'hiit'
          ? 'Resistência/HIIT/Cardio: 30–60s'
          : 'Flexibilidade/Funcional: 45–90s conforme o exercício';

  return `Você é um personal trainer brasileiro especializado em programas de treino personalizados para academia.

Crie um programa de treino com as especificações abaixo e retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois).

════════════════════════════════════
ESPECIFICAÇÕES DO PROGRAMA
════════════════════════════════════
- **Split**: ${split.label} (${split.days} sessões no ciclo)
- **Labels dos dias no JSON**: ${split.dayLabels.join(', ')}
- **Objetivo principal**: ${primaryLabel} (campo workout_type = "${primary}")
${secondaryBlock ? `${secondaryBlock}\n` : ''}- **Nível usado neste pedido**: ${EXPERIENCE_LABELS[input.experience]}
- **Duração por sessão**: ~${duration} minutos
- **Equipamento**: ${EQUIPMENT_LABELS[input.equipment]}
${weekdayBlock}
${splitMismatch ? `${splitMismatch}\n` : ''}${input.notes.trim() ? `- **Observações / restrições do aluno**: ${input.notes.trim()}\n` : ''}${profileLines.length ? `
════════════════════════════════════
PERFIL DO ALUNO (usar para personalizar cargas, volume e progressão)
════════════════════════════════════
${profileLines.join('\n')}
` : ''}
════════════════════════════════════
FORMATO DE SAÍDA (JSON PURO)
════════════════════════════════════
O JSON deve ter exatamente esta estrutura (preencha TODOS os dias do split: ${split.dayLabels.join(', ')}):

{
  "name": "Nome curto do programa",
  "description": "1–2 frases sobre o programa e para quem é",
  "workout_type": "${primary}",
  "days": [
${buildDaysJsonExample(split.dayLabels, primary)}
  ]
}

ORDEM DE TREINAMENTO (obrigatório):
- A ordem do array "days" É a sequência de treino (1º, 2º, 3º…).
- Cada dia DEVE ter "sequence_order" inteiro começando em 1 (ex.: Dia A=1, Dia B=2, Dia C=3).
- Não pule números e não repita sequence_order.
- Essa ordem define o "próximo treino recomendado" no app após cada sessão concluída.

Campos obrigatórios por dia: day, sequence_order, exercises.
Campos obrigatórios por exercício: name, muscle_group, sets, reps, rest_seconds.
- "reps" pode ser número (10) ou intervalo string ("8-10").
- "weight_kg" e "notes" são opcionais (use null se não houver carga sugerida).
- "muscle_group" deve ser exatamente um de: chest, back, shoulders, biceps, triceps, legs, glutes, abs, calves, forearms, full_body, cardio.

════════════════════════════════════
DIRETRIZES DE MONTAGEM
════════════════════════════════════
- ${volumeGuidance(duration)}
- ${levelStrategy(input.experience)}
- Compostos primeiro, isolados depois; progressão lógica entre dias (respeitando sequence_order).
- Descanso alinhado ao objetivo principal (${restGuide}).
- Priorize o objetivo principal na seleção de exercícios e no volume${secondaryLabels.length ? `; incorpore secundários (${secondaryLabels.join(', ')}) sem comprometer o principal` : ''}.
- Nomes de exercícios SEMPRE em português do Brasil, nomes comuns de academia (ex.: "Supino Reto", "Remada Curvada", "Agachamento Livre", "Leg Press 45°", "Puxada Frontal"). Sem inglês.
- Sugira cargas (weight_kg) realistas quando fizer sentido para o perfil; se idade/peso/nível sugerirem cautela, use cargas conservadoras ou null.
${input.equipment === 'bodyweight' ? '- Apenas exercícios de peso corporal ou equipamento mínimo doméstico.\n' : ''}${input.equipment === 'minimal' ? '- Adaptar para barras/halteres; evitar máquinas específicas.\n' : ''}- Considere recuperação entre grupos musculares nos dias consecutivos do split.
- Se houver restrição nas observações (lesão, dor, gravidez, etc.), adapte ou substitua exercícios de risco.

IMPORTANTE: responda somente com o JSON, indentação de 2 espaços, sem blocos \`\`\` e sem comentários.`;
}

/** Campos do perfil que enriquecem o prompt — útil para avisar o usuário o que falta. */
export function getMissingProfileHints(user: User | null): string[] {
  const missing: string[] = [];
  if (!user) return ['Faça login e complete o perfil'];
  if (!user.weight) missing.push('peso');
  if (!user.height) missing.push('altura');
  if (!user.age) missing.push('idade');
  if (!user.weekly_training_days) missing.push('dias/semana');
  if (!user.experience_level) missing.push('nível');
  if (!user.primary_goal) missing.push('objetivo no perfil');
  return missing;
}
