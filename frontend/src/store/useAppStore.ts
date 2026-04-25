import { create } from 'zustand';
import { api } from '../api/client';

export type Mode = 'Goods Receipt' | 'Putaway' | 'Receiving' | 'Production' | 'Dispatch';

interface AppState {
  currentTab: 'ops' | 'mfg' | 'com' | 'sys' | 'cfg';
  currentModule: string;
  currentMode: Mode;
  currentHU: any | null;
  currentTask: any | null;
  traceSteps: any[];
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  user: any | null;
  isAuthLoading: boolean;
  setTab: (tab: 'ops' | 'mfg' | 'com' | 'sys' | 'cfg') => void;
  setModule: (module: string) => void;
  setMode: (mode: Mode) => void;
  setCurrentHU: (hu: any | null) => void;
  setCurrentTask: (task: any | null) => void;
  appendTraceStep: (step: any) => void;
  clearTraceSteps: () => void;
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;
  setUser: (user: any | null) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentTab: 'ops',
  currentModule: 'StockFlow',
  currentMode: 'Production',
  currentHU: null,
  currentTask: null,
  traceSteps: [],
  wsStatus: 'disconnected',
  user: null,
  isAuthLoading: true,
  setTab: (tab) => {
    localStorage.setItem('supplyxerp_last_tab', tab);
    set({ currentTab: tab });
  },
  setModule: (mod) => {
    localStorage.setItem('supplyxerp_last_mod', mod);
    set({ currentModule: mod });
  },
  setMode: (mode) => set({ currentMode: mode, traceSteps: [], currentHU: null, currentTask: null }),
  setCurrentHU: (hu) => set({ currentHU: hu }),
  setCurrentTask: (task) => set({ currentTask: task }),
  appendTraceStep: (step) => set((state) => ({ traceSteps: [...state.traceSteps, step] })),
  clearTraceSteps: () => set({ traceSteps: [] }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setUser: (user) => set({ user }),
  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    localStorage.removeItem('supplyxerp_last_tab');
    localStorage.removeItem('supplyxerp_last_mod');
    set({ user: null, currentTab: 'ops', currentModule: 'StockFlow' });
  },
  checkSession: async () => {
    try {
      const response = await api.getMe();
      const user = response.data?.user || response.data;
      
      const lastTab = localStorage.getItem('supplyxerp_last_tab');
      const lastMod = localStorage.getItem('supplyxerp_last_mod');
      
      set({ 
        user, 
        isAuthLoading: false,
        currentTab: (lastTab as any) || 'ops',
        currentModule: lastMod || 'StockFlow'
      });
    } catch (err: any) {
      console.error("Session check failed:", err.message);
      set({ user: null, isAuthLoading: false });
    }
  }
}));
