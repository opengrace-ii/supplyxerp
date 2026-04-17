import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const TABS = [
  { id: 'ops', label: 'OPERATIONS', fallbackMod: 'StockFlow' },
  { id: 'mfg', label: 'MFG', fallbackMod: 'MaterialHub' },
  { id: 'com', label: 'COMMERCE', fallbackMod: 'DealFlow' },
  { id: 'sys', label: 'SYSTEM', fallbackMod: 'Audit log' },
  { id: 'cfg', label: 'CONFIG', fallbackMod: 'Tenants' }
] as const;

export const TopBar: React.FC = () => {
  const { currentTab, setTab, setModule, currentModule, wsStatus, user } = useAppStore();

  const handleTabClick = (tabId: 'ops'|'mfg'|'com'|'sys'|'cfg', fallback: string) => {
    setTab(tabId);
    // When changing tabs, we might want to also jump to the default module for that tab
    setModule(fallback);
  };

  return (
    <header className="topbar">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>
        <span style={{ color: '#ffffff' }}>SupplyX</span>
        <span className="text-accent"> ERP</span>
      </div>

      <div className="topbar-separator" />

      {/* Breadcrumb */}
      <div style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>
        SupplyX ERP · <span style={{color: '#fff'}}>{currentModule}</span> · TechLogix UK
      </div>

      {/* WS Pill */}
      <div className="ws-pill">
        <span 
          style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: wsStatus === 'connected' ? '#22c55e' : (wsStatus === 'connecting' || wsStatus === 'reconnecting') ? '#f59e0b' : '#ef4444'
          }}
          className={(wsStatus === 'reconnecting' || wsStatus === 'connecting' || wsStatus === 'connected') ? 'animate-pulse' : ''}
        />
        <span style={{ fontSize: '11px', color: wsStatus === 'connected' ? '#22c55e' : (wsStatus === 'connecting' || wsStatus === 'reconnecting') ? '#f59e0b' : '#ef4444' }}>
          {wsStatus === 'connected' ? 'Live' : (wsStatus === 'connecting' || wsStatus === 'reconnecting') ? 'Reconnecting...' : 'Offline'}
        </span>
      </div>

      {/* Ribbons */}
      <div className="ribbon-tabs">
        {TABS.map(t => (
          <button 
            key={t.id}
            className={`ribbon-tab ${currentTab === t.id ? 'active' : ''}`}
            onClick={() => handleTabClick(t.id, t.fallbackMod)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* User Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          width: '24px', height: '24px', borderRadius: '50%', 
          backgroundColor: 'var(--theme-dark)', color: 'var(--theme-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: '700', border: '1px solid var(--theme-border)'
        }}>
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', color: '#fff' }}>{user?.username}</span>
          <span style={{ fontSize: '9px', color: '#888' }}>{user?.role}</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
