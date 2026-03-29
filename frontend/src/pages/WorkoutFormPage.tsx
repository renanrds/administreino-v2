import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, GripVertical,
  Dumbbell, Timer, RotateCcw, Weight
} from 'lucide-react';
import api from '../services/api';
import type { Workout, MuscleGroup, WorkoutType } from '../types';
import { MUSCLE_GROUP_LABELS, WORKOUT_TYPE_LABELS } from '../types';

const MUSCLE_GROUPS = Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroup, string][];
const WORKOUT_TYPES = Object.entries(WORKOUT_TYPE_LABELS) as [WorkoutType, string][];

// Base de dados local para sugerir exercícios e autocompletar o grupo muscular
const SUGGESTED_EXERCISES: { name: string; muscle: MuscleGroup }[] = [
  // Peito
  { name: 'Supino Reto com Barra', muscle: 'chest' },
  { name: 'Supino Reto com Halteres', muscle: 'chest' },
  { name: 'Supino Inclinado com Barra', muscle: 'chest' },
  { name: 'Supino Inclinado com Halteres', muscle: 'chest' },
  { name: 'Crucifixo Reto', muscle: 'chest' },
  { name: 'Crucifixo Inclinado', muscle: 'chest' },
  { name: 'Crossover (Polia)', muscle: 'chest' },
  { name: 'Voador (Peck Deck)', muscle: 'chest' },
  { name: 'Flexão de Braço', muscle: 'chest' },

  // Costas
  { name: 'Puxada Frontal', muscle: 'back' },
  { name: 'Puxada Atrás', muscle: 'back' },
  { name: 'Remada Curvada com Barra', muscle: 'back' },
  { name: 'Remada Baixa (Triângulo)', muscle: 'back' },
  { name: 'Remada Unilateral (Serrote)', muscle: 'back' },
  { name: 'Remada Máquina', muscle: 'back' },
  { name: 'Levantamento Terra', muscle: 'back' },
  { name: 'Barra Fixa', muscle: 'back' },

  // Ombros
  { name: 'Desenvolvimento com Halteres', muscle: 'shoulders' },
  { name: 'Desenvolvimento com Barra', muscle: 'shoulders' },
  { name: 'Desenvolvimento Máquina', muscle: 'shoulders' },
  { name: 'Elevação Lateral', muscle: 'shoulders' },
  { name: 'Elevação Frontal', muscle: 'shoulders' },
  { name: 'Crucifixo Inverso', muscle: 'shoulders' },
  { name: 'Encolhimento de Ombros', muscle: 'shoulders' },

  // Bíceps
  { name: 'Rosca Direta com Barra', muscle: 'biceps' },
  { name: 'Rosca Alternada', muscle: 'biceps' },
  { name: 'Rosca Martelo', muscle: 'biceps' },
  { name: 'Rosca Scott', muscle: 'biceps' },
  { name: 'Rosca Concentrada', muscle: 'biceps' },
  { name: 'Rosca na Polia', muscle: 'biceps' },

  // Tríceps
  { name: 'Tríceps Pulley (Corda)', muscle: 'triceps' },
  { name: 'Tríceps Pulley (Barra)', muscle: 'triceps' },
  { name: 'Tríceps Testa', muscle: 'triceps' },
  { name: 'Tríceps Francês', muscle: 'triceps' },
  { name: 'Tríceps Banco', muscle: 'triceps' },
  { name: 'Tríceps Coice', muscle: 'triceps' },

  // Pernas
  { name: 'Agachamento Livre', muscle: 'legs' },
  { name: 'Agachamento Smith', muscle: 'legs' },
  { name: 'Leg Press 45º', muscle: 'legs' },
  { name: 'Cadeira Extensora', muscle: 'legs' },
  { name: 'Cadeira Flexora', muscle: 'legs' },
  { name: 'Mesa Flexora', muscle: 'legs' },
  { name: 'Stiff', muscle: 'legs' },
  { name: 'Avanço / Passada', muscle: 'legs' },
  { name: 'Cadeira Abdutora', muscle: 'legs' },
  { name: 'Cadeira Adutora', muscle: 'legs' },

  // Glúteos
  { name: 'Elevação Pélvica', muscle: 'glutes' },
  { name: 'Glúteo na Polia', muscle: 'glutes' },
  { name: 'Glúteo 4 Apoios', muscle: 'glutes' },

  // Panturrilha
  { name: 'Panturrilha em Pé', muscle: 'calves' },
  { name: 'Panturrilha Sentado (Máquina)', muscle: 'calves' },
  { name: 'Panturrilha no Leg Press', muscle: 'calves' },

  // Abdômen
  { name: 'Abdominal Supra (Crunch)', muscle: 'abs' },
  { name: 'Abdominal Infra', muscle: 'abs' },
  { name: 'Abdominal Oblíquo', muscle: 'abs' },
  { name: 'Prancha Isométrica', muscle: 'abs' },
  { name: 'Abdominal na Máquina', muscle: 'abs' },

  // Antebraço
  { name: 'Rosca Inversa', muscle: 'forearms' },
  { name: 'Flexão de Punho', muscle: 'forearms' },

  // Cardio / Outros
  { name: 'Esteira', muscle: 'cardio' },
  { name: 'Bicicleta Ergométrica', muscle: 'cardio' },
  { name: 'Elíptico', muscle: 'cardio' },
  { name: 'Pular Corda', muscle: 'cardio' }
];

interface ExerciseForm {
  id?: number;
  name: string;
  muscle_group: MuscleGroup;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_kg: string;
  notes: string;
  order: number;
}

const defaultExercise = (): ExerciseForm => ({
  name: '', muscle_group: 'chest', sets: 3, reps: 12,
  rest_seconds: 60, weight_kg: '', notes: '', order: 0
});

export default function WorkoutFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('hypertrophy');
  const [exercises, setExercises] = useState<ExerciseForm[]>([defaultExercise()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estado para controlar qual input de exercício está com foco para exibir as sugestões
  const [focusedExerciseIndex, setFocusedExerciseIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/workouts/${id}/`).then((r) => {
        const w: Workout = r.data;
        setName(w.name);
        setDescription(w.description || '');
        setWorkoutType(w.workout_type);
        setExercises(w.exercises.map((e) => ({
          id: e.id, name: e.name, muscle_group: e.muscle_group,
          sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds,
          weight_kg: e.weight_kg?.toString() || '', notes: e.notes || '',
          order: e.order
        })));
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const addExercise = () => {
    setExercises([...exercises, { ...defaultExercise(), order: exercises.length }]);
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, field: keyof ExerciseForm, value: any) => {
    setExercises(exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  // Função dedicada para lidar com a mudança do nome e auto-detectar o grupo muscular
  const handleNameChange = (idx: number, newName: string) => {
    const updated = [...exercises];
    updated[idx].name = newName;

    // Se o que for digitado for idêntico a um da base, preenche o grupo muscular automaticamente
    const matchedExercise = SUGGESTED_EXERCISES.find(e => e.name.toLowerCase() === newName.toLowerCase().trim());
    if (matchedExercise) {
      updated[idx].muscle_group = matchedExercise.muscle;
    }

    setExercises(updated);
  };

  // Função para quando o usuário clicar na sugestão do Dropdown
  const handleSelectSuggestion = (idx: number, suggestion: { name: string, muscle: MuscleGroup }) => {
    const updated = [...exercises];
    updated[idx].name = suggestion.name;
    updated[idx].muscle_group = suggestion.muscle;
    setExercises(updated);
    setFocusedExerciseIndex(null); // Fecha o dropdown
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Informe o nome do treino.');
    if (exercises.some((e) => !e.name.trim())) return alert('Todos os exercícios precisam de nome.');

    setSaving(true);
    try {
      let workoutId = id;

      if (isEdit) {
        await api.patch(`/workouts/${id}/`, { name, description, workout_type: workoutType });
      } else {
        const { data } = await api.post('/workouts/', { name, description, workout_type: workoutType });
        workoutId = data.id;
      }

      // Salvar exercícios
      for (let i = 0; i < exercises.length; i++) {
        const ex = { ...exercises[i], order: i, weight_kg: exercises[i].weight_kg || null };
        if (ex.id) {
          await api.patch(`/exercises/${ex.id}/`, ex);
        } else {
          await api.post(`/workouts/${workoutId}/exercises/`, ex);
        }
      }

      navigate('/workouts');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar treino.');
    } finally {
      setSaving(false);
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl" style={{ background: '#1a1a2e', color: '#94a3b8', border: '1px solid #2a2a4a' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">{isEdit ? 'Editar Treino' : 'Novo Treino'}</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Dados do treino */}
      <div className="rounded-2xl p-4 mb-4 space-y-4"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <h2 className="font-bold text-white text-sm uppercase tracking-wider">Informações do Treino</h2>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Nome *
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Treino A - Peito e Tríceps"
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
            style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {WORKOUT_TYPES.map(([value, label]) => (
              <button key={value} onClick={() => setWorkoutType(value)}
                className="py-2 px-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: workoutType === value ? 'rgba(255,138,31,0.2)' : '#0f0f1a',
                  border: `1px solid ${workoutType === value ? '#ff8a1f' : '#2a2a4a'}`,
                  color: workoutType === value ? '#ff8a1f' : '#94a3b8',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Descrição
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Observações sobre o treino..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none resize-none"
            style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
        </div>
      </div>

      {/* Exercícios */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">Exercícios ({exercises.length})</h2>
          <button onClick={addExercise}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(255,138,31,0.18)', border: '1px solid #ff8a1f', color: '#ff8a1f' }}>
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map((ex, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              {/* Header do exercício */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ background: '#0f0f1a', borderBottom: '1px solid #2a2a4a' }}>
                <div className="flex items-center gap-2">
                  <GripVertical size={16} style={{ color: '#94a3b8' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ff8a1f' }}>
                    Exercício {idx + 1}
                  </span>
                </div>
                {exercises.length > 1 && (
                  <button onClick={() => removeExercise(idx)} style={{ color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Nome do Exercício com Sugestões */}
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                    Nome do Exercício *
                  </label>
                  <div className="relative">
                    <Dumbbell size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ff8a1f' }} />
                    <input 
                      value={ex.name} 
                      onChange={(e) => handleNameChange(idx, e.target.value)}
                      onFocus={() => setFocusedExerciseIndex(idx)}
                      // O timeout evita que o dropdown feche antes de registrar o clique na sugestão
                      onBlur={() => setTimeout(() => setFocusedExerciseIndex(null), 200)}
                      placeholder="Ex: Supino Reto"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white placeholder-slate-500 outline-none text-sm relative z-10"
                      style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} 
                    />

                    {/* Dropdown de Autocomplete Inteligente */}
                    {focusedExerciseIndex === idx && ex.name.length > 1 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-y-auto z-50 shadow-2xl custom-scrollbar"
                           style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', maxHeight: '200px' }}>
                        {SUGGESTED_EXERCISES
                          .filter(s => s.name.toLowerCase().includes(ex.name.toLowerCase()) && s.name.toLowerCase() !== ex.name.toLowerCase())
                          .map((sug, i) => (
                            <div 
                              key={i} 
                              onClick={() => handleSelectSuggestion(idx, sug)}
                              className="px-4 py-3 cursor-pointer hover:bg-[#2a2a4a] flex justify-between items-center transition-colors border-b border-[#2a2a4a] last:border-0"
                            >
                              <span className="text-sm font-medium text-white">{sug.name}</span>
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider"
                                style={{ background: 'rgba(255,138,31,0.14)', color: '#fdba74' }}>
                                {MUSCLE_GROUP_LABELS[sug.muscle]}
                              </span>
                            </div>
                          ))}
                        {/* Mensagem caso não encontre (Opcional, omitida para não poluir) */}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grupo muscular */}
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                    Grupo Muscular
                  </label>
                  <select value={ex.muscle_group}
                    onChange={(e) => updateExercise(idx, 'muscle_group', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-white outline-none text-sm"
                    style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}>
                    {MUSCLE_GROUPS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Séries, Reps, Descanso */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { field: 'sets', label: 'Séries', icon: <RotateCcw size={12} />, min: 1 },
                    { field: 'reps', label: 'Reps', icon: <Dumbbell size={12} />, min: 1 },
                    { field: 'rest_seconds', label: 'Descanso(s)', icon: <Timer size={12} />, min: 0 },
                  ].map(({ field, label, icon, min }) => (
                    <div key={field}>
                      <label className="flex items-center gap-1 text-xs font-semibold mb-1 uppercase tracking-wider"
                        style={{ color: '#94a3b8' }}>
                        {icon} {label}
                      </label>
                      <input
                        type="number"
                        min={min}
                        value={ex[field as keyof ExerciseForm] as number}
                        onChange={(e) => updateExercise(idx, field as keyof ExerciseForm, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 rounded-xl text-white outline-none text-sm text-center font-bold"
                        style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
                    </div>
                  ))}
                </div>

                {/* Carga */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold mb-1 uppercase tracking-wider"
                    style={{ color: '#94a3b8' }}>
                    <Weight size={12} /> Carga (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={ex.weight_kg}
                    onChange={(e) => updateExercise(idx, 'weight_kg', e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-4 py-2.5 rounded-xl text-white placeholder-slate-500 outline-none text-sm"
                    style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão salvar final */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform mb-4"
        style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
        {saving ? 'Salvando...' : 'Salvar Treino'}
      </button>
    </div>
  );
}