import { useEffect, useMemo, useState } from 'react';
import { Shield, Search, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

type ManagedUser = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  plan_type: 'free' | 'premium';
  is_premium: boolean;
  has_administreino_access: boolean;
  has_adminisgrana_access: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = !!currentUser?.is_staff;

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/auth/admin/users/');
      setUsers(data);
    } catch {
      setError('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.email, u.username, u.first_name, u.last_name].join(' ').toLowerCase().includes(term)
    );
  }, [users, search]);

  const patchUser = async (userId: number, payload: Partial<ManagedUser>) => {
    setSavingUserId(userId);
    setError(null);
    try {
      const { data } = await api.patch(`/auth/admin/users/${userId}/`, payload);
      setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
    } catch {
      setError('Falha ao salvar alterações do usuário.');
    } finally {
      setSavingUserId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-2xl p-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
          <h1 className="text-lg font-bold text-white">Área restrita</h1>
          <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
            Somente administradores podem gerenciar usuários e apps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Shield size={20} style={{ color: 'var(--color-primary)' }} />
        <h1 className="text-2xl font-black text-white">Administração</h1>
      </div>

      <div className="rounded-2xl p-3 flex items-center gap-2" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <Search size={16} style={{ color: '#94a3b8' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email, usuário ou nome"
          className="w-full bg-transparent text-white text-sm outline-none"
        />
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const saving = savingUserId === u.id;
            return (
              <div key={u.id} className="rounded-2xl p-4 space-y-3" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white text-sm">{u.first_name} {u.last_name} <span style={{ color: '#94a3b8' }}>@{u.username}</span></p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{u.email}</p>
                    <p className="text-[11px] mt-1" style={{ color: '#64748b' }}>
                      Criado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      {u.is_superuser ? ' • Superusuário' : ''}
                    </p>
                  </div>
                  {saving && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} />}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Toggle label="Usuário ativo" checked={u.is_active} onChange={(v) => patchUser(u.id, { is_active: v })} disabled={saving} />
                  <Toggle label="Administrador" checked={u.is_staff} onChange={(v) => patchUser(u.id, { is_staff: v })} disabled={saving || u.is_superuser} />
                  <Toggle label="Acesso Administreino" checked={u.has_administreino_access} onChange={(v) => patchUser(u.id, { has_administreino_access: v })} disabled={saving} />
                  <Toggle label="Acesso Adminisgrana" checked={u.has_adminisgrana_access} onChange={(v) => patchUser(u.id, { has_adminisgrana_access: v })} disabled={saving} />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{
                      background: u.plan_type === 'premium'
                        ? 'linear-gradient(135deg, #10b981, #047857)'
                        : 'linear-gradient(135deg, #334155, #1e293b)',
                    }}
                    onClick={() => patchUser(u.id, {
                      plan_type: u.plan_type === 'premium' ? 'free' : 'premium',
                      is_premium: u.plan_type !== 'premium',
                    })}
                    disabled={saving}
                  >
                    Plano: {u.plan_type === 'premium' ? 'Premium' : 'Free'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="px-3 py-2 rounded-lg text-left transition-all disabled:opacity-50"
      style={{
        border: '1px solid #334155',
        background: checked ? 'rgba(34,197,94,0.14)' : 'rgba(15,23,42,0.5)',
        color: checked ? '#86efac' : '#cbd5e1',
      }}
    >
      {label}
    </button>
  );
}
