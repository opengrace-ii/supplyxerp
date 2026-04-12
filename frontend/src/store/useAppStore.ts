import { create } from 'zustand';

export type Mode = 'Receiving' | 'Putaway' | 'Production' | 'Dispatch';

interface AppState {
  currentModule: string;
  currentMode: Mode;
  currentHU: any | null;
  traceSteps: any[];
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  user: any | null;
  setModule: (module: string) => void;
  setMode: (mode: Mode) => void;
  setCurrentHU: (hu: any | null) => void;
  appendTraceStep: (step: any) => void;
  clearTraceSteps: () => void;
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  setUser: (user: any | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'StockFlow',
  currentMode: 'Production',
  currentHU: null,
  traceSteps: [],
  wsStatus: 'disconnected',
  user: null,
  setModule: (mod) => set({ currentModule: mod }),
  setMode: (mode) => set({ currentMode: mode, traceSteps: [], currentHU: null }),
  setCurrentHU: (hu) => set({ currentHU: hu }),
  appendTraceStep: (step) => set((state) => ({ traceSteps: [...state.traceSteps, step] })),
  clearTraceSteps: () => set({ traceSteps: [] }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setUser: (user) => set({ user }),
}));
