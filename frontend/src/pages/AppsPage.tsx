import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Dumbbell, Wallet, Crown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AppsPage() {
  const user = useAuthStore((s) => s.user);
  const setActiveApp = useAuthStore((s) => s.setActiveApp);

  const greetingName = useMemo(() => {
    if (user?.first_name?.trim()) return user.first_name;
    if (user?.username?.trim()) return user.username;
    return 'usuário';
  }, [user]);

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <section
          className="rounded-3xl p-6 md:p-8"
          style={{
            background: 'linear-gradient(130deg, #1a1a2e 0%, #16213e 55%, #1d263f 100%)',
            border: '1px solid #2a2a4a',
          }}
        >
          <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#94a3b8' }}>
            Ecossistema
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2">
            Adminis<span style={{ color: 'var(--color-primary)' }}>tudo</span>
          </h1>
          <p className="mt-2 text-base" style={{ color: '#cbd5e1' }}>
            Olá, {greetingName}. Escolha um app para continuar.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            to="/dashboard"
            onClick={() => setActiveApp('administreino')}
            className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
                  <Dumbbell size={20} color="#fff" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-white">Administreino</h2>
                <p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
                  Treinos, sessões e evolução física.
                </p>
              </div>
              <ArrowRight size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
          </Link>

          <article
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(140deg, rgba(26,26,46,0.9), rgba(22,33,62,0.7))',
              border: '1px solid #2a2a4a',
              opacity: user?.has_adminisgrana_access ? 1 : 0.8,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)' }}>
                  <Wallet size={20} color="#fff" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-white">Adminisgrana</h2>
                <p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
                  Gestão financeira pessoal.
                </p>
              </div>
              {!user?.has_adminisgrana_access ? <Crown size={18} style={{ color: '#f59e0b' }} /> : <ArrowRight size={20} style={{ color: '#14b8a6' }} />}
            </div>

            <div className="mt-4">
              {user?.has_adminisgrana_access ? (
                <Link
                  to="/grana"
                  onClick={() => setActiveApp('adminisgrana')}
                  className="block w-full rounded-xl py-2.5 text-sm font-semibold text-center"
                  style={{ background: '#134e4a', color: '#d1fae5' }}
                >
                  Acessar Adminisgrana
                </Link>
              ) : (
                <div
                  className="w-full rounded-xl py-2.5 text-center text-sm font-semibold"
                  style={{ background: '#2b2434', color: '#fcd34d' }}
                >
                  Disponível no plano premium
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
