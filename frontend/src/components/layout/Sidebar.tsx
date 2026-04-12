import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const MODULES = [
  { section: 'OPERATIONS', items: [
    { name: 'StockFlow', status: 'Live', class: 'green' },
    { name: 'LedgerStock', status: 'Live', class: 'green' }
  ]},
  { section: 'MANUFACTURING', items: [
    { name: 'MaterialHub', status: 'Phase 2', class: 'amber' },
    { name: 'BuildOrder', status: 'Phase 2', class: 'amber' },
    { name: 'QualityGate', status: 'Phase 2', class: 'amber' }
  ]},
  { section: 'COMMERCE', items: [
    { name: 'DealFlow', status: 'Phase 3', class: 'gray' },
    { name: 'RouteRunner', status: 'Phase 3', class: 'gray' }
  ]},
  { section: 'SYSTEM', items: [
    { name: 'Audit log', status: 'Live', class: 'green' },
    { name: 'Users & roles', status: 'Live', class: 'green' }
  ]}
];

const Sidebar: React.FC = () => {
  const { currentModule, setModule, user } = useAppStore();

  return (
    <aside className="sidebar">
      <div className="p-4" style={{borderBottom: '1px solid var(--color-border)'}}>
        <h1 style={{fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          ERPLite
          <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)'}}>{user?.username}</span>
        </h1>
      </div>
      
      <div style={{flex: 1, overflowY: 'auto'}}>
        <ul className="module-nav-list">
          {MODULES.map(group => (
            <React.Fragment key={group.section}>
              <li className="module-nav-section">— {group.section} —</li>
              {group.items.map(item => (
                <li key={item.name}>
                  <button 
                    onClick={() => setModule(item.name)}
                    className={`module-nav-item ${currentModule === item.name ? 'active' : ''}`}
                    style={{width: '100%', border: 'none', background: currentModule === item.name ? 'var(--color-primary-muted)' : 'transparent', textAlign: 'left', fontFamily: 'var(--font-sans)'}}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <span className={`status-dot ${item.class}`}></span>
                      <span>{item.name}</span>
                    </div>
                    <span className={`badge ${item.class}`}>[{item.status}]</span>
                  </button>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
