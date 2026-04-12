import React, { useRef, useEffect, useState } from 'react';
import { useScan } from '../hooks/useScan';
import { useAppStore } from '../store/useAppStore';

const ScanInput: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scanMutation = useScan();
  const { currentHU } = useAppStore();

  // Auto-focus logic
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentHU]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      scanMutation.mutate(barcode.trim());
      setBarcode('');
    }
  };

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-zinc-900 border border-indigo-500/30 text-white text-xl rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-12 p-6 transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.15)] placeholder-zinc-500"
          placeholder="Scan or type barcode (e.g. HU-1001)..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          disabled={scanMutation.isPending}
          autoComplete="off"
          autoFocus
        />
        {scanMutation.isPending && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ScanInput;
