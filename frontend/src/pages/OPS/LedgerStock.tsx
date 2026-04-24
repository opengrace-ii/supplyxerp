import React, { useState, useEffect, useRef } from 'react';
import { api, apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

interface StockStat {
  label: string;
  value: string | number;
  icon: string;
}

const LedgerStock: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'alerts'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Slide-ins
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [adjustingHU, setAdjustingHU] = useState<any>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const { appendTraceStep } = useAppStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ov, prodRes, zoneRes, alertRes, movRes] = await Promise.all([
        api.getStockOverview(),
        api.listStockProducts({ limit: 50 }),
        api.listStockZones(),
        api.getStockAlerts(),
        api.listStockMovements({ page: 1 })
      ]);
      setOverview(ov);
      setProducts(prodRes.products || []);
      setZones(zoneRes || []);
      setAlerts(alertRes || []);
      setMovements(movRes || []);
    } catch (err) {
      console.error('Failed to fetch stock data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // WebSocket Listener
    const handleWsMessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'stock_update') {
          // 1. Prepend movement
          setMovements(prev => [{
            hu_code: msg.payload.hu_code,
            event_type: msg.payload.event_type,
            quantity: msg.payload.delta,
            product_code: msg.payload.product_code,
            zone_code: msg.payload.zone_code,
            created_at: msg.payload.timestamp,
            _new: true
          }, ...prev.slice(0, 49)]);

          // 2. Refresh overview and alerts
          api.getStockOverview().then(setOverview);
          api.getStockAlerts().then(setAlerts);
        }
      } catch (err) {}
    };

    const ws = (window as any).supplyxerpWs;
    if (ws) ws.addEventListener('message', handleWsMessage);
    return () => {
        if (ws) ws.removeEventListener('message', handleWsMessage);
    };
  }, []);

  const handleAdjust = async () => {
    if (!adjustingHU || !adjustValue || !adjustReason) return;
    try {
      await api.adjustStock({
        hu_id: adjustingHU.hu_id,
        physical_count: parseFloat(adjustValue),
        reason: adjustReason
      });
      setAdjustingHU(null);
      setAdjustValue('');
      setAdjustReason('');
      // Refresh details if open
      if (selectedProduct) {
        const detail = await api.getStockProductDetail(selectedProduct.product.product_id);
        setSelectedProduct(detail);
      }
      fetchData();
    } catch (err) {
      alert('Adjustment failed');
    }
  };

  const stats: StockStat[] = [
    { label: 'Products in Stock', value: overview?.total_products_with_stock || 0, icon: '📦' },
    { label: 'Handling Units', value: overview?.total_hu_count || 0, icon: '📦' },
    { label: 'Zones Occupied', value: overview?.total_zones_occupied || 0, icon: '📍' },
    { label: 'Last Movement', value: overview?.last_movement_at ? new Date(overview.last_movement_at).toLocaleTimeString() : 'N/A', icon: '🕒' },
  ];

  const getZoneColor = (type: string) => {
    switch(type) {
      case 'RECEIVING': return '#3b82f6';
      case 'STORAGE': return '#64748b';
      case 'PRODUCTION': return '#f59e0b';
      case 'DISPATCH': return '#22c55e';
      case 'QC': return '#ef4444';
      default: return '#1e293b';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      {/* Module Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em' }}>LedgerStock</h1>
          <p style={{ fontSize: '13px', color: '#888' }}>Real-time inventory intelligence derived from ledger events.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.open(`${apiClient.defaults.baseURL}/api/stock/products?format=csv`, '_blank')} className="btn btn-secondary">EXPORT CSV</button>
          <button onClick={fetchData} className="btn btn-primary">REFRESH</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ribbon-tabs" style={{ padding: '0 24px', borderBottom: '1px solid #1a1a1a' }}>
        <button onClick={() => setActiveTab('overview')} className={`ribbon-tab ${activeTab === 'overview' ? 'active' : ''}`}>Stock Overview</button>
        <button onClick={() => setActiveTab('history')} className={`ribbon-tab ${activeTab === 'history' ? 'active' : ''}`}>Movement History</button>
        <button onClick={() => setActiveTab('alerts')} className={`ribbon-tab ${activeTab === 'alerts' ? 'active' : ''}`}>
          Alerts {alerts.length > 0 && <span style={{ marginLeft: '8px', background: '#ef4444', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>{alerts.length}</span>}
        </button>
      </div>

      <div className="working-area" style={{ padding: '24px' }}>
        
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {stats.map(s => (
                <div key={s.label} className="glass" style={{ padding: '20px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--techlogix-slate)', marginBottom: '8px', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>{s.icon} {s.value}</div>
                </div>
              ))}
            </div>

            {/* Product Table */}
            <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Stock On Hand</h3>
                <input type="text" placeholder="Search product..." className="input-scanner" style={{ width: '240px' }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)', fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Product Code</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Product Name</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px' }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px' }}>Qty On Hand</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px' }}>HUs</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px' }}>Zones</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '13px' }}>
                  {products.map(p => (
                    <tr key={p.product_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--theme-accent)' }}>{p.product_code}</td>
                      <td style={{ padding: '12px 16px' }}>{p.product_name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', opacity: 0.6 }}>{p.base_unit}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700' }}>{p.total_quantity.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                         <span className="nav-badge">{p.total_hu_count}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                         <span style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{p.zone_count}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button onClick={async () => {
                          const detail = await api.getStockProductDetail(p.product_id);
                          setSelectedProduct(detail);
                        }} className="btn btn-secondary" style={{ padding: '4px 8px', height: '28px' }}>👁️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Zone Map View */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Zone Map</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {zones.map(z => (
                  <div 
                    key={z.zone_id} 
                    onClick={() => setSelectedZone(z)}
                    className="glass" 
                    style={{ 
                      padding: '16px', borderRadius: '8px', cursor: 'pointer',
                      borderLeft: `4px solid ${getZoneColor(z.zone_type)}`,
                      transition: 'transform 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: '700', color: getZoneColor(z.zone_type), marginBottom: '4px' }}>{z.zone_type}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700' }}>{z.zone_code}</div>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '12px' }}>{z.site_code}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                       <span>Products: <b>{z.product_count}</b></span>
                       <span>Qty: <b>{z.total_quantity}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Movement History */}
        {activeTab === 'history' && (
          <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(255,255,255,0.02)', fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Timestamp</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>HU Code</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Product</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px' }}>Qty</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>Zone</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Ref</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px' }}>
                {movements.map((m, idx) => (
                  <tr key={idx} style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    animation: m._new ? 'pulse 2s' : 'none',
                    background: m._new ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                  }}>
                    <td style={{ padding: '12px 16px', opacity: 0.5 }}>{new Date(m.created_at).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                        background: m.event_type === 'GR' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: m.event_type === 'GR' ? '#22c55e' : '#fff'
                      }}>{m.event_type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{m.hu_code}</td>
                    <td style={{ padding: '12px 16px' }}>{m.product_code}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: m.quantity < 0 ? '#ef4444' : '#22c55e' }}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{m.zone_code}</td>
                    <td style={{ padding: '12px 16px', opacity: 0.5 }}>{m.reference_type} {m.reference_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Alerts */}
        {activeTab === 'alerts' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {alerts.length === 0 ? (
              <div className="glass" style={{ padding: '48px', textAlign: 'center', gridColumn: '1/-1', borderRadius: '12px' }}>
                <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>✅</span>
                <h3 style={{ color: '#22c55e', fontSize: '18px', fontWeight: '700' }}>No stock alerts.</h3>
                <p style={{ color: '#888' }}>All HUs are in expected states and locations.</p>
              </div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="glass" style={{ padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${a.severity === 'red' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', opacity: 0.6 }}>{a.type}</span>
                    <span style={{ fontSize: '10px', background: a.severity === 'red' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: a.severity === 'red' ? '#ef4444' : '#f59e0b', padding: '1px 6px', borderRadius: '4px' }}>URGENT</span>
                  </div>
                  <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>{a.hu_code || a.product_code} {a.product_name}</h4>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
                      {a.type === 'STUCK_RECEIVING' ? `In ${a.zone_code} for ${Math.round((Date.now() - new Date(a.last_event).getTime())/3600000)} hours` : `Depleted since ${new Date(a.last_seen).toLocaleDateString()}`}
                  </p>
                  <button className="btn btn-secondary" style={{ width: '100%', height: '32px' }}>VIEW HISTORY</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail slide sidepanels */}
      {selectedProduct && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '450px', background: '#111', borderLeft: '1px solid #2a2a2a', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px' }}><span style={{ color: 'var(--theme-accent)' }}>{selectedProduct.product.product_code}</span> {selectedProduct.product.product_name}</h2>
            <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
             <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                <div style={{ flex: 1 }}>
                   <div style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase' }}>Total Stock</div>
                   <div style={{ fontSize: '24px', fontWeight: '700' }}>{selectedProduct.product.total_quantity} {selectedProduct.product.base_unit}</div>
                </div>
                <div style={{ flex: 1 }}>
                   <div style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase' }}>Active HUs</div>
                   <div style={{ fontSize: '24px', fontWeight: '700' }}>{selectedProduct.product.total_hu_count}</div>
                </div>
             </div>

             <h4 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '16px', color: '#666', borderBottom: '1px solid #222', paddingBottom: '8px' }}>ZONE BREAKDOWN</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
                {selectedProduct.zone_breakdown?.map((z: any) => (
                  <div key={z.zone_code} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px' }}>
                    <span>{z.zone_code} ({z.zone_type})</span>
                    <b>{z.quantity}</b>
                  </div>
                ))}
             </div>

             <h4 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '16px', color: '#666', borderBottom: '1px solid #222', paddingBottom: '8px' }}>HANDLING UNITS</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedProduct.hu_list?.map((hu: any) => (
                  <div key={hu.hu_code} className="glass" style={{ padding: '12px', borderRadius: '8px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <b style={{ color: 'var(--theme-accent)' }}>{hu.hu_code}</b>
                        <b>{hu.quantity} {selectedProduct.product.base_unit}</b>
                     </div>
                     <div style={{ fontSize: '11px', opacity: 0.5 }}>Location: {hu.zone_code} | Last: {hu.last_event_type}</div>
                     <button onClick={() => setAdjustingHU(hu)} className="btn btn-secondary" style={{ marginTop: '12px', height: '28px', fontSize: '10px', width: '100%' }}>MANUAL ADJUST</button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustingHU && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass" style={{ width: '400px', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '8px' }}>Adjust Stock: {adjustingHU.hu_code}</h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>Current system quantity: {adjustingHU.quantity}</p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#666' }}>PHYSICAL COUNT</label>
              <input type="number" className="input-scanner" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', color: '#666' }}>REASON FOR ADJUSTMENT</label>
              <textarea 
                className="input-scanner" 
                style={{ height: '80px', paddingTop: '8px' }} 
                value={adjustReason} 
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="e.g. Recount after weekly audit"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
               <button onClick={handleAdjust} className="btn btn-primary" style={{ flex: 1 }}>POST ADJUSTMENT</button>
               <button onClick={() => setAdjustingHU(null)} className="btn btn-secondary" style={{ flex: 1 }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LedgerStock;
