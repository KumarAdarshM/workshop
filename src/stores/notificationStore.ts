import { create } from 'zustand';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from './authStore';

export interface WorkshopNotification {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

interface NotificationState {
  items: WorkshopNotification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  setOpen: (open: boolean) => void;
  fetch: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  startPolling: () => () => void;
}

const POLL_INTERVAL_MS = 20_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let onWindowFocus: (() => void) | null = null;
let onVisibilityChange: (() => void) | null = null;
let lastNativeCount = 0;
let lastItemIds = new Set<string>();

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,
  error: null,
  lastFetched: null,

  setOpen: (open) => set({ isOpen: open }),

  fetch: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const showLoading = get().isOpen || get().items.length === 0;
    if (showLoading) set({ isLoading: true, error: null });

    try {
      const data = await api<{ items: WorkshopNotification[]; unreadCount: number }>(
        IPC.NOTIFICATIONS_LIST,
        token
      );
      const hadFetched = get().lastFetched !== null;
      const newIds = data.items
        .map((n) => n.id)
        .filter((id) => !lastItemIds.has(id));

      set({
        items: data.items,
        unreadCount: data.unreadCount,
        lastFetched: Date.now(),
        error: null,
        isLoading: false,
      });

      // Desktop alert when new alerts appear (by id, not only count)
      const hasNewAlerts = newIds.length > 0;
      const shouldNotify =
        !get().isOpen &&
        data.unreadCount > 0 &&
        (hasNewAlerts || data.unreadCount > lastNativeCount || !hadFetched);
      if (shouldNotify) {
        const fresh = hasNewAlerts
          ? data.items.filter((n) => newIds.includes(n.id))
          : data.items;
        const stock = fresh.filter((n) => n.type === 'LOW_STOCK');
        const high = fresh.filter((n) => n.priority === 'high');
        const n = high[0] ?? stock[0] ?? fresh[0];
        if (n) {
          api(IPC.NOTIFICATIONS_NATIVE, token, {
            title: `Workshop Pro: ${n.title}`,
            body: n.message,
          }).catch(() => {});
        }
      }
      lastNativeCount = data.unreadCount;
      lastItemIds = new Set(data.items.map((n) => n.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      set({ error: message, isLoading: false });
      console.error('[notifications]', message);
    }
  },

  dismiss: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    await api(IPC.NOTIFICATIONS_DISMISS, token, id);
    await get().fetch();
  },

  dismissAll: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      await api(IPC.NOTIFICATIONS_DISMISS_ALL, token);
      lastNativeCount = 0;
      lastItemIds = new Set();
      set({ items: [], unreadCount: 0 });
      await get().fetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  startPolling: () => {
    const refresh = () => {
      void get().fetch();
    };

    refresh();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, POLL_INTERVAL_MS);

    onWindowFocus = refresh;
    onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      if (onWindowFocus) {
        window.removeEventListener('focus', onWindowFocus);
        onWindowFocus = null;
      }
      if (onVisibilityChange) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        onVisibilityChange = null;
      }
    };
  },
}));

export function resetNotificationCache() {
  lastNativeCount = 0;
  lastItemIds = new Set();
}
