import React from 'react';
import Shell from '../components/layout/Shell';
import { useAppStore } from '../store/useAppStore';
import LoginPage from './LoginPage';
import StockFlowPanel from '../components/operation/StockFlowPanel';
import Tenants from './Config/Tenants';
import MaterialHub from './MFG/MaterialHub';
import OrgStructure from './Config/OrgStructure';

const AppPage: React.FC = () => {
  const { currentModule, user } = useAppStore();

  if (!user) {
    return <LoginPage />;
  }

  const renderModule = () => {
    switch(currentModule) {
      case 'StockFlow':
        return <StockFlowPanel />;
      case 'Tenants':
        return <Tenants />;
      case 'Org Structure':
        return <OrgStructure />;
      case 'MaterialHub':
        return <MaterialHub />;
      case 'LedgerStock':
      case 'Audit log':
      case 'Users & roles':
      case 'Module config':
      case 'Notifications':
        return <div style={{padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--theme-accent)'}}>{currentModule} Live Module</div>;
      default:
        // Coming soon screen
        return (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            justifyContent: 'center', height: '100%', padding: '32px'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px', fontSize: '24px'
            }}>
              🚧
            </div>
            
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--theme-accent)', marginBottom: '8px' }}>
              {currentModule}
            </h2>
            
            <div style={{
              fontSize: '11px', borderRadius: '99px', backgroundColor: 'var(--theme-light)',
              color: 'var(--theme-accent)', padding: '2px 8px', marginBottom: '16px', fontWeight: '600'
            }}>
              PHASE 2 / 3
            </div>
            
            <p style={{
              fontSize: '13px', color: '#888', maxWidth: '300px', 
              textAlign: 'center', lineHeight: '1.6', marginBottom: '24px'
            }}>
              This module is currently under active development. Core functionalities will be available in the upcoming rollout phase.
            </p>
            
            <button className="btn" style={{
              backgroundColor: 'transparent', border: '1px solid var(--theme-border)',
              color: '#aaa'
            }}>
              Notify me when live
            </button>
          </div>
        );
    }
  };

  return (
    <Shell>
      {renderModule()}
    </Shell>
  );
};

export default AppPage;
