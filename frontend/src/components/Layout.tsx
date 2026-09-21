import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, User, LogOut, Dumbbell, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import AppSwitcher from './AppSwitcher';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/history', icon: History, label: 'Histórico' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const canSwitchApps = Boolean(user?.apps?.moneyger);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0f0f1a' }}>
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(26,26,46,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2a2a4a' }}>
        {canSwitchApps ? (
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className="flex items-center gap-2 rounded-xl pr-2 active:scale-[0.98] transition-transform"
            title="Trocar aplicação"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
              <img src="/branding/adminstreino-emblem.svg" alt="" className="w-5 h-5" />
            </div>
            <span className="font-black text-white text-lg">
              Adminis<span style={{ color: '#ff8a1f' }}>treino</span>
            </span>
            <ChevronDown size={16} style={{ color: '#94a3b8' }} />
          </button>
        ) : (
          <div className="flex items-center gap-2 select-none" aria-disabled="true">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
              <img src="/branding/adminstreino-emblem.svg" alt="Administreino" className="w-5 h-5" />
            </div>
            <span className="font-black text-white text-lg">
              Adminis<span style={{ color: '#ff8a1f' }}>treino</span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
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

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
        style={{ background: 'rgba(26,26,46,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2a2a4a' }}>
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
                color: isActive ? '#ff8a1f' : '#94a3b8',
                background: isActive ? 'rgba(255,138,31,0.15)' : 'transparent',
              })}
            >
              <Icon size={22} />
              <span className="text-xs font-semibold">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <AppSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        current="administreino"
      />
    </div>
  );
}
