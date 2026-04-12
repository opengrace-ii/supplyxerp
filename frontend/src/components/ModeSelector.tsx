import React from 'react';
import { useAppStore, Mode } from '../store/useAppStore';

const MODES: Mode[] = ['Receiving', 'Putaway', 'Production', 'Dispatch'];

const ModeSelector: React.FC = () => {
  const { currentMode, setMode } = useAppStore();

  return (
    <div className="flex bg-zinc-900 border-b border-zinc-800 p-2 gap-2">
      {MODES.map(mode => (
        <button
          key={mode}
          onClick={() => setMode(mode)}
          className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            currentMode === mode 
              ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
