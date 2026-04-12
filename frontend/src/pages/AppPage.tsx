import React from 'react';
import Shell from '../components/layout/Shell';
import { useAppStore } from '../store/useAppStore';
import LoginPage from './LoginPage';

const AppPage: React.FC = () => {
  const { currentModule, user } = useAppStore();

  if (!user) {
    return <LoginPage />;
  }

  const renderModule = () => {
    switch(currentModule) {
      case 'StockFlow':
        return <div style={{padding: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)'}}>StockFlow Shell (Coming in Phase 2/3)</div>;
      case 'LedgerStock':
      case 'Audit log':
      case 'Users & roles':
        return <div style={{padding: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-primary)'}}>{currentModule} Shell</div>;
      default:
        // Coming soon screen
        return (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 'var(--space-8)'}}>
            <div className="card" style={{maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center', textAlign: 'center'}}>
              <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-inverse)'}}>{currentModule}</h2>
              <div style={{color: 'var(--color-warning)'}}>Coming in Phase 2/3</div>
              <p style={{color: 'var(--color-text-muted)'}}>This module is currently under active development as part of the ERPLite expansion path based on SAP core principles.</p>
              <button className="btn btn-primary" style={{marginTop: 'var(--space-4)'}}>Notify me when live</button>
            </div>
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
