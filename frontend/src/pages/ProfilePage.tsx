import { useEffect, useState } from 'react';
import { User, Save, Loader2, LogOut, Weight, Ruler } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { User as UserType } from '../types';

type ProfileForm = {
  first_name: string;
  last_name: string;
  username: string;
  bio: string;
  weight: string;
  height: string;
  gender: Exclude<NonNullable<UserType['gender']>, ''>;
  experience_level: NonNullable<UserType['experience_level']>;
  age: string;
  primary_goal: string;
  weekly_training_days: string;
  gym_app_preference: NonNullable<UserType['gym_app_preference']>;
};

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    bio: '',
    weight: '',
    height: '',
    gender: (user?.gender || 'prefer_not_to_say') as ProfileForm['gender'],
    experience_level: (user?.experience_level || 'intermediate') as ProfileForm['experience_level'],
    age: user?.age?.toString() || '',
    primary_goal: user?.primary_goal || '',
    weekly_training_days: user?.weekly_training_days?.toString() || '',
    gym_app_preference: (user?.gym_app_preference || 'none') as ProfileForm['gym_app_preference'],
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/auth/profile/').then((r) => {
      setForm({
        first_name: r.data.first_name || '',
        last_name: r.data.last_name || '',
        username: r.data.username || '',
        bio: r.data.bio || '',
        weight: r.data.weight?.toString() || '',
        height: r.data.height?.toString() || '',
        gender: r.data.gender || 'prefer_not_to_say',
        experience_level: r.data.experience_level || 'intermediate',
        age: r.data.age?.toString() || '',
        primary_goal: r.data.primary_goal || '',
        weekly_training_days: r.data.weekly_training_days?.toString() || '',
        gym_app_preference: (r.data.gym_app_preference || 'none') as ProfileForm['gym_app_preference'],
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const { data } = await api.patch('/auth/profile/', {
        ...form,
        weight: form.weight || null,
        height: form.height || null,
        age: form.age || null,
        weekly_training_days: form.weekly_training_days || null,
      });
      updateUser(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none text-sm";
  const inputStyle = { background: '#0f0f1a', border: '1px solid #2a2a4a' };

  return (
    <div className="px-4 py-5 animate-fade-in">
      <h1 className="text-2xl font-black text-white mb-5">Meu Perfil</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
          {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-white text-lg">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>@{user?.username}</p>
          <p className="text-xs mt-0.5" style={{ color: '#ff8a1f' }}>{user?.email}</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
          Perfil atualizado com sucesso!
        </div>
      )}

      {/* Formulário */}
      <div className="rounded-2xl p-4 space-y-4 mb-4"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <h2 className="font-bold text-white text-sm uppercase tracking-wider">Informações Pessoais</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Nome
            </label>
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Sobrenome
            </label>
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Usuário
          </label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ff8a1f' }} />
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={`${inputClass} pl-9`} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Bio
          </label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={2} placeholder="Conte um pouco sobre você..."
            className={`${inputClass} resize-none`} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: '#94a3b8' }}>
              <Weight size={12} /> Peso (kg)
            </label>
            <input type="number" step={0.1} value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder="Ex: 75.5" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: '#94a3b8' }}>
              <Ruler size={12} /> Altura (cm)
            </label>
            <input type="number" step={0.1} value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
              placeholder="Ex: 175" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Gênero
            </label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as ProfileForm['gender'] })}
              className={inputClass} style={inputStyle}>
              <option value="prefer_not_to_say">Prefiro não informar</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="non_binary">Não-binário</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Nível
            </label>
            <select value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value as ProfileForm['experience_level'] })}
              className={inputClass} style={inputStyle}>
              <option value="beginner">Iniciante</option>
              <option value="intermediate">Intermediário</option>
              <option value="advanced">Avançado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Idade
            </label>
            <input type="number" min={12} max={100} value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              placeholder="Ex: 28" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Dias/semana
            </label>
            <input type="number" min={1} max={7} value={form.weekly_training_days}
              onChange={(e) => setForm({ ...form, weekly_training_days: e.target.value })}
              placeholder="Ex: 4" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Objetivo principal
          </label>
          <input value={form.primary_goal} onChange={(e) => setForm({ ...form, primary_goal: e.target.value })}
            placeholder="Ex: hipertrofia com foco em posterior" className={inputClass} style={inputStyle} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            App de academia
          </label>
          <select value={form.gym_app_preference} onChange={(e) => setForm({ ...form, gym_app_preference: e.target.value as ProfileForm['gym_app_preference'] })}
            className={inputClass} style={inputStyle}>
            <option value="none">Nenhum</option>
            <option value="wellhub">Wellhub</option>
            <option value="totalpass">Totalpass</option>
            <option value="both">Wellhub + Totalpass</option>
          </select>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform mb-3"
        style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {saving ? 'Salvando...' : 'Salvar Perfil'}
      </button>

      <button onClick={handleLogout}
        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        style={{ background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
        <LogOut size={18} />
        Sair da Conta
      </button>
    </div>
  );
}
