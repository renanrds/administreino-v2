import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

type AdminUser = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_superuser: boolean;
  moneyger_enabled: boolean;
  moneyger: boolean;
};

async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get('/auth/admin/users/');
  return data;
}

async function updateAdminUser(
  id: number,
  payload: Partial<Pick<AdminUser, 'is_active' | 'moneyger_enabled'>>,
): Promise<AdminUser> {
  const { data } = await api.patch(`/auth/admin/users/${id}/`, payload);
  return data;
}

function displayName(user: AdminUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || user.username;
}

function Toggle({
  on,
  disabled,
  label,
  onClick,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-11 h-6 rounded-full relative disabled:opacity-40 shrink-0"
      style={{ background: on ? '#22c55e' : '#2a2a4a' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: on ? '22px' : '2px' }}
      />
    </button>
  );
}

export default function AdminUsersPage() {
  const me = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchAdminUsers,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Pick<AdminUser, 'is_active' | 'moneyger_enabled'>> }) =>
      updateAdminUser(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminUser[]>(['admin', 'users'], (current = []) =>
        current.map((user) => (user.id === updated.id ? updated : user)),
      );
    },
    onError: () => alert('Não foi possível atualizar o usuário.'),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((user) =>
      [user.email, user.username, user.first_name, user.last_name].some((part) =>
        (part || '').toLowerCase().includes(q),
      ),
    );
  }, [data, query]);

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Administração</h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
          Usuários e recursos
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar nome ou e-mail"
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: '#ff8a1f', borderTopColor: 'transparent' }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <article
              key={user.id}
              className="rounded-2xl p-4 space-y-3"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
            >
              <div>
                <p className="font-bold text-white">{displayName(user)}</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  {user.email} · @{user.username}
                  {user.is_superuser ? ' · superusuário' : ''}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white">Ativo</span>
                <Toggle
                  on={user.is_active}
                  disabled={update.isPending || user.id === me?.id}
                  label={`Conta ativa de ${displayName(user)}`}
                  onClick={() => update.mutate({ id: user.id, payload: { is_active: !user.is_active } })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">Moneyger</p>
                  {user.is_superuser && (
                    <p className="text-[11px]" style={{ color: '#94a3b8' }}>Sempre ligado para superusuário</p>
                  )}
                  {!user.is_superuser && user.moneyger && !user.moneyger_enabled && (
                    <p className="text-[11px]" style={{ color: '#94a3b8' }}>Também liberado pela lista do ambiente</p>
                  )}
                </div>
                <Toggle
                  on={user.moneyger}
                  disabled={update.isPending || user.is_superuser}
                  label={`Moneyger de ${displayName(user)}`}
                  onClick={() => update.mutate({
                    id: user.id,
                    payload: { moneyger_enabled: !user.moneyger },
                  })}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
