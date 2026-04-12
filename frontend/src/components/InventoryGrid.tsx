import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const InventoryGrid: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: api.getLocations });

  useEffect(() => {
    const handleUpdate = () => queryClient.invalidateQueries({ queryKey: ['inventory'] });
    window.addEventListener('inventory_update', handleUpdate);
    return () => window.removeEventListener('inventory_update', handleUpdate);
  }, [queryClient]);

  if (isLoading) {
    return <div className="p-6 text-zinc-500 animate-pulse text-center">Loading inventory grid...</div>;
  }

  const locations = data?.locations || [];

  return (
    <div className="p-6">
      <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Live Warehouse Locations</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-4">
        {locations.map((loc: any) => (
          <div key={loc.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center hover:border-indigo-500/50 transition-colors shadow-sm">
            <span className="text-zinc-500 text-xs font-semibold uppercase mb-1">{loc.zone}</span>
            <span className="text-white font-mono text-lg font-bold mb-2 tracking-tight">{loc.code}</span>
            <div className="flex gap-2">
              <span className={`px-2 py-1 text-xs font-bold rounded ${loc.hu_count > 0 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                {loc.hu_count} HU
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryGrid;
