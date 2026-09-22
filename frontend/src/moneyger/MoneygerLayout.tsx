import { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, List, PlusCircle, CalendarRange, MoreHorizontal,
  LogOut, ChevronDown, Wallet, Eye, EyeOff, Shield,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import AppSwitcher from '../components/AppSwitcher';
import { useAmountsHidden } from './privacy';
import { moneygerTheme as t } from './theme';

const navItems = [
  { to: '/moneyger', icon: LayoutDashboard, label: 'Início', end: true },
  { to: '/moneyger/planning', icon: CalendarRange, label: 'Planejar', end: false },
  { to: '/moneyger/capture', icon: PlusCircle, label: 'Capturar', end: false, accent: true },
  { to: '/moneyger/transactions', icon: List, label: 'Lançamentos', end: false },
  { to: '/moneyger/more', icon: MoreHorizontal, label: 'Mais', end: false },
];

export function MoneygerRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.apps?.moneyger) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function MoneygerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const amountsHidden = useAmountsHidden((s) => s.hidden);
  const toggleAmounts = useAmountsHidden((s) => s.toggle);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(26,26,46,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${t.border}` }}>
        <button
          type="button"
          onClick={() => setSwitcherOpen(true)}
          className="flex items-center gap-2 rounded-xl pr-2 active:scale-[0.98] transition-transform"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.gradient }}>
            <Wallet size={18} className="text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">
            Money<span style={{ color: t.primary }}>ger</span>
          </span>
          <ChevronDown size={16} style={{ color: t.muted }} />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAmounts}
            className="p-2 rounded-lg"
            style={{ color: amountsHidden ? t.primary : t.muted, background: amountsHidden ? t.primarySoft : 'transparent' }}
            aria-pressed={amountsHidden}
            aria-label={amountsHidden ? 'Mostrar valores' : 'Ocultar valores'}
            title={amountsHidden ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {amountsHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {user?.is_superuser && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="p-2 rounded-lg"
              style={{ color: t.primary }}
              title="Administração"
              aria-label="Administração"
            >
              <Shield size={18} />
            </button>
          )}
          <span className="text-sm font-medium max-w-[7rem] truncate" style={{ color: t.muted }}>
            {user?.first_name || user?.username}
          </span>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 rounded-lg"
            style={{ color: t.muted }}
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
        style={{ background: 'rgba(26,26,46,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map(({ to, icon: Icon, label, end, accent }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex flex-col items-center gap-0.5 rounded-xl transition-all min-w-[3.25rem]"
              style={({ isActive }) => (
                accent
                  ? { color: '#fff' }
                  : {
                    color: isActive ? t.primary : t.muted,
                    background: isActive ? t.primarySoft : 'transparent',
                    padding: '6px 8px',
                  }
              )}
            >
              {({ isActive }) => (
                accent ? (
                  <>
                    <span
                      className="w-12 h-12 -mt-5 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{
                        background: isActive ? t.primaryDark : t.gradient,
                        boxShadow: isActive ? `0 0 0 2px ${t.bg}, 0 0 0 4px ${t.primary}` : undefined,
                      }}
                    >
                      <Icon size={24} strokeWidth={2.4} />
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: isActive ? t.primary : t.muted }}>
                      {label}
                    </span>
                  </>
                ) : (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                    <span className="text-[10px] font-semibold">{label}</span>
                  </>
                )
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <AppSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} current="moneyger" />
    </div>
  );
}
