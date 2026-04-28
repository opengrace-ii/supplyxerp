import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { InlineAlert } from "@/components/ui/Form";
import { cn } from "@/lib/cn";
import { apiClient } from "@/api/client";

const MODULE_LIST = [
  { id: 'stockflow',        name: 'StockFlow',          desc: 'Warehouse operations',             status: 'LIVE' },
  { id: 'materialhub',      name: 'MaterialHub',         desc: 'Product and supplier management',  status: 'LIVE' },
  { id: 'purchase_orders',  name: 'Purchase Orders',     desc: 'Full procurement lifecycle',       status: 'LIVE' },
  { id: 'supply_pacts',     name: 'Supply Pacts',        desc: 'Long-term supplier agreements',    status: 'LIVE' },
  { id: 'dealflow',         name: 'DealFlow',            desc: 'Customer sales orders',            status: 'LIVE' },
  { id: 'routerunner',      name: 'RouteRunner',         desc: 'Shipment and dispatch',            status: 'LIVE' },
  { id: 'buildorders',      name: 'Build Orders',        desc: 'Production planning',              status: 'LIVE' },
  { id: 'qualitygate',      name: 'Quality Gate',        desc: 'Inspection and QC',                status: 'LIVE' },
  { id: 'vendorscorecard',  name: 'Vendor Scorecard',    desc: 'Supplier performance',             status: 'LIVE' },
  { id: 'priceformulas',    name: 'Price Formulas',      desc: 'Pricing rules',                    status: 'LIVE' },
  { id: 'documentdispatch', name: 'Document Dispatch',   desc: 'Automated notifications',          status: 'LIVE' },
  { id: 'payroll',          name: 'Payroll',             desc: 'Coming soon',                      status: 'COMING SOON' },
  { id: 'crm',              name: 'CRM',                 desc: 'Coming soon',                      status: 'COMING SOON' },
  { id: 'analytics',        name: 'Analytics Dashboard', desc: 'Coming soon',                      status: 'COMING SOON' },
];

const defaultModules = (): Record<string, boolean> => {
  const d: Record<string, boolean> = {};
  MODULE_LIST.forEach(m => { if (m.status === 'LIVE') d[m.id] = true; });
  return d;
};

export default function ModuleConfig() {
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>(defaultModules());
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    apiClient.get<{ data: Record<string, boolean> }>('/api/config/modules')
      .then(res => {
        const data = res.data.data ?? {};
        setActiveModules(Object.keys(data).length === 0 ? defaultModules() : data);
      })
      .catch(() => setActiveModules(defaultModules()))
      .finally(() => setLoading(false));
  }, []);

  const toggleModule = (id: string, checked: boolean) => {
    setActiveModules(prev => ({ ...prev, [id]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/api/config/modules', activeModules);
      setSaveStatus({ type: 'success', message: 'Configuration saved' });
    } catch {
      setSaveStatus({ type: 'error', message: 'Failed to save — please retry' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: 'var(--text-3)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8 space-y-8 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>Module Configuration</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Control which functional modules are active for your organisation</p>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus && <InlineAlert type={saveStatus.type} message={saveStatus.message} />}
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULE_LIST.map(m => (
          <Card key={m.id} className={cn(
            "transition-opacity duration-200",
            m.status === 'COMING SOON' ? "opacity-50" : "opacity-100"
          )}>
            <CardBody className="space-y-4">
              <div className="flex justify-between items-start">
                <Badge variant={m.status === 'LIVE' ? 'green' : 'gray'}>{m.status}</Badge>
                <Switch
                  checked={!!activeModules[m.id]}
                  onCheckedChange={(v) => toggleModule(m.id, v)}
                  disabled={m.status === 'COMING SOON'}
                />
              </div>
              <div>
                <div className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{m.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{m.desc}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
