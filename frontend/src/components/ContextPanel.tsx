import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';

const ContextPanel: React.FC = () => {
  const { currentHU } = useAppStore();

  const lineageQuery = useQuery({
    queryKey: ['lineage', currentHU?.id],
    queryFn: () => api.getLineage(currentHU!.id),
    enabled: !!currentHU?.id,
  });

  if (!currentHU) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 opacity-50">
        <svg className="w-16 h-16 mb-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
        </svg>
        <p>No Context</p>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'STORED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'IN_USE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CONSUMED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Handling Unit</h2>
        <div className="bg-zinc-900 border border-indigo-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(79,70,229,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{currentHU.code}</h1>
              <p className="text-zinc-400 text-sm mt-1">{currentHU.material_code}</p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusColor(currentHU.status)}`}>
              {currentHU.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/80">
              <span className="block text-xs text-zinc-500 mb-1">Quantity</span>
              <span className="text-lg font-semibold text-zinc-200">{currentHU.quantity} <span className="text-xs text-zinc-400 ml-1">{currentHU.uom}</span></span>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/80">
              <span className="block text-xs text-zinc-500 mb-1">Location</span>
              <span className="text-lg font-semibold text-zinc-200">{currentHU.location_code}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-4">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3">Lineage</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-y-auto max-h-64 h-full">
          {lineageQuery.isLoading ? (
            <div className="text-sm text-zinc-500 animate-pulse">Loading lineage tree...</div>
          ) : lineageQuery.data?.data?.lineage ? (
            <div className="relative pl-3 border-l-2 border-zinc-800 ml-2 space-y-4">
              {lineageQuery.data.data.lineage.map((hu: any, idx: number) => (
                <div key={hu.id} className="relative">
                  <div className="absolute w-3 border-b-2 border-zinc-800 top-3 -left-3"></div>
                  <div className={`p-3 rounded-lg border flex flex-col gap-1 transition-all ${hu.id === currentHU.id ? 'bg-indigo-900/20 border-indigo-500/50 shadow-sm' : 'bg-zinc-950/50 border-zinc-800 opacity-70'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm font-medium text-zinc-200">{hu.code}</span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${statusColor(hu.status)}`}>{hu.status}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{hu.quantity} {hu.uom}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-sm text-zinc-500 italic">No lineage data.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextPanel;
