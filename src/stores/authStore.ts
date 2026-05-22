import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import type { User } from '@/types/ipc';

interface AuthState {
  token: string | null;
  user: User | null;
  expiresAt: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginPin: (pin: string, userId?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      expiresAt: null,
      isLoading: false,

      setLoading: (v) => set({ isLoading: v }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api<{ success: boolean; token?: string; user?: User; error?: string }>(
            IPC.AUTH_LOGIN,
            { email, password }
          );
          if (!res.success || !res.token) throw new Error(res.error ?? 'Login failed');
          set({ token: res.token, user: res.user ?? null, expiresAt: null });
        } finally {
          set({ isLoading: false });
        }
      },

      loginPin: async (pin, userId) => {
        set({ isLoading: true });
        try {
          const res = await api<{ success: boolean; token?: string; user?: User; error?: string }>(
            IPC.AUTH_PIN,
            { pin, userId }
          );
          if (!res.success || !res.token) throw new Error(res.error ?? 'Invalid PIN');
          set({ token: res.token, user: res.user ?? null });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const token = get().token;
        if (token) await api(IPC.AUTH_LOGOUT, token).catch(() => {});
        set({ token: null, user: null, expiresAt: null });
      },

      checkSession: async () => {
        const token = get().token;
        if (!token) return false;
        try {
          const session = await api<{ user: User } | null>(IPC.AUTH_SESSION, token);
          if (!session) {
            set({ token: null, user: null });
            return false;
          }
          set({ user: session.user });
          return true;
        } catch {
          set({ token: null, user: null });
          return false;
        }
      },
    }),
    { name: 'workshop-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
