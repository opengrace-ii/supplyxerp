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
      { name: 'PO Block/Cancel', status: 'LIVE',   isLive: true  },
      { name: 'PO Account Assignment', status: 'LIVE', isLive: true },
      { name: 'Progress Tracking', status: 'LIVE', isLive: true },
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
      { name: 'System Log', status: 'LIVE', isLive: true },
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

  if (!tabData) return <div className="sidebar" id="sidebar"></div>;

  return (
    <div className="sidebar" id="sidebar">
      <div className="sb-group">{tabData.label}</div>
      {tabData.items.map(item => (
        <div
          key={item.name}
          className={`sb-item ${currentModule === item.name ? 'active' : ''}`}
          onClick={() => setModule(item.name)}
        >
          <div className="sb-icon" style={{ background: 'var(--accent-dim)' }}>{item.name.charAt(0)}</div>
          {item.name}
          {item.isLive ? (
            <div className="sb-dot live"></div>
          ) : (
            <span className="sb-badge">{item.status}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
