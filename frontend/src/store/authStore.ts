import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { normalizeMediaUrl } from '../utils/mediaUrl';

export type ActiveApp = 'ecosystem' | 'administreino' | 'adminisgrana';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  activeApp: ActiveApp;
  login: (user: User, access: string, refresh: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setActiveApp: (activeApp: ActiveApp) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      activeApp: 'ecosystem',

      login: (user, access, refresh) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        set({
          user: {
            ...user,
            avatar: normalizeMediaUrl(user.avatar) ?? undefined,
          },
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, activeApp: 'ecosystem' });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...userData,
                avatar: normalizeMediaUrl(userData.avatar ?? state.user.avatar) ?? undefined,
              }
            : null,
        })),

      setActiveApp: (activeApp) => set({ activeApp }),
    }),
    {
      name: 'administreino-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        activeApp: state.activeApp,
      }),
    }
  )
);
