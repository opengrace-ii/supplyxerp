import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const MODULES_BY_TAB = {
  ops: {
    label: 'OPERATIONS',
    items: [
      { name: 'StockFlow', status: 'LIVE', isLive: true },
      { name: 'LedgerStock', status: 'LIVE', isLive: true }
    ]
  },
  mfg: {
    label: 'MANUFACTURING',
    items: [
      { name: 'MaterialHub',   status: 'LIVE',    isLive: true  },
      { name: 'RFQManagement', status: 'LIVE',    isLive: true  },
      { name: 'POManagement',  status: 'LIVE',    isLive: true  },
      { name: 'BuildOrder',    status: 'PHASE 2', isLive: false },
      { name: 'QualityGate',   status: 'PHASE 2', isLive: false }
    ]
  },
  com: {
    label: 'COMMERCE',
    items: [
      { name: 'DealFlow', status: 'PHASE 3', isLive: false },
      { name: 'RouteRunner', status: 'PHASE 3', isLive: false }
    ]
  },
  sys: {
    label: 'SYSTEM',
    items: [
      { name: 'Audit log', status: 'LIVE', isLive: true },
      { name: 'Users & roles', status: 'LIVE', isLive: true }
    ]
  },
  cfg: {
    label: 'CONFIG',
    items: [
      { name: 'Setup', status: 'LIVE', isLive: true },
      { name: 'Pricing Engine', status: 'LIVE', isLive: true },
      { name: 'Tenants', status: 'LIVE', isLive: true },
      { name: 'Org Structure', status: 'LIVE', isLive: true },
      { name: 'Module config', status: 'LIVE', isLive: true },
      { name: 'Notifications', status: 'LIVE', isLive: true }
    ]
  }
};

const Sidebar: React.FC = () => {
  const { currentTab, currentModule, setModule } = useAppStore();

  const tabData = MODULES_BY_TAB[currentTab];

  if (!tabData) return <aside className="sidebar"></aside>;

  return (
    <aside className="sidebar">
      <div className="nav-group-label">— {tabData.label} —</div>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tabData.items.map(item => (
          <button 
            key={item.name}
            className={`nav-item ${currentModule === item.name ? 'active' : ''}`}
            onClick={() => setModule(item.name)}
          >
            <div className="nav-text">
              <span className={`nav-dot ${item.isLive ? 'live' : 'planned'}`} />
              <span style={{ fontSize: '12px' }}>{item.name}</span>
            </div>
            <span className="nav-badge">
              [{item.status}]
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
