import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

const TABS = [
  { id: 'ops', label: 'OPERATIONS', fallbackMod: 'StockFlow' },
  { id: 'mfg', label: 'MANUFACTURING', fallbackMod: 'MaterialHub' },
  { id: 'com', label: 'COMMERCE', fallbackMod: 'DealFlow' },
  { id: 'sys', label: 'SYSTEM', fallbackMod: 'Audit log' },
  { id: 'cfg', label: 'CONFIG', fallbackMod: 'Tenants' }
] as const;

export const TopBar: React.FC = () => {
  const { currentTab, setTab, setModule, currentModule, wsStatus, user } = useAppStore();

  const handleTabClick = (tabId: 'ops'|'mfg'|'com'|'sys'|'cfg', fallback: string) => {
    setTab(tabId);
    setModule(fallback);
  };

  const [theme, setTheme] = useState<'dark'|'light'>(
    () => (localStorage.getItem('sx-theme') as 'dark'|'light') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sx-theme', theme);
  }, [theme]);

  // Section accent mapping
  useEffect(() => {
    const root = document.documentElement;
    switch (currentTab) {
      case 'ops':
        root.style.setProperty('--accent', 'var(--ops-accent)');
        root.style.setProperty('--accent-dim', 'var(--ops-dim)');
        root.style.setProperty('--accent-text', 'var(--ops-text)');
        root.style.setProperty('--sidebar-bg', 'var(--ops-sidebar)');
        break;
      case 'mfg':
        root.style.setProperty('--accent', 'var(--mfg-accent)');
        root.style.setProperty('--accent-dim', 'var(--mfg-dim)');
        root.style.setProperty('--accent-text', 'var(--mfg-text)');
        root.style.setProperty('--sidebar-bg', 'var(--mfg-sidebar)');
        break;
      case 'com':
        root.style.setProperty('--accent', 'var(--com-accent)');
        root.style.setProperty('--accent-dim', 'var(--com-dim)');
        root.style.setProperty('--accent-text', 'var(--com-text)');
        root.style.setProperty('--sidebar-bg', 'var(--com-sidebar)');
        break;
      case 'sys':
        root.style.setProperty('--accent', 'var(--sys-accent)');
        root.style.setProperty('--accent-dim', 'var(--sys-dim)');
        root.style.setProperty('--accent-text', 'var(--sys-text)');
        root.style.setProperty('--sidebar-bg', 'var(--sys-sidebar)');
        break;
      case 'cfg':
        root.style.setProperty('--accent', 'var(--cfg-accent)');
        root.style.setProperty('--accent-dim', 'var(--cfg-dim)');
        root.style.setProperty('--accent-text', 'var(--cfg-text)');
        root.style.setProperty('--sidebar-bg', 'var(--cfg-sidebar)');
        break;
    }
  }, [currentTab]);

  return (
    <>
      <header className="topbar">
        {/* Logo */}
        <div className="logo">
          Supply<span>X</span><em>ERP</em>
        </div>

        <div className="topbar-search">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5"/>
            <path d="M11 11l2.5 2.5" strokeLinecap="round"/>
          </svg>
          Search anything…&nbsp;
          <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--bg-surface4)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-3)' }}>⌘K</span>
        </div>

        <div className="topbar-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-3)' }}>
            <div className="ws-dot" style={{ backgroundColor: wsStatus === 'connected' ? 'var(--green)' : (wsStatus === 'connecting' ? 'var(--amber)' : 'var(--red)') }}></div>
            {wsStatus === 'connected' ? 'Live' : (wsStatus === 'connecting' ? 'Conn...' : 'Offline')}
          </div>
          <button className="sx-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ height: '24px', padding: '0 8px' }}>
            {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
          </button>
          <button className="sx-btn" onClick={async () => {
            try {
              const { api } = await import('../../api/client');
              await api.logout();
              window.location.reload(); 
            } catch (err) {
              console.error("Logout failed:", err);
            }
          }} style={{ height: '24px', padding: '0 8px' }}>
            LOGOUT
          </button>
          <div className="avatar">
            {user?.username?.substring(0, 2).toUpperCase() || 'TK'}
          </div>
        </div>
      </header>

      <div className="ribbon">
        {TABS.map(t => (
          <button 
            key={t.id}
            className={`ribbon-tab ${currentTab === t.id ? 'active' : ''}`}
            onClick={() => handleTabClick(t.id, t.fallbackMod)}
          >
            <div className="ri" style={{ background: `var(--${t.id}-accent)`, opacity: currentTab === t.id ? 1 : 0.7 }}></div>
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default TopBar;
