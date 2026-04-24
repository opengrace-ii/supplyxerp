import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const AgentTracePanel: React.FC = () => {
  const { traceSteps, clearTraceSteps } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filterErrors, setFilterErrors] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [traceSteps]);

  const displayedSteps = filterErrors ? traceSteps.filter(s => s.status !== 'SUCCESS') : traceSteps;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case 'FAILED': return 'border-red-500/50 bg-red-500/20 text-red-300';
      case 'BLOCKED': return 'border-amber-500/50 bg-amber-500/20 text-amber-300';
      case 'EXECUTED': return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
      default: return 'border-zinc-700 bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0 shadow-sm z-10">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Live Trace
        </h2>
        <div className="flex gap-2 text-xs">
          <button 
            onClick={() => setFilterErrors(!filterErrors)} 
            className={`px-2 py-1 rounded border transition-colors ${filterErrors ? 'bg-red-900/50 border-red-700 text-red-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Errors Only
          </button>
          <button 
            onClick={clearTraceSteps}
            className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {displayedSteps.length === 0 ? (
          <div className="text-zinc-600 text-center mt-10 italic">Waiting for operations...</div>
        ) : (
          displayedSteps.map((step, idx) => (
            <div key={idx} className={`p-3 rounded border animate-in slide-in-from-bottom-2 fade-in duration-300 shadow-sm ${getStatusColor(step.status)}`}>
              <div className="flex justify-between items-start mb-1.5 border-b border-[currentcolor]/20 pb-1.5">
                <span className="font-bold opacity-90">{step.agent} : {step.action}</span>
                <span className="opacity-75">{new Date(step.timestamp).toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
              </div>
              <div className="opacity-80 mt-1 whitespace-pre-wrap break-all overflow-hidden line-clamp-4">
                {JSON.stringify(step.data, null, 2)}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default AgentTracePanel;
