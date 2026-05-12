import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, User, LogOut, Dumbbell, Wallet, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const trainingPaths = ['/dashboard', '/workouts', '/history', '/session'];
const financePaths = ['/grana'];
const ecosystemPaths = ['/', '/profile', '/admin'];

export default function Layout() {
  const { user, logout, activeApp, setActiveApp } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    const nextApp = trainingPaths.some((path) => pathname.startsWith(path))
      ? 'administreino'
      : financePaths.some((path) => pathname.startsWith(path))
        ? 'adminisgrana'
        : ecosystemPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
          ? 'ecosystem'
          : 'ecosystem';
    if (nextApp !== activeApp) {
      setActiveApp(nextApp);
    }
  }, [activeApp, location.pathname, setActiveApp]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', activeApp);
  }, [activeApp]);

  const navItems = useMemo(() => {
    const common = [
      { to: '/', icon: LayoutDashboard, label: 'Apps' },
      { to: '/profile', icon: User, label: 'Perfil' },
    ];
    const admin = user?.is_staff ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : [];
    if (activeApp === 'administreino') {
      return [
        common[0],
        { to: '/dashboard', icon: Dumbbell, label: 'Início' },
        { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
        { to: '/history', icon: History, label: 'Histórico' },
        ...admin,
        common[1],
      ];
    }
    if (activeApp === 'adminisgrana') {
      return [
        common[0],
        { to: '/grana', icon: Wallet, label: 'Grana' },
        ...admin,
        { to: '/profile', icon: Wallet, label: 'Conta' },
      ];
    }
    return [...common, ...admin];
  }, [activeApp, user?.is_staff]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 95%, black)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
            <img src="/branding/adminstreino-emblem.svg" alt="Administreino" className="w-5 h-5" />
          </div>
          <span className="font-black text-white text-lg">
            Adminis<span style={{ color: 'var(--color-primary)' }}>tudo</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
            {user?.first_name || user?.username}
          </span>
          <button onClick={handleLogout}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#94a3b8' }}
            title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 97%, black)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? 'text-white' : ''
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
                background: isActive ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
              })}
            >
              <Icon size={22} />
              <span className="text-xs font-semibold">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
