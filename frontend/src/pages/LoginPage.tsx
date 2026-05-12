import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login/', form);
      login(data.user, data.access, data.refresh);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)' }}>

      {/* Logo */}
      <div className="mb-8 text-center animate-slide-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 pulse-ring"
          style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
          <img src="/branding/adminstreino-emblem.svg" alt="Administreino" className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Adminis<span style={{ color: '#ff8a1f' }}>tudo</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          Acesso aos seus apps
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>

        <h2 className="text-xl font-bold text-white mb-6">Entrar na conta</h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              E-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ff8a1f' }} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}
                onFocus={(e) => e.target.style.borderColor = '#ff8a1f'}
                onBlur={(e) => e.target.style.borderColor = '#2a2a4a'}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ff8a1f' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: '#0f0f1a', border: '1px solid #2a2a4a' }}
                onFocus={(e) => e.target.style.borderColor = '#ff8a1f'}
                onBlur={(e) => e.target.style.borderColor = '#2a2a4a'}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
            style={{ background: loading ? '#e85d04' : 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: '#94a3b8' }}>
          Não tem conta?{' '}
          <Link to="/register" className="font-semibold" style={{ color: '#ff8a1f' }}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
