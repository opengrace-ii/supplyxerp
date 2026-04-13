import { create } from 'zustand';

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
  setTab: (tab: 'ops' | 'mfg' | 'com' | 'sys' | 'cfg') => void;
  setModule: (module: string) => void;
  setMode: (mode: Mode) => void;
  setCurrentHU: (hu: any | null) => void;
  setCurrentTask: (task: any | null) => void;
  appendTraceStep: (step: any) => void;
  clearTraceSteps: () => void;
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;
  setUser: (user: any | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTab: 'ops',
  currentModule: 'StockFlow',
  currentMode: 'Production',
  currentHU: null,
  currentTask: null,
  traceSteps: [],
  wsStatus: 'disconnected',
  user: null,
  setTab: (tab) => set({ currentTab: tab }),
  setModule: (mod) => set({ currentModule: mod }),
  setMode: (mode) => set({ currentMode: mode, traceSteps: [], currentHU: null, currentTask: null }),
  setCurrentHU: (hu) => set({ currentHU: hu }),
  setCurrentTask: (task) => set({ currentTask: task }),
  appendTraceStep: (step) => set((state) => ({ traceSteps: [...state.traceSteps, step] })),
  clearTraceSteps: () => set({ traceSteps: [] }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setUser: (user) => set({ user }),
}));
