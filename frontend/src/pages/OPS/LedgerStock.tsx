import React, { useState, useEffect, useCallback } from 'react';
import { api, apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea, InlineAlert } from '@/components/ui/Form';
import { SectionTabs } from '@/components/ui/SectionTabs';
import { cn } from '@/lib/cn';

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
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const { appendTraceStep } = useAppStore();

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();

    const handleWsMessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'stock_update') {
          setMovements(prev => [{
            hu_code: msg.payload.hu_code,
            event_type: msg.payload.event_type,
            quantity: msg.payload.delta,
            product_code: msg.payload.product_code,
            zone_code: msg.payload.zone_code,
            created_at: msg.payload.timestamp,
            _new: true
          }, ...prev.slice(0, 49)]);

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
  }, [fetchData]);

  const handleAdjust = async () => {
    if (!adjustingHU || !adjustValue || !adjustReason) return;
    setAdjustError(null);
    try {
      await api.adjustStock({
        hu_id: adjustingHU.hu_id,
        physical_count: parseFloat(adjustValue),
        reason: adjustReason
      });
      setAdjustingHU(null);
      setAdjustValue('');
      setAdjustReason('');
      if (selectedProduct) {
        const detail = await api.getStockProductDetail(selectedProduct.product.product_id);
        setSelectedProduct(detail);
      }
      fetchData();
    } catch (err: any) {
      setAdjustError(err.message || 'Adjustment failed');
    }
  };

  const getZoneColor = (type: string) => {
    switch(type) {
      case 'RECEIVING': return 'text-blue-400 border-blue-400';
      case 'STORAGE': return 'text-slate-400 border-slate-400';
      case 'PRODUCTION': return 'text-amber-400 border-amber-400';
      case 'DISPATCH': return 'text-green-400 border-green-400';
      case 'QC': return 'text-red-400 border-red-400';
      default: return 'text-[var(--text-3)] border-[var(--border)]';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Module Header */}
      <div className="p-8 border-b border-[var(--border)] bg-white/[0.01] flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">LedgerStock</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Real-time inventory intelligence derived from ledger events.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => window.open(`${apiClient.defaults.baseURL}/api/stock/products?format=csv`, '_blank')}>
            EXPORT CSV
          </Button>
          <Button variant="primary" onClick={fetchData}>
            REFRESH
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <SectionTabs
        tabs={[
          { key: 'overview', label: 'Stock Overview' },
          { key: 'history', label: 'Movement History' },
          { key: 'alerts', label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        className="px-8"
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="PRODUCTS IN STOCK" value={overview?.total_products_with_stock || 0} icon="📦" />
              <KpiCard label="HANDLING UNITS" value={overview?.total_hu_count || 0} icon="📦" />
              <KpiCard label="ZONES OCCUPIED" value={overview?.total_zones_occupied || 0} icon="📍" />
              <KpiCard label="LAST MOVEMENT" value={overview?.last_movement_at ? new Date(overview.last_movement_at).toLocaleTimeString() : 'N/A'} icon="🕒" />
            </div>

            {/* Product Table */}
            <Card>
              <CardHeader title="Stock On Hand" />
              <CardBody>
                <DataTable
                  columns={[
                    { key: 'product_code', header: 'CODE', mono: true, className: 'text-[var(--accent)] font-bold' },
                    { key: 'product_name', header: 'NAME' },
                    { key: 'base_unit', header: 'UNIT', width: '60px', className: 'opacity-50' },
                    { key: 'total_quantity', header: 'QTY', className: 'font-bold text-right', render: (p) => p.total_quantity.toLocaleString() },
                    { key: 'total_hu_count', header: 'HUs', className: 'text-center', render: (p) => <Badge variant="gray">{p.total_hu_count}</Badge> },
                    { key: 'zone_count', header: 'ZONES', className: 'text-center' },
                    { 
                      key: 'actions', 
                      header: '', 
                      className: 'text-right',
                      render: (p) => (
                        <Button variant="ghost" size="sm" onClick={async () => {
                          const detail = await api.getStockProductDetail(p.product_id);
                          setSelectedProduct(detail);
                        }}>👁️ Details</Button>
                      )
                    },
                  ]}
                  rows={products}
                />
              </CardBody>
            </Card>

            {/* Zone Map View */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--text-3)]">Zone Map</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {zones.map(z => (
                  <Card 
                    key={z.zone_id} 
                    className={cn(
                      "cursor-pointer hover:ring-1 hover:ring-[var(--accent)] transition-all",
                      selectedZone?.zone_id === z.zone_id ? "ring-1 ring-[var(--accent)] bg-[var(--accent-dim)]" : ""
                    )}
                    onClick={() => setSelectedZone(z)}
                  >
                    <CardBody className="p-4 space-y-3">
                      <div className={cn("text-[10px] font-bold tracking-tighter uppercase border-l-2 pl-2", getZoneColor(z.zone_type))}>
                        {z.zone_type}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-[var(--text-1)] leading-tight">{z.zone_code}</div>
                        <div className="text-[10px] text-[var(--text-3)] mt-0.5">{z.site_code}</div>
                      </div>
                      <div className="flex justify-between text-[11px] border-t border-[var(--border)] pt-3">
                        <span className="text-[var(--text-3)]">Products: <b className="text-[var(--text-2)]">{z.product_count}</b></span>
                        <span className="text-[var(--text-3)]">Qty: <b className="text-[var(--text-2)]">{z.total_quantity}</b></span>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardBody>
              <DataTable
                columns={[
                  { key: 'created_at', header: 'TIMESTAMP', render: (m) => new Date(m.created_at).toLocaleString(), className: 'opacity-50 text-[11px]' },
                  { 
                    key: 'event_type', 
                    header: 'TYPE',
                    render: (m) => (
                      <Badge variant={m.event_type === 'GR' ? 'green' : 'gray'}>{m.event_type}</Badge>
                    )
                  },
                  { key: 'hu_code', header: 'HU CODE', mono: true, className: 'font-semibold' },
                  { key: 'product_code', header: 'PRODUCT', mono: true },
                  { 
                    key: 'quantity', 
                    header: 'QTY', 
                    className: 'text-right font-bold',
                    render: (m) => (
                      <span className={m.quantity < 0 ? 'text-red-400' : 'text-green-400'}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                    )
                  },
                  { key: 'zone_code', header: 'ZONE', className: 'text-center' },
                  { key: 'ref', header: 'REFERENCE', render: (m) => `${m.reference_type} ${m.reference_id}`, className: 'opacity-40 text-[11px]' },
                ]}
                rows={movements}
              />
            </CardBody>
          </Card>
        )}

        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alerts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-[var(--border)] rounded-2xl">
                <span className="text-5xl mb-6">✅</span>
                <h3 className="text-xl font-bold text-green-400">No stock alerts</h3>
                <p className="text-sm text-[var(--text-3)] mt-2">All inventory is in expected states</p>
              </div>
            ) : (
              alerts.map((a, i) => (
                <Card key={i} className={cn("border-l-4", a.severity === 'red' ? "border-l-red-500" : "border-l-amber-500")}>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">{a.type}</span>
                      <Badge variant={a.severity === 'red' ? 'red' : 'amber'}>URGENT</Badge>
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[var(--text-1)]">{a.hu_code || a.product_code}</h4>
                      <p className="text-xs text-[var(--text-3)] mt-1">{a.product_name}</p>
                    </div>
                    <p className="text-[11px] text-[var(--text-2)] bg-white/5 p-2 rounded">
                      {a.type === 'STUCK_RECEIVING' ? `In ${a.zone_code} for ${Math.round((Date.now() - new Date(a.last_event).getTime())/3600000)} hours` : `Depleted since ${new Date(a.last_seen).toLocaleDateString()}`}
                    </p>
                    <Button variant="ghost" size="sm" className="w-full">VIEW HISTORY</Button>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail Slide-over */}
      {selectedProduct && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-[var(--bg-surface2)] border-l border-[var(--border)] z-[100] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-white/[0.02]">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-1)] leading-tight">
                <span className="text-[var(--accent)]">{selectedProduct.product.product_code}</span>
                <br />
                <span className="text-sm font-medium text-[var(--text-3)]">{selectedProduct.product.product_name}</span>
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)} className="rounded-full w-8 h-8 p-0">
              &times;
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-[var(--border)]">
                   <div className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1">Total Stock</div>
                   <div className="text-2xl font-bold text-[var(--text-1)]">{selectedProduct.product.total_quantity} <span className="text-xs text-[var(--text-3)]">{selectedProduct.product.base_unit}</span></div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-[var(--border)]">
                   <div className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1">Active HUs</div>
                   <div className="text-2xl font-bold text-[var(--text-1)]">{selectedProduct.product.total_hu_count}</div>
                </div>
             </div>

             <section className="space-y-4">
                <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest border-b border-[var(--border)] pb-2">ZONE BREAKDOWN</h4>
                <div className="space-y-2">
                  {selectedProduct.zone_breakdown?.map((z: any) => (
                    <div key={z.zone_code} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-[var(--border)] text-sm">
                      <span className="text-[var(--text-2)]">{z.zone_code} <span className="text-[10px] opacity-40 ml-2">{z.zone_type}</span></span>
                      <b className="text-[var(--text-1)]">{z.quantity}</b>
                    </div>
                  ))}
                </div>
             </section>

             <section className="space-y-4">
                <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest border-b border-[var(--border)] pb-2">HANDLING UNITS</h4>
                <div className="space-y-3">
                  {selectedProduct.hu_list?.map((hu: any) => (
                    <Card key={hu.hu_code} className="bg-white/[0.03]">
                      <CardBody className="p-4 space-y-3">
                         <div className="flex justify-between items-center">
                            <b className="text-[var(--accent)] font-mono">{hu.hu_code}</b>
                            <b className="text-[var(--text-1)]">{hu.quantity} {selectedProduct.product.base_unit}</b>
                         </div>
                         <div className="text-[11px] text-[var(--text-3)] flex gap-4">
                            <span>Location: <b className="text-[var(--text-2)]">{hu.zone_code}</b></span>
                            <span>Last: <b className="text-[var(--text-2)]">{hu.last_event_type}</b></span>
                         </div>
                         <Button variant="secondary" size="sm" onClick={() => setAdjustingHU(hu)} className="w-full text-[10px] h-8">
                           MANUAL ADJUST
                         </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
             </section>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      <Modal
        open={!!adjustingHU}
        onClose={() => setAdjustingHU(null)}
        title={`Adjust Stock: ${adjustingHU?.hu_code}`}
        subtitle={`Current system quantity: ${adjustingHU?.quantity}`}
      >
        <div className="space-y-6">
          {adjustError && <InlineAlert type="error" message={adjustError} />}
          
          <Field label="PHYSICAL COUNT">
            <Input type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} autoFocus />
          </Field>

          <Field label="REASON FOR ADJUSTMENT">
            <Textarea 
              value={adjustReason} 
              onChange={e => setAdjustReason(e.target.value)}
              placeholder="e.g. Recount after weekly audit"
              className="h-24"
            />
          </Field>

          <div className="flex gap-3 mt-8">
             <Button variant="primary" onClick={handleAdjust} className="flex-1">POST ADJUSTMENT</Button>
             <Button variant="ghost" onClick={() => setAdjustingHU(null)} className="flex-1">CANCEL</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default LedgerStock;
