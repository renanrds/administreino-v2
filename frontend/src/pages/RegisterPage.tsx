import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', username: '', first_name: '', last_name: '',
    gender: 'prefer_not_to_say',
    experience_level: 'intermediate',
    password: '', password2: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError({});
    try {
      await api.post('/auth/register/', form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data || { general: 'Erro ao criar conta.' });
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text', icon: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ff8a1f' }}>{icon}</span>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          required
          className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
          style={{ background: '#0f0f1a', border: `1px solid ${error[key] ? '#ef4444' : '#2a2a4a'}` }}
          onFocus={(e) => e.target.style.borderColor = '#ff8a1f'}
          onBlur={(e) => e.target.style.borderColor = error[key] ? '#ef4444' : '#2a2a4a'}
        />
      </div>
      {error[key] && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{error[key]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)' }}>

      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
          style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
          <img src="/branding/adminstreino-emblem.svg" alt="Administreino" className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-white">
          Adminis<span style={{ color: '#ff8a1f' }}>treino</span>
        </h1>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>

        <h2 className="text-xl font-bold text-white mb-6">Criar conta</h2>

        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium text-center"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
            Conta criada! Redirecionando...
          </div>
        )}

        {error.general && (
          <div className="mb-4 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            {error.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('first_name', 'Nome', 'text', <User size={16} />)}
            {field('last_name', 'Sobrenome', 'text', <User size={16} />)}
          </div>
          {field('username', 'Usuário', 'text', <User size={16} />)}
          {field('email', 'E-mail', 'email', <Mail size={16} />)}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                Gênero
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-3 rounded-xl text-white outline-none transition-all"
                style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}
              >
                <option value="prefer_not_to_say">Prefiro não informar</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="non_binary">Não-binário</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                Nível
              </label>
              <select
                value={form.experience_level}
                onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                className="w-full px-3 py-3 rounded-xl text-white outline-none transition-all"
                style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}
              >
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>
          </div>

          {field('password', 'Senha', 'password', <Lock size={16} />)}
          {field('password2', 'Confirmar Senha', 'password', <Lock size={16} />)}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: '#94a3b8' }}>
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold" style={{ color: '#ff8a1f' }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
