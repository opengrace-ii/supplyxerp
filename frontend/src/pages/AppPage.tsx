import React, { useEffect } from 'react';
import { TopBar } from './layout/TopBar';
import { Sidebar } from './layout/Sidebar';
import { useAppStore } from '../store/useAppStore';
import { useSectionStore } from '../store/sectionStore';
import LoginPage from './LoginPage';
import StockFlowPanel from '../components/operation/StockFlowPanel';
import Tenants from './Config/Tenants';
import MaterialHub from './MFG/MaterialHub';
import OrgStructure from './Config/OrgStructure';
import Setup from './Config/Setup';
import PricingConfig from './Config/PricingConfig';
import LedgerStock from './OPS/LedgerStock';
import POManagement from './MFG/POManagement';
import RFQManagement from './MFG/RFQManagement';
import POBlockCancel from './MFG/POBlockCancel';
import POAccountAssignment from './MFG/POAccountAssignment';
import POProgressTracking from './MFG/POProgressTracking';
import SupplyPacts from './COM/SupplyPacts';
import VendorScorecard from './COM/VendorScorecard';
import PriceFormulas from './Config/PriceFormulas';
import DocumentDispatch from './Config/DocumentDispatch';
import SystemLog from './SYSTEM/SystemLog';
import AuditLog from './SYSTEM/AuditLog';
import DeliveryConfirmation from './MFG/DeliveryConfirmation';
import InvoiceMatch from './MFG/InvoiceMatch';
import UsersRoles from './SYSTEM/UsersRoles';
import BuildOrder from './MFG/BuildOrder';
import QualityGate from './MFG/QualityGate';
import DealFlow from './COM/DealFlow';
import RouteRunner from './COM/RouteRunner';
import ModuleConfig from './Config/ModuleConfig';
import Notifications from './Config/Notifications';

const AppPage: React.FC = () => {
  const { currentModule, currentTab, user, isAuthLoading, checkSession } = useAppStore();
  const { setSection } = useSectionStore();

  useEffect(() => {
    if (user && !(window as any).supplyxerpWs) {
      console.log("Initializing global WebSocket...");
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:8080/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => console.log("WebSocket connected");
      ws.onclose = () => {
        console.log("WebSocket disconnected, retrying...");
        delete (window as any).supplyxerpWs;
      };
      
      (window as any).supplyxerpWs = ws;
    }
  }, [user]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);



  if (isAuthLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }}>
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderModule = () => {
    switch(currentModule) {
      case 'StockFlow':
        return <StockFlowPanel />;
      case 'Setup':
        return <Setup />;
      case 'Pricing Engine':
        return <PricingConfig />;
      case 'Tenants':
        return <Tenants />;
      case 'Org Structure':
        return <OrgStructure />;
      case 'MaterialHub':
        return <MaterialHub />;
      case 'LedgerStock':
        return <LedgerStock />;
      case 'RFQManagement':
        return <RFQManagement />;
      case 'POManagement':
        return <POManagement />;
      case 'PO Block/Cancel':
        return <POBlockCancel />;
      case 'PO Account Assignment':
        return <POAccountAssignment />;
      case 'Progress Tracking':
        return <POProgressTracking />;
      case 'Supply Pacts':
        return <SupplyPacts />;
      case 'Vendor Scorecards':
        return <VendorScorecard />;
      case 'Price Formulas':
        return <PriceFormulas />;
      case 'Document Dispatch':
        return <DocumentDispatch />;
      case 'System Log':
        return <SystemLog />;
      case 'Audit log':
        return <AuditLog />;
      case 'Users & roles':
        return <UsersRoles />;
      case 'Delivery confirmation':
        return <DeliveryConfirmation />;
      case 'Invoice matching':
        return <InvoiceMatch />;
      case 'BuildOrder':
        return <BuildOrder />;
      case 'QualityGate':
        return <QualityGate />;
      case 'DealFlow':
        return <DealFlow />;
      case 'RouteRunner':
        return <RouteRunner />;
      case 'Module config':
        return <ModuleConfig />;
      case 'Notifications':
        return <Notifications />;
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
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--topbar-height, 46px) 1fr',
        gridTemplateColumns: 'auto 1fr',  // auto = sidebar width
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-base)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <TopBar />
      <Sidebar />
      <main style={{ background: 'var(--bg-base)', overflowY: 'auto' }}>
        {renderModule()}
      </main>
    </div>
  );
};

export default AppPage;
