import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { User, Save, Loader2, LogOut, Weight, Ruler, Camera, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { User as UserType } from '../types';
import AvatarCropModal from '../components/profile/AvatarCropModal';
import { normalizeMediaUrl } from '../utils/mediaUrl';

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
  const { user, logout, updateUser, activeApp } = useAuthStore();
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(normalizeMediaUrl(user?.avatar));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<'general' | 'administreino' | 'adminisgrana'>('general');

  const sectionStyle = useMemo(() => ({ background: '#1a1a2e', border: '1px solid #2a2a4a' }), []);

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
      setAvatarPreview(normalizeMediaUrl(r.data.avatar));
    });
  }, []);

  useEffect(() => {
    if (activeApp === 'ecosystem') {
      document.documentElement.setAttribute('data-theme', 'ecosystem');
    }
  }, [activeApp]);

  const onPickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const source = URL.createObjectURL(file);
    setCropSource(source);
    event.target.value = '';
  };

  const onCropConfirm = (blob: Blob) => {
    const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(blob));
    if (cropSource) {
      URL.revokeObjectURL(cropSource);
    }
    setCropSource(null);
  };

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

      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append('avatar', avatarFile);
        const avatarResponse = await api.patch('/auth/profile/', avatarData);
        updateUser(avatarResponse.data);
        setAvatarFile(null);
      }

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
  const isSectionOpen = (key: 'general' | 'administreino' | 'adminisgrana') => openSection === key;

  return (
    <div className="px-4 py-5 animate-fade-in">
      <h1 className="text-2xl font-black text-white mb-5">Meu Perfil</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl"
        style={sectionStyle}>
        <div className="relative">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Foto do perfil" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
              {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
            </div>
          )}
          <label
            htmlFor="avatar-upload"
            className="absolute -right-1 -bottom-1 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
            title="Alterar foto"
          >
            <Camera size={14} />
          </label>
          <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        </div>
        <div>
          <p className="font-bold text-white text-lg">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>@{user?.username}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>{user?.email}</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
          Perfil atualizado com sucesso!
        </div>
      )}

      <div className="space-y-3 mb-4">
        <button
          type="button"
          onClick={() => setOpenSection(isSectionOpen('general') ? 'administreino' : 'general')}
          className="w-full rounded-2xl p-4 flex items-center justify-between"
          style={sectionStyle}
        >
          <span className="font-bold text-white text-sm uppercase tracking-wider">Conta e Identidade</span>
          <ChevronDown size={18} className={isSectionOpen('general') ? 'rotate-180 transition-transform' : 'transition-transform'} style={{ color: '#94a3b8' }} />
        </button>

        {isSectionOpen('general') && (
          <div className="rounded-2xl p-4 space-y-4" style={sectionStyle}>
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
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-primary)' }} />
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
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpenSection(isSectionOpen('administreino') ? 'adminisgrana' : 'administreino')}
          className="w-full rounded-2xl p-4 flex items-center justify-between"
          style={sectionStyle}
        >
          <span className="font-bold text-white text-sm uppercase tracking-wider">Configurações Administreino</span>
          <ChevronDown size={18} className={isSectionOpen('administreino') ? 'rotate-180 transition-transform' : 'transition-transform'} style={{ color: '#94a3b8' }} />
        </button>

        {isSectionOpen('administreino') && (
          <div className="rounded-2xl p-4 space-y-4" style={sectionStyle}>
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
        )}

        <button
          type="button"
          onClick={() => setOpenSection('adminisgrana')}
          className="w-full rounded-2xl p-4 flex items-center justify-between"
          style={sectionStyle}
        >
          <span className="font-bold text-white text-sm uppercase tracking-wider">Configurações Adminisgrana</span>
          <ChevronDown size={18} className={isSectionOpen('adminisgrana') ? 'rotate-180 transition-transform' : 'transition-transform'} style={{ color: '#94a3b8' }} />
        </button>

        {isSectionOpen('adminisgrana') && (
          <div className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
            <p className="text-sm" style={{ color: '#cbd5e1' }}>
              As configurações financeiras ficam separadas aqui para evitar confusão com os dados de treino.
            </p>
            <div className="rounded-xl p-3" style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}>
              <p className="text-xs uppercase font-semibold" style={{ color: '#94a3b8' }}>Status de acesso</p>
              <p className="text-sm font-bold mt-1" style={{ color: user?.has_adminisgrana_access ? '#22c55e' : '#f59e0b' }}>
                {user?.has_adminisgrana_access ? 'Ativo no plano atual' : 'Disponível no plano premium'}
              </p>
            </div>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              Este módulo receberá campos financeiros dedicados (metas, contas, orçamento) em breve.
            </p>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform mb-3"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {saving ? 'Salvando...' : 'Salvar Perfil'}
      </button>

      <button onClick={handleLogout}
        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        style={{ background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
        <LogOut size={18} />
        Sair da Conta
      </button>

      {cropSource && (
        <AvatarCropModal
          imageSrc={cropSource}
          onCancel={() => {
            URL.revokeObjectURL(cropSource);
            setCropSource(null);
          }}
          onConfirm={onCropConfirm}
        />
      )}
    </div>
  );
}
