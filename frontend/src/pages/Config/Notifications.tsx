import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Field, Input, InlineAlert } from "@/components/ui/Form";
import { cn } from "@/lib/cn";

export default function Notifications() {
  const [config, setConfig] = useState({
    email: { enabled: false, host: '', port: '', user: '', pass: '', from: '' },
    inApp: {
      enabled: true,
      events: { poCreated: true, grPosted: true, qcFailed: true, invException: false, dispatch: true, buildDone: true }
    },
    webhook: { enabled: false, url: '', secret: '', events: '' }
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sx-notifications');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSaveAll = () => {
    localStorage.setItem('sx-notifications', JSON.stringify(config));
    setSaveStatus("Configuration saved successfully");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const updateConfig = (channel: 'email' | 'inApp' | 'webhook', field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value
      }
    }));
  };

  const updateInAppEvent = (event: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      inApp: {
        ...prev.inApp,
        events: { ...prev.inApp.events, [event]: checked }
      }
    }));
  };

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 bg-[var(--bg-base)]">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white/95">Notifications</h1>
          <p className="text-sm text-[var(--text-2)] mt-2">Configure when and how the system alerts your team</p>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus && <span className="text-xs text-green-400 font-medium">{saveStatus}</span>}
          <Button variant="primary" onClick={handleSaveAll}>Save All Settings</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Card */}
        <Card className={cn("transition-all duration-300", expanded === 'email' ? "ring-1 ring-[var(--accent)]" : "")}>
          <CardHeader 
            title="Email Notifications" 
            action={
              <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === 'email' ? null : 'email')}>
                {expanded === 'email' ? 'Close' : 'Configure'}
              </Button>
            }
          />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">📧</div>
              <p className="text-sm text-[var(--text-3)]">Send automated emails for key business events</p>
            </div>

            {expanded === 'email' && (
              <div className="pt-6 border-t border-[var(--border)] space-y-4 animate-in fade-in slide-in-from-top-2">
                <Field label="From Email Address">
                  <Input value={config.email.from} onChange={e => updateConfig('email', 'from', e.target.value)} placeholder="erp@company.com" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="SMTP Host">
                    <Input value={config.email.host} onChange={e => updateConfig('email', 'host', e.target.value)} placeholder="smtp.provider.com" />
                  </Field>
                  <Field label="SMTP Port">
                    <Input value={config.email.port} onChange={e => updateConfig('email', 'port', e.target.value)} placeholder="587" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Username">
                    <Input value={config.email.user} onChange={e => updateConfig('email', 'user', e.target.value)} />
                  </Field>
                  <Field label="Password">
                    <Input type="password" value={config.email.pass} onChange={e => updateConfig('email', 'pass', e.target.value)} />
                  </Field>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" size="sm" className="flex-1">Test Connection</Button>
                  <Button variant="primary" size="sm" className="flex-1" onClick={handleSaveAll}>Save Config</Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* WhatsApp Card */}
        <Card className="opacity-50 grayscale pointer-events-none">
          <CardBody className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">💬</div>
                <div>
                  <div className="text-base font-bold text-[var(--text-1)]">WhatsApp Business</div>
                  <div className="text-xs text-[var(--text-3)]">Coming in Phase 3</div>
                </div>
              </div>
              <Badge variant="blue">PHASE 3</Badge>
            </div>
          </CardBody>
        </Card>

        {/* In-App Notifications Card */}
        <Card>
          <CardHeader 
            title="In-App Notifications" 
            action={
              <Switch 
                checked={config.inApp.enabled} 
                onCheckedChange={(v) => updateConfig('inApp', 'enabled', v)}
              />
            }
          />
          <CardBody className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">🔔</div>
              <p className="text-sm text-[var(--text-3)]">Real-time alerts within the SupplyXERP interface</p>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 pt-2">
              {Object.entries({
                poCreated: 'New PO created',
                grPosted: 'Goods receipt posted',
                qcFailed: 'Quality check failed',
                invException: 'Invoice exception',
                dispatch: 'Shipment dispatched',
                buildDone: 'Build order completed'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-[var(--border)] bg-white/5 text-[var(--accent)] focus:ring-0 focus:ring-offset-0 transition-colors"
                    checked={(config.inApp.events as any)[key]} 
                    onChange={e => updateInAppEvent(key, e.target.checked)} 
                  />
                  <span className="text-xs text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Webhook Card */}
        <Card className={cn("transition-all duration-300", expanded === 'webhook' ? "ring-1 ring-[var(--accent)]" : "")}>
          <CardHeader 
            title="Webhook Delivery" 
            action={
              <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === 'webhook' ? null : 'webhook')}>
                {expanded === 'webhook' ? 'Close' : 'Configure'}
              </Button>
            }
          />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">🔗</div>
              <p className="text-sm text-[var(--text-3)]">POST events to your external business systems</p>
            </div>

            {expanded === 'webhook' && (
              <div className="pt-6 border-t border-[var(--border)] space-y-4 animate-in fade-in slide-in-from-top-2">
                <Field label="Webhook URL">
                  <Input value={config.webhook.url} onChange={e => updateConfig('webhook', 'url', e.target.value)} placeholder="https://api.yourcompany.com/webhook" />
                </Field>
                <Field label="Secret Key (HMAC)">
                  <Input type="password" value={config.webhook.secret} onChange={e => updateConfig('webhook', 'secret', e.target.value)} />
                </Field>
                <Field label="Events (comma separated)">
                  <Input value={config.webhook.events} onChange={e => updateConfig('webhook', 'events', e.target.value)} placeholder="po.created, shipment.dispatched" />
                </Field>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" size="sm" className="flex-1">Test Webhook</Button>
                  <Button variant="primary" size="sm" className="flex-1" onClick={handleSaveAll}>Save Config</Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
