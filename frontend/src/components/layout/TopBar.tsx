import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const TopBar: React.FC = () => {
  const { currentModule, wsStatus, user } = useAppStore();

  return (
    <header className="topbar">
      <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
        <span style={{fontWeight: 'bold', color: 'var(--color-primary)'}}>ERPLite</span>
        <span style={{color: 'var(--color-text-muted)'}}>• {currentModule} • TechLogix UK</span>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-elevated)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem'}}>
          <span className={`status-dot ${wsStatus === 'connected' ? 'green' : wsStatus === 'connecting' ? 'amber' : 'red'}`} 
                style={wsStatus === 'connected' ? {animation: 'pulse 2s infinite'} : {}}>
          </span>
          {wsStatus === 'disconnected' ? 'Connection lost — retrying...' : 'Live'}
        </div>
      </div>
      
      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <span style={{color: 'var(--color-text-muted)'}}>{user?.username}</span>
          <span className="badge green" style={{fontSize: '0.65rem'}}>{user?.role}</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
