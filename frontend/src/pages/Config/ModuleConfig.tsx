import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { InlineAlert } from "@/components/ui/Form";
import { cn } from "@/lib/cn";

const MODULE_LIST = [
  { id: 'stockflow', name: 'StockFlow', desc: 'Warehouse operations', status: 'LIVE' },
  { id: 'materialhub', name: 'MaterialHub', desc: 'Product and supplier management', status: 'LIVE' },
  { id: 'purchase_orders', name: 'Purchase Orders', desc: 'Full procurement lifecycle', status: 'LIVE' },
  { id: 'supply_pacts', name: 'Supply Pacts', desc: 'Long-term supplier agreements', status: 'LIVE' },
  { id: 'dealflow', name: 'DealFlow', desc: 'Customer sales orders', status: 'LIVE' },
  { id: 'routerunner', name: 'RouteRunner', desc: 'Shipment and dispatch', status: 'LIVE' },
  { id: 'buildorders', name: 'Build Orders', desc: 'Production planning', status: 'LIVE' },
  { id: 'qualitygate', name: 'Quality Gate', desc: 'Inspection and QC', status: 'LIVE' },
  { id: 'vendorscorecard', name: 'Vendor Scorecard', desc: 'Supplier performance', status: 'LIVE' },
  { id: 'priceformulas', name: 'Price Formulas', desc: 'Pricing rules', status: 'LIVE' },
  { id: 'documentdispatch', name: 'Document Dispatch', desc: 'Automated notifications', status: 'LIVE' },
  { id: 'payroll', name: 'Payroll', desc: 'Coming soon', status: 'COMING SOON' },
  { id: 'crm', name: 'CRM', desc: 'Coming soon', status: 'COMING SOON' },
  { id: 'analytics', name: 'Analytics Dashboard', desc: 'Coming soon', status: 'COMING SOON' }
];

export default function ModuleConfig() {
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sx-module-config');
    if (saved) {
      setActiveModules(JSON.parse(saved));
    } else {
      const defaults: Record<string, boolean> = {};
      MODULE_LIST.forEach(m => {
        if (m.status === 'LIVE') defaults[m.id] = true;
      });
      setActiveModules(defaults);
    }
  }, []);

  const toggleModule = (id: string, checked: boolean) => {
    setActiveModules(prev => ({ ...prev, [id]: checked }));
  };

  const handleSave = () => {
    localStorage.setItem('sx-module-config', JSON.stringify(activeModules));
    setSaveStatus("Configuration saved successfully");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Module Configuration</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Control which functional modules are active for your organisation</p>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus && <span className="text-xs text-green-400 font-medium">{saveStatus}</span>}
          <Button variant="primary" onClick={handleSave}>Save Configuration</Button>
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
                <div className="text-base font-bold text-[var(--text-1)]">{m.name}</div>
                <div className="text-xs text-[var(--text-3)] mt-1">{m.desc}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
