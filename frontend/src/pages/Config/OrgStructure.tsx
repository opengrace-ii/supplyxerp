import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select, InlineAlert } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';

// ================================================================
// TYPES
// ================================================================
interface Company { id: number; public_id: string; code: string; name: string; legal_name?: string; tax_id?: string; tax_regime?: string; country_code: string; currency_code: string; city?: string; is_active: boolean; site_count: number; }
interface Site { id: number; public_id: string; code: string; name: string; is_active: boolean; site_type: string; site_purpose?: string; country_code?: string; city?: string; company_id?: number; company_name?: string; calendar_id?: number; calendar_name?: string; zone_count: number; }
interface Calendar { id: number; public_id: string; code: string; name: string; country_code?: string; work_monday: boolean; work_tuesday: boolean; work_wednesday: boolean; work_thursday: boolean; work_friday: boolean; work_saturday: boolean; work_sunday: boolean; daily_work_hours: number; valid_from_year: number; valid_to_year: number; is_active: boolean; exception_count: number; }
interface ProcurementUnit { id: number; public_id: string; code: string; name: string; scope_type: string; currency_code?: string; is_active: boolean; company_name?: string; site_count: number; }
interface ProcurementTeam { id: number; public_id: string; code: string; name: string; description?: string; spending_limit?: number; spending_currency?: string; material_scope?: string[]; is_active: boolean; }

type PanelType = 'tenant' | 'company' | 'site' | 'calendar' | 'procurement-unit' | 'procurement-team';
interface SelectedNode { type: PanelType; id?: number; parentId?: number; }

// ================================================================
// HELPERS
// ================================================================
const TreeItem: React.FC<{ 
  label: string; 
  icon: string; 
  type: PanelType; 
  id?: number; 
  parentId?: number; 
  selected: SelectedNode; 
  onClick: (n: SelectedNode) => void; 
  children?: React.ReactNode; 
  count?: number; 
  indent?: number 
}> = ({ label, icon, type, id, parentId, selected, onClick, children, count, indent = 0 }) => {
  const [open, setOpen] = useState(true);
  const isSelected = selected.type === type && selected.id === id;
  
  return (
    <div className="select-none">
      <div 
        onClick={() => { onClick({ type, id, parentId }); if (children) setOpen(o => !o); }}
        className={cn(
          "flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer transition-all text-[12px]",
          isSelected ? "bg-[var(--accent-dim)] text-[var(--accent)] font-semibold" : "text-[var(--text-2)] hover:bg-white/5 hover:text-[var(--text-1)]"
        )}
        style={{ paddingLeft: `${(indent + 1) * 12}px` }}
      >
        <span className="w-3 text-[10px] opacity-30">
          {children ? (open ? '▾' : '▸') : '•'}
        </span>
        <span className="text-sm">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-3)] font-medium">
            {count}
          </span>
        )}
      </div>
      {open && children}
    </div>
  );
};

// ================================================================
// MAIN COMPONENT
// ================================================================
const OrgStructure: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [procUnits, setProcUnits] = useState<ProcurementUnit[]>([]);
  const [procTeams, setProcTeams] = useState<ProcurementTeam[]>([]);
  const [selected, setSelected] = useState<SelectedNode>({ type: 'tenant' });
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showToast = (m: string, type: 'success' | 'error' = 'success') => { 
    setToast({ message: m, type }); 
    setTimeout(() => setToast(null), 3000); 
  };

  const refresh = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        apiClient.get('/api/org/companies'),
        apiClient.get('/api/org/sites'),
        apiClient.get('/api/org/calendars'),
        apiClient.get('/api/org/procurement-units'),
        apiClient.get('/api/org/procurement-teams'),
      ]);
      
      if (results[0].status === 'fulfilled') setCompanies((results[0].value as any).data?.companies || []);
      if (results[1].status === 'fulfilled') setSites((results[1].value as any).data?.sites || []);
      if (results[2].status === 'fulfilled') setCalendars((results[2].value as any).data?.calendars || []);
      if (results[3].status === 'fulfilled') setProcUnits((results[3].value as any).data?.procurement_units || []);
      if (results[4].status === 'fulfilled') setProcTeams((results[4].value as any).data?.procurement_teams || []);
    } catch (err) {
      console.error("Refresh failed", err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] overflow-hidden animate-in fade-in duration-500">
      <div className="flex justify-between items-end p-8 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Organisational Structure</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Manage tenants, companies, sites and procurement units</p>
        </div>
        <Button variant="ghost" onClick={refresh}>RELOAD STRUCTURE</Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT TREE */}
        <div className="w-[300px] border-r border-[var(--border)] overflow-y-auto bg-white/[0.01] flex flex-col p-4 space-y-6">
        <div>
          <h2 className="text-[10px] font-bold text-[var(--accent)] tracking-widest uppercase opacity-60 mb-4 px-2">
            Organisational Master
          </h2>
          <TreeItem label="Tenant Profile" icon="🏢" type="tenant" selected={selected} onClick={setSelected} />
        </div>

        <div>
          <h2 className="text-[10px] font-bold text-[var(--text-3)] tracking-widest uppercase mb-3 px-2">
            Companies & Sites
          </h2>
          <div className="space-y-1">
            {companies.map(co => (
              <TreeItem key={co.id} label={`${co.code} — ${co.name}`} icon="🏗" type="company" id={co.id} selected={selected} onClick={setSelected} count={co.site_count}>
                {sites.filter(s => s.company_id === co.id).map(s => (
                  <TreeItem key={s.id} label={`${s.code} — ${s.name}`} icon="🏭" type="site" id={s.id} parentId={co.id} selected={selected} onClick={setSelected} count={s.zone_count} indent={1} />
                ))}
                <button 
                  onClick={() => setSelected({ type: 'site', parentId: co.id })}
                  className="w-full text-left py-1 pl-12 text-[11px] text-[var(--text-4)] hover:text-[var(--accent)] transition-colors"
                >
                  + Add Site
                </button>
              </TreeItem>
            ))}
            <button 
              onClick={() => setSelected({ type: 'company' })}
              className="w-full text-left py-1.5 px-5 text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
            >
              + Add Company
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-bold text-[var(--text-3)] tracking-widest uppercase mb-3 px-2">
            Procurement
          </h2>
          <div className="space-y-1">
            {procUnits.map(pu => (
              <TreeItem key={pu.id} label={`${pu.code} — ${pu.name}`} icon="📋" type="procurement-unit" id={pu.id} selected={selected} onClick={setSelected} count={pu.site_count}>
                {procTeams.map(pt => <TreeItem key={pt.id} label={`${pt.code} — ${pt.name}`} icon="👥" type="procurement-team" id={pt.id} selected={selected} onClick={setSelected} indent={1} />)}
              </TreeItem>
            ))}
            <button 
              onClick={() => setSelected({ type: 'procurement-unit' })}
              className="w-full text-left py-1 px-5 text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
            >
              + Add Procurement Unit
            </button>
            <button 
              onClick={() => setSelected({ type: 'procurement-team' })}
              className="w-full text-left py-1 px-5 text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
            >
              + Add Procurement Team
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-bold text-[var(--text-3)] tracking-widest uppercase mb-3 px-2">
            Calendars
          </h2>
          <div className="space-y-1">
            {calendars.map(cal => <TreeItem key={cal.id} label={`${cal.code} — ${cal.name}`} icon="📅" type="calendar" id={cal.id} selected={selected} onClick={setSelected} count={cal.exception_count} />)}
            <button 
              onClick={() => setSelected({ type: 'calendar' })}
              className="w-full text-left py-1.5 px-5 text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
            >
              + Add Calendar
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE PANEL */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-base)] p-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {toast && <InlineAlert type={toast.type} message={toast.message} className="mb-6 animate-in fade-in slide-in-from-top-2" />}

          {selected.type === 'tenant' && <TenantPanel showToast={showToast} />}
          {selected.type === 'company' && <CompanyPanel id={selected.id} companies={companies} onSave={() => { refresh(); showToast('Company saved'); }} />}
          {selected.type === 'site' && <SitePanel id={selected.id} parentCompanyId={selected.parentId} companies={companies} calendars={calendars} sites={sites} onSave={() => { refresh(); showToast('Site saved'); }} />}
          {selected.type === 'calendar' && <CalendarPanel id={selected.id} calendars={calendars} onSave={() => { refresh(); showToast('Calendar saved'); }} />}
          {selected.type === 'procurement-unit' && <ProcurementUnitPanel id={selected.id} procUnits={procUnits} companies={companies} onSave={() => { refresh(); showToast('Procurement Unit saved'); }} />}
          {selected.type === 'procurement-team' && <ProcurementTeamPanel id={selected.id} procTeams={procTeams} onSave={() => { refresh(); showToast('Procurement Team saved'); }} />}
        </div>
      </div>
    </div>
  </div>
);
};

// ================================================================
// PANELS
// ================================================================

const TenantPanel: React.FC<{ showToast: (m: string, type?: 'success' | 'error') => void }> = ({ showToast }) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiClient.get('/api/config/tenant-profile').then((r: any) => { setForm(r.data || {}); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v?.target?.value ?? v }));
  const save = async () => { try { await apiClient.patch('/api/config/tenant-profile', form); showToast('Tenant profile saved'); } catch(e) { showToast('Save failed', 'error'); } };
  if (loading) return <div className="text-[var(--text-3)] text-sm">Loading tenant profile...</div>;
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Tenant Profile</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">{form.name} — Infrastructure Root</p>
      </div>

      <Card>
        <CardHeader title="Identity & Governance" />
        <CardBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Trading Name"><Input value={form.name || ''} onChange={f('name')} /></Field>
            <Field label="Legal Name"><Input value={form.legal_name || ''} onChange={f('legal_name')} /></Field>
            <Field label="Registration No"><Input value={form.registration_no || ''} onChange={f('registration_no')} /></Field>
            <Field label="Tax ID"><Input value={form.tax_id || ''} onChange={f('tax_id')} /></Field>
            <Field label="Tax Regime">
              <Select value={form.tax_regime || 'NONE'} onChange={f('tax_regime')}>
                <option value="NONE">None</option>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
              </Select>
            </Field>
          </div>

          <div className="pt-6 border-t border-[var(--border)]">
            <h3 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">Location & Contact</h3>
            <div className="space-y-4">
              <Field label="Address Line 1"><Input value={form.address_line1 || ''} onChange={f('address_line1')} /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="City"><Input value={form.city || ''} onChange={f('city')} /></Field>
                <Field label="State / Province"><Input value={form.state_province || ''} onChange={f('state_province')} /></Field>
                <Field label="Postal Code"><Input value={form.postal_code || ''} onChange={f('postal_code')} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Country Code"><Input value={form.country_code || 'IN'} onChange={f('country_code')} /></Field>
                <Field label="Phone"><Input value={form.phone || ''} onChange={f('phone')} /></Field>
                <Field label="Email"><Input value={form.email || ''} onChange={f('email')} /></Field>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--border)]">
            <h3 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">Branding</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <Field label="Logo URL"><Input value={form.logo_url || ''} onChange={f('logo_url')} placeholder="https://..." /></Field>
              </div>
              {form.logo_url && (
                <div className="w-16 h-16 rounded-lg bg-white/5 border border-[var(--border)] flex items-center justify-center overflow-hidden">
                  <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-6">
            <Button variant="primary" onClick={save}>Save Tenant Profile</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

const CompanyPanel: React.FC<{ id?: number; companies: Company[]; onSave: () => void }> = ({ id, companies, onSave }) => {
  const existing = id ? companies.find(c => c.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', legal_name: '', tax_id: '', tax_regime: 'VAT', country_code: 'GB', currency_code: 'GBP', city: '', fiscal_year_start: '4' });
  
  useEffect(() => { 
    if (existing) {
      setForm({ 
        code: existing.code, name: existing.name, legal_name: existing.legal_name || '', 
        tax_id: existing.tax_id || '', tax_regime: existing.tax_regime || 'VAT', 
        country_code: existing.country_code, currency_code: existing.currency_code, 
        city: existing.city || '', fiscal_year_start: '4' 
      }); 
    } else {
      setForm({ code: '', name: '', legal_name: '', tax_id: '', tax_regime: 'VAT', country_code: 'GB', currency_code: 'GBP', city: '', fiscal_year_start: '4' }); 
    }
  }, [id, existing]);

  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v?.target?.value ?? v }));
  const save = async () => {
    const payload = { ...form, fiscal_year_start: Number(form.fiscal_year_start) };
    if (id) { await apiClient.patch(`/api/org/companies/${id}`, payload); } else { await apiClient.post('/api/org/companies', payload); }
    onSave();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{id ? 'Edit Company' : 'New Company'}</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Legal entity within the tenant structure</p>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company Code *"><Input value={form.code} onChange={f('code')} placeholder="UK01" readOnly={!!id} /></Field>
            <Field label="Name *"><Input value={form.name} onChange={f('name')} /></Field>
            <Field label="Legal Name"><Input value={form.legal_name} onChange={f('legal_name')} /></Field>
            <Field label="Tax ID"><Input value={form.tax_id} onChange={f('tax_id')} /></Field>
            <Field label="Tax Regime">
              <Select value={form.tax_regime} onChange={f('tax_regime')}>
                <option value="NONE">None</option>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
              </Select>
            </Field>
            <Field label="Country Code"><Input value={form.country_code} onChange={f('country_code')} placeholder="GB" /></Field>
            <Field label="Currency Code"><Input value={form.currency_code} onChange={f('currency_code')} placeholder="GBP" /></Field>
            <Field label="City"><Input value={form.city} onChange={f('city')} /></Field>
            <Field label="Fiscal Year Start">
              <Select value={form.fiscal_year_start} onChange={f('fiscal_year_start')}>
                <option value="1">January</option>
                <option value="4">April</option>
                <option value="7">July</option>
                <option value="10">October</option>
              </Select>
            </Field>
          </div>
          <div className="pt-4">
            <Button variant="primary" onClick={save}>{id ? 'Update Company' : 'Create Company'}</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

const SitePanel: React.FC<{ id?: number; parentCompanyId?: number; companies: Company[]; calendars: Calendar[]; sites: Site[]; onSave: () => void }> = ({ id, parentCompanyId, companies, calendars, sites, onSave }) => {
  const existing = id ? sites.find(s => s.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', company_id: String(parentCompanyId || ''), site_type: 'WAREHOUSE', site_purpose: '', country_code: 'GB', city: '', calendar_id: '', allows_negative_stock: false, goods_receipt_zone_required: true });
  
  useEffect(() => {
    if (existing) setForm({ code: existing.code, name: existing.name, company_id: String(existing.company_id || ''), site_type: existing.site_type, site_purpose: existing.site_purpose || '', country_code: existing.country_code || 'GB', city: existing.city || '', calendar_id: String(existing.calendar_id || ''), allows_negative_stock: false, goods_receipt_zone_required: true });
    else setForm({ code: '', name: '', company_id: String(parentCompanyId || ''), site_type: 'WAREHOUSE', site_purpose: '', country_code: 'GB', city: '', calendar_id: '', allows_negative_stock: false, goods_receipt_zone_required: true });
  }, [id, parentCompanyId, existing]);

  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v?.target?.value ?? v }));
  const save = async () => {
    const payload = { ...form, company_id: Number(form.company_id), calendar_id: form.calendar_id ? Number(form.calendar_id) : undefined };
    if (id) { await apiClient.patch(`/api/org/sites/${id}`, payload); } else { await apiClient.post('/api/org/sites', payload); }
    onSave();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{id ? 'Edit Site' : 'New Site'}</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Operational location (Warehouse, Factory, etc.)</p>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site Code *"><Input value={form.code} onChange={f('code')} placeholder="MAIN" readOnly={!!id} /></Field>
            <Field label="Name *"><Input value={form.name} onChange={f('name')} /></Field>
            <Field label="Parent Company *">
              <Select value={form.company_id} onChange={e => f('company_id')(e.target.value)}>
                <option value="">— Select Company —</option>
                {companies.map(co => <option key={co.id} value={co.id}>{co.code} — {co.name}</option>)}
              </Select>
            </Field>
            <Field label="Site Type">
              <Select value={form.site_type} onChange={f('site_type')}>
                {['MANUFACTURING','WAREHOUSE','DISTRIBUTION','RETAIL','OFFICE','MIXED'].map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Site Purpose"><Input value={form.site_purpose} onChange={f('site_purpose')} placeholder="e.g. Cold storage hub" /></Field>
            <Field label="Operational Calendar">
              <Select value={form.calendar_id} onChange={e => f('calendar_id')(e.target.value)}>
                <option value="">— None —</option>
                {calendars.map(cal => <option key={cal.id} value={cal.id}>{cal.code} — {cal.name}</option>)}
              </Select>
            </Field>
            <Field label="Country Code"><Input value={form.country_code} onChange={f('country_code')} /></Field>
            <Field label="City"><Input value={form.city} onChange={f('city')} /></Field>
          </div>

          <div className="pt-6 border-t border-[var(--border)] space-y-4">
            <h3 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">Operational Controls</h3>
            <div className="flex items-center justify-between p-3 bg-white/3 rounded-lg">
              <span className="text-sm text-[var(--text-2)]">Allow Negative Stock</span>
              <Switch checked={form.allows_negative_stock} onCheckedChange={f('allows_negative_stock')} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white/3 rounded-lg">
              <span className="text-sm text-[var(--text-2)]">Zone Required on Goods Receipt</span>
              <Switch checked={form.goods_receipt_zone_required} onCheckedChange={f('goods_receipt_zone_required')} />
            </div>
          </div>

          <div className="pt-4">
            <Button variant="primary" onClick={save}>{id ? 'Update Site' : 'Create Site'}</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

// ... Calendar, ProcurementUnit, ProcurementTeam panels would follow similar pattern ...
// For brevity, I'll implement them concisely using the new components.

const CalendarPanel: React.FC<{ id?: number; calendars: Calendar[]; onSave: () => void }> = ({ id, calendars, onSave }) => {
  const existing = id ? calendars.find(c => c.id === id) : null;
  const defForm = { code: '', name: '', country_code: 'GB', valid_from_year: '2024', valid_to_year: '2035', work_monday: true, work_tuesday: true, work_wednesday: true, work_thursday: true, work_friday: true, work_saturday: false, work_sunday: false, daily_work_hours: '8' };
  const [form, setForm] = useState<any>(defForm);
  
  useEffect(() => { 
    if (existing) setForm({ code: existing.code, name: existing.name, country_code: existing.country_code || 'GB', valid_from_year: String(existing.valid_from_year), valid_to_year: String(existing.valid_to_year), work_monday: existing.work_monday, work_tuesday: existing.work_tuesday, work_wednesday: existing.work_wednesday, work_thursday: existing.work_thursday, work_friday: existing.work_friday, work_saturday: existing.work_saturday, work_sunday: existing.work_sunday, daily_work_hours: String(existing.daily_work_hours) }); 
    else setForm(defForm); 
  }, [id, existing]);

  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v?.target?.value ?? v }));
  const save = async () => {
    const payload = { ...form, valid_from_year: Number(form.valid_from_year), valid_to_year: Number(form.valid_to_year), daily_work_hours: Number(form.daily_work_hours) };
    if (id) { await apiClient.patch(`/api/org/calendars/${id}`, payload); } else { await apiClient.post('/api/org/calendars', payload); }
    onSave();
  };

  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{id ? 'Edit Calendar' : 'New Calendar'}</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Operational work-days and holiday schedule</p>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Calendar Code *"><Input value={form.code} onChange={f('code')} readOnly={!!id} /></Field>
            <Field label="Name *"><Input value={form.name} onChange={f('name')} /></Field>
            <Field label="Daily Work Hours"><Input value={form.daily_work_hours} onChange={f('daily_work_hours')} type="number" /></Field>
            <Field label="Valid From Year"><Input value={form.valid_from_year} onChange={f('valid_from_year')} type="number" /></Field>
          </div>

          <div className="pt-6 border-t border-[var(--border)]">
            <h3 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">Work Week</h3>
            <div className="flex gap-2 flex-wrap">
              {days.map(d => (
                <button 
                  key={d} 
                  onClick={() => f(`work_${d}`)(!form[`work_${d}`])}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    form[`work_${d}`] 
                      ? "bg-[var(--accent)] text-black" 
                      : "bg-white/5 text-[var(--text-3)] hover:bg-white/10"
                  )}
                >
                  {d.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button variant="primary" onClick={save}>{id ? 'Update Calendar' : 'Create Calendar'}</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

const ProcurementUnitPanel: React.FC<{ id?: number; procUnits: ProcurementUnit[]; companies: Company[]; onSave: () => void }> = ({ id, procUnits, companies, onSave }) => {
  const existing = id ? procUnits.find(u => u.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', scope_type: 'GROUP_WIDE', company_id: '', currency_code: 'GBP', phone: '', email: '', can_release_orders: true, use_reference_conditions: false });
  
  useEffect(() => { 
    if (existing) setForm({ code: existing.code, name: existing.name, scope_type: existing.scope_type, company_id: '', currency_code: existing.currency_code || 'GBP', phone: '', email: '', can_release_orders: true, use_reference_conditions: false }); 
    else setForm({ code: '', name: '', scope_type: 'GROUP_WIDE', company_id: '', currency_code: 'GBP', phone: '', email: '', can_release_orders: true, use_reference_conditions: false }); 
  }, [id, existing]);

  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v?.target?.value ?? v }));
  const save = async () => {
    const payload: any = { ...form };
    if (form.company_id) payload.company_id = Number(form.company_id);
    if (id) { await apiClient.patch(`/api/org/procurement-units/${id}`, payload); } else { await apiClient.post('/api/org/procurement-units', payload); }
    onSave();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{id ? 'Edit Procurement Unit' : 'New Procurement Unit'}</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Responsible for strategic sourcing and deal negotiation</p>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code *"><Input value={form.code} onChange={f('code')} readOnly={!!id} /></Field>
            <Field label="Name *"><Input value={form.name} onChange={f('name')} /></Field>
            <Field label="Currency Code"><Input value={form.currency_code} onChange={f('currency_code')} /></Field>
            <Field label="Email"><Input value={form.email} onChange={f('email')} /></Field>
          </div>
          
          <div className="pt-6 border-t border-[var(--border)]">
            <h3 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">Governance Scope</h3>
            <div className="flex gap-2 flex-wrap">
              {['SITE_SPECIFIC','CROSS_SITE','GROUP_WIDE','EXTERNAL'].map(s => (
                <button 
                  key={s} 
                  onClick={() => f('scope_type')(s)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all",
                    form.scope_type === s 
                      ? "bg-[var(--accent)] text-black" 
                      : "bg-white/5 text-[var(--text-3)] hover:bg-white/10"
                  )}
                >
                  {s.replace(/_/g,' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button variant="primary" onClick={save}>{id ? 'Update Unit' : 'Create Unit'}</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

const ProcurementTeamPanel: React.FC<{ id?: number; procTeams: ProcurementTeam[]; onSave: () => void }> = ({ id, procTeams, onSave }) => {
  const existing = id ? procTeams.find(t => t.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', description: '', spending_limit: '', spending_currency: 'GBP', material_scope: [] as string[] });
  
  useEffect(() => { 
    if (existing) setForm({ code: existing.code, name: existing.name, description: existing.description || '', spending_limit: String(existing.spending_limit || ''), spending_currency: existing.spending_currency || 'GBP', material_scope: existing.material_scope || [] }); 
    else setForm({ code: '', name: '', description: '', spending_limit: '', spending_currency: 'GBP', material_scope: [] }); 
  }, [id, existing]);

  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v?.target?.value ?? v }));
  const save = async () => {
    const payload: any = { ...form };
    if (form.spending_limit) payload.spending_limit = Number(form.spending_limit);
    if (id) { await apiClient.patch(`/api/org/procurement-teams/${id}`, payload); } else { await apiClient.post('/api/org/procurement-teams', payload); }
    onSave();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{id ? 'Edit Team' : 'New Team'}</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Operational purchasing team</p>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code *"><Input value={form.code} onChange={f('code')} readOnly={!!id} /></Field>
            <Field label="Name *"><Input value={form.name} onChange={f('name')} /></Field>
            <Field label="Spending Limit"><Input value={form.spending_limit} onChange={f('spending_limit')} type="number" /></Field>
            <Field label="Currency"><Input value={form.spending_currency} onChange={f('spending_currency')} /></Field>
          </div>
          <div className="pt-4">
            <Button variant="primary" onClick={save}>{id ? 'Update Team' : 'Create Team'}</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default OrgStructure;
