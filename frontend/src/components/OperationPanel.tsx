import React from 'react';
import ModeSelector from './ModeSelector';
import ScanInput from './ScanInput';
import ActionButtons from './ActionButtons';

const OperationPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <ModeSelector />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <ScanInput />
          <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <ActionButtons />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationPanel;
