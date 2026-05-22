import { create } from 'zustand';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from './authStore';

interface StockAlertSummary {
  total: number;
  outOfStock: number;
  low: number;
}

interface StockAlertState {
  count: number;
  summary: StockAlertSummary;
  isLoading: boolean;
  fetch: () => Promise<void>;
}

export const useStockAlertStore = create<StockAlertState>((set) => ({
  count: 0,
  summary: { total: 0, outOfStock: 0, low: 0 },
  isLoading: false,

  fetch: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ count: 0, summary: { total: 0, outOfStock: 0, low: 0 } });
      return;
    }
    set({ isLoading: true });
    try {
      const data = await api<{ summary: StockAlertSummary }>(IPC.INVENTORY_ALERTS, token);
      set({ count: data.summary.total, summary: data.summary });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export async function showStockNativeAlert(
  alert: { title: string; body: string } | null | undefined
) {
  if (!alert) return;
  const token = useAuthStore.getState().token;
  if (!token) return;
  await api(IPC.NOTIFICATIONS_NATIVE, token, {
    title: `Workshop Pro: ${alert.title}`,
    body: alert.body,
  }).catch(() => {});
}
