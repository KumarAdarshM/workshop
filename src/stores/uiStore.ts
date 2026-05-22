import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  globalSearch: string;
  toggleSidebar: () => void;
  setGlobalSearch: (q: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      globalSearch: '',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setGlobalSearch: (q) => set({ globalSearch: q }),
    }),
    { name: 'workshop-ui' }
  )
);
