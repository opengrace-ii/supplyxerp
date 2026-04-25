import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';

const ActionButtons: React.FC = () => {
  const { currentMode, currentHU, setCurrentHU } = useAppStore();
  const queryClient = useQueryClient();
  const [consumeQty, setConsumeQty] = useState('');
  const [showQtyInput, setShowQtyInput] = useState(false);
  const [targetLocation, setTargetLocation] = useState('');
  
  const locQuery = useQuery({ queryKey: ['locations'], queryFn: api.getLocations });

  const moveMut = useMutation({
    mutationFn: () => api.move({ barcode: currentHU!.code, target_location: targetLocation }),
    onSuccess: (res) => {
      if (res.success) {
        setCurrentHU(res.data.hu);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        setTargetLocation('');
      }
    }
  });

  const consumeMut = useMutation({
    mutationFn: () => api.consume({ barcode: currentHU!.code, quantity: parseFloat(consumeQty), mode: 'consume' }),
    onSuccess: (res) => {
      if (res.success) {
        setCurrentHU(res.data.hu);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        setShowQtyInput(false);
        setConsumeQty('');
      }
    }
  });

  const splitMut = useMutation({
    mutationFn: () => api.consume({ barcode: currentHU!.code, quantity: parseFloat(consumeQty), mode: 'split' }),
    onSuccess: (res) => {
      if (res.success) {
        setCurrentHU(res.data.hu);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        setShowQtyInput(false);
        setConsumeQty('');
      }
    }
  });

  if (!currentHU) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-zinc-900 border border-zinc-800 border-dashed rounded-lg">
        <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <p className="text-zinc-500 font-medium">Scan a Handling Unit to continue</p>
      </div>
    );
  }

  const huStatus = currentHU.status;
  const isAvailable = huStatus === 'AVAILABLE';
  const isStored = huStatus === 'STORED' || isAvailable;
  
  // Action state rules
  const canMove = currentMode === 'Putaway' && isStored;
  const canConsume = currentMode === 'Production' && isAvailable;
  
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-zinc-300 mb-2 border-b border-zinc-800 pb-2">Available Actions</h3>
      
      {currentMode === 'Receiving' && (
        <button disabled className="bg-zinc-800 text-zinc-600 p-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed border border-zinc-700/50" title="Placeholder for HU Creation">
          Create HU <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded">Coming soon</span>
        </button>
      )}

      {currentMode === 'Putaway' && (
        <div className="flex flex-col gap-3 p-5 bg-zinc-900/50 rounded-xl border border-zinc-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
          {!canMove ? (
            <div className="text-amber-500/80 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              HU not eligible for putaway (Status: {huStatus})
            </div>
          ) : (
            <>
              <label className="text-zinc-400 text-sm">Select Target Location:</label>
              <select  style={{ background:'var(--bg-input)', color:'var(--text-1)', border:'1px solid var(--border-hi)', borderRadius:'6px', padding:'0 10px', height:'36px', width:'100%', fontFamily:'var(--font-sans)', fontSize:'13px', outline:'none', cursor:'pointer' }} 
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded p-3 focus:ring-indigo-500 focus:border-indigo-500"
                value={targetLocation}
                onChange={e => setTargetLocation(e.target.value)}
              >
                <option value="">-- Select Location --</option>
                {locQuery.data?.locations?.map((loc: any) => (
                  <option key={loc.id} value={loc.code}>{loc.code} ({loc.zone})</option>
                ))}
              </select>
              <button 
                onClick={() => moveMut.mutate()} 
                disabled={!targetLocation || moveMut.isPending}
                className="mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700/50 text-white font-medium p-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
              >
                {moveMut.isPending ? 'Moving...' : 'Execute Move'}
              </button>
            </>
          )}
        </div>
      )}

      {currentMode === 'Production' && (
        <div className="flex flex-col gap-3">
          {!canConsume ? (
             <div className="bg-amber-900/20 text-amber-500 border border-amber-900/50 p-4 rounded-xl text-sm flex items-center gap-3">
               <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
               Cannot consume from this Handling Unit (Status: {huStatus})
             </div>
          ) : (
             <>
                {!showQtyInput ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowQtyInput(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium p-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                       Consume Qty
                    </button>
                    <button onClick={() => setShowQtyInput(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-medium p-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                       Split HU
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-700 shadow-2xl animate-in fade-in slide-in-from-top-4">
                    <label className="block text-zinc-300 mb-2 font-medium flex justify-between">
                      <span>Enter Quantity ({currentHU.uom}):</span>
                      <span className="text-zinc-500 text-sm font-normal">Max: {currentHU.quantity} {currentHU.uom}</span>
                    </label>
                    <input  style={{ background:'var(--bg-input)', color:'var(--text-1)', border:'1px solid var(--border-hi)', borderRadius:'6px', padding:'0 10px', height:'36px', width:'100%', fontFamily:'var(--font-sans)', fontSize:'13px', outline:'none' }} 
                      type="number" 
                      autoFocus
                      className="w-full bg-zinc-950 border border-zinc-700 text-white text-2xl p-4 rounded-lg mb-4 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                      value={consumeQty} onChange={e => setConsumeQty(e.target.value)} 
                      min="0.01" step="0.01" max={currentHU.quantity}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => consumeMut.mutate()} disabled={!consumeQty || parseFloat(consumeQty) > currentHU.quantity || consumeMut.isPending} className="col-span-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-3 rounded-lg font-medium transition-colors">
                        Confirm Consume
                      </button>
                      <button onClick={() => splitMut.mutate()} disabled={!consumeQty || parseFloat(consumeQty) >= currentHU.quantity || splitMut.isPending} className="col-span-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded-lg font-medium transition-colors">
                        Confirm Split
                      </button>
                      <button onClick={() => {setShowQtyInput(false); setConsumeQty('');}} className="col-span-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-3 rounded-lg font-medium transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
             </>
          )}
        </div>
      )}

      {currentMode === 'Dispatch' && (
        <button disabled className="bg-zinc-800 text-zinc-600 p-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed border border-zinc-700/50" title="Placeholder for Pick Creation">
          Pick Task <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded">Coming soon</span>
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
