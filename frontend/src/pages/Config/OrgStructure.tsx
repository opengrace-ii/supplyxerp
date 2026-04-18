import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client';

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
// STYLES
// ================================================================
const pk = '#f472b6';
const pkDim = 'rgba(244,114,182,0.08)';
const pkBorder = 'rgba(244,114,182,0.2)';
const surface = '#111';
const bg = '#0a0a0a';
const mutedColor = '#6b7280';
const textColor = '#e5e7eb';
const greenColor = '#22c55e';
const amberColor = '#f59e0b';

const cardStyle: React.CSSProperties = { background: surface, border: `1px solid ${pkBorder}`, borderRadius: 8, padding: 20 };
const labelStyle: React.CSSProperties = { fontSize: 10, color: pk, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, display: 'block', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0d0d0d', border: `1px solid ${pkBorder}`, borderRadius: 4, padding: '8px 10px', color: textColor, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const btnStyle: React.CSSProperties = { background: pk, color: '#0a0a0a', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
const btnGhostStyle: React.CSSProperties = { ...btnStyle, background: 'transparent', color: pk, border: `1px solid ${pkBorder}` };

// ================================================================
// SMALL COMPONENTS
// ================================================================
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 10, color: pk, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, margin: '20px 0 12px', paddingBottom: 6, borderBottom: `1px solid ${pkBorder}` }}>{children}</div>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; readOnly?: boolean }> = ({ label, value, onChange, type = 'text', placeholder, readOnly }) => (
  <div style={{ marginBottom: 12 }}>
    <span style={labelStyle}>{label}</span>
    <input style={{ ...inputStyle, opacity: readOnly ? 0.5 : 1 }} type={type} value={value} onChange={e => !readOnly && onChange(e.target.value)} placeholder={placeholder || label} readOnly={readOnly} />
  </div>
);

const SelectField: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }> = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom: 12 }}>
    <span style={labelStyle}>{label}</span>
    <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
    <span style={{ fontSize: 12, color: textColor }}>{label}</span>
    <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? pk : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  </div>
);

const Toast: React.FC<{ msg: string; onClose: () => void }> = ({ msg, onClose }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, background: surface, border: `1px solid ${greenColor}`, borderRadius: 6, padding: '10px 16px', color: greenColor, fontSize: 12, zIndex: 9999, display: 'flex', gap: 12, alignItems: 'center' }}>
    ✓ {msg} <span style={{ cursor: 'pointer', color: mutedColor }} onClick={onClose}>✕</span>
  </div>
);

const TreeItem: React.FC<{ label: string; icon: string; type: PanelType; id?: number; parentId?: number; selected: SelectedNode; onClick: (n: SelectedNode) => void; children?: React.ReactNode; count?: number; indent?: number }> = ({ label, icon, type, id, parentId, selected, onClick, children, count, indent = 0 }) => {
  const [open, setOpen] = useState(true);
  const isSel = selected.type === type && selected.id === id;
  return (
    <div>
      <div onClick={() => { onClick({ type, id, parentId }); if (children) setOpen(o => !o); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', paddingLeft: 8 + indent * 14, cursor: 'pointer', borderRadius: 4, borderLeft: isSel ? `2px solid ${pk}` : '2px solid transparent', background: isSel ? pkDim : 'transparent', color: isSel ? pk : textColor, fontSize: 12, marginBottom: 1 }}>
        <span style={{ opacity: 0.7, width: 8 }}>{children ? (open ? '▾' : '▸') : '·'}</span>
        <span>{icon}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {count !== undefined && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: mutedColor }}>{count}</span>}
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
  const [toast, setToast] = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div style={{ display: 'flex', height: '100%', background: bg, color: textColor, fontFamily: "'Inter', sans-serif" }}>
      {/* LEFT TREE */}
      <div style={{ width: 280, minWidth: 280, borderRight: `1px solid ${pkBorder}`, overflowY: 'auto', padding: '16px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: pk, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, margin: '0 8px 16px', paddingBottom: 8, borderBottom: `1px solid ${pkBorder}` }}>Org Structure</div>

        <TreeItem label="Tenant Profile" icon="🏢" type="tenant" selected={selected} onClick={setSelected} />

        <div style={{ fontSize: 9, color: mutedColor, textTransform: 'uppercase', letterSpacing: 1.5, padding: '12px 8px 4px', fontWeight: 700 }}>Companies & Sites</div>
        {companies.map(co => (
          <TreeItem key={co.id} label={`${co.code} — ${co.name}`} icon="🏗" type="company" id={co.id} selected={selected} onClick={setSelected} count={co.site_count} indent={0}>
            {sites.filter(s => s.company_id === co.id).map(s => (
              <TreeItem key={s.id} label={`${s.code} — ${s.name}`} icon="🏭" type="site" id={s.id} parentId={co.id} selected={selected} onClick={setSelected} count={s.zone_count} indent={1} />
            ))}
            <div onClick={() => setSelected({ type: 'site', parentId: co.id })} style={{ padding: '4px 8px', paddingLeft: 22, cursor: 'pointer', color: mutedColor, fontSize: 11 }}>+ Add Site</div>
          </TreeItem>
        ))}
        <div onClick={() => setSelected({ type: 'company' })} style={{ padding: '4px 8px', cursor: 'pointer', color: mutedColor, fontSize: 11 }}>+ Add Company</div>

        <div style={{ fontSize: 9, color: mutedColor, textTransform: 'uppercase', letterSpacing: 1.5, padding: '16px 8px 4px', fontWeight: 700 }}>Procurement</div>
        {procUnits.map(pu => (
          <TreeItem key={pu.id} label={`${pu.code} — ${pu.name}`} icon="📋" type="procurement-unit" id={pu.id} selected={selected} onClick={setSelected} count={pu.site_count} indent={0}>
            {procTeams.map(pt => <TreeItem key={pt.id} label={`${pt.code} — ${pt.name}`} icon="👥" type="procurement-team" id={pt.id} selected={selected} onClick={setSelected} indent={1} />)}
          </TreeItem>
        ))}
        <div onClick={() => setSelected({ type: 'procurement-unit' })} style={{ padding: '4px 8px', cursor: 'pointer', color: mutedColor, fontSize: 11 }}>+ Add Procurement Unit</div>
        <div onClick={() => setSelected({ type: 'procurement-team' })} style={{ padding: '4px 8px', cursor: 'pointer', color: mutedColor, fontSize: 11 }}>+ Add Procurement Team</div>

        <div style={{ fontSize: 9, color: mutedColor, textTransform: 'uppercase', letterSpacing: 1.5, padding: '16px 8px 4px', fontWeight: 700 }}>Calendars</div>
        {calendars.map(cal => <TreeItem key={cal.id} label={`${cal.code} — ${cal.name}`} icon="📅" type="calendar" id={cal.id} selected={selected} onClick={setSelected} count={cal.exception_count} indent={0} />)}
        <div onClick={() => setSelected({ type: 'calendar' })} style={{ padding: '4px 8px', cursor: 'pointer', color: mutedColor, fontSize: 11 }}>+ Add Calendar</div>
      </div>

      {/* MIDDLE PANEL */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {selected.type === 'tenant' && <TenantPanel showToast={showToast} />}
        {selected.type === 'company' && <CompanyPanel id={selected.id} companies={companies} onSave={() => { refresh(); showToast('Company saved'); }} />}
        {selected.type === 'site' && <SitePanel id={selected.id} parentCompanyId={selected.parentId} companies={companies} calendars={calendars} sites={sites} onSave={() => { refresh(); showToast('Site saved'); }} />}
        {selected.type === 'calendar' && <CalendarPanel id={selected.id} calendars={calendars} onSave={() => { refresh(); showToast('Calendar saved'); }} />}
        {selected.type === 'procurement-unit' && <ProcurementUnitPanel id={selected.id} procUnits={procUnits} companies={companies} onSave={() => { refresh(); showToast('Procurement Unit saved'); }} />}
        {selected.type === 'procurement-team' && <ProcurementTeamPanel id={selected.id} procTeams={procTeams} onSave={() => { refresh(); showToast('Procurement Team saved'); }} />}
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

// ================================================================
// TENANT PANEL
// ================================================================
const TenantPanel: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiClient.get('/api/config/tenant-profile').then((r: any) => { setForm(r.data || {}); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const f = (k: string) => (v: string) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const save = async () => { await apiClient.patch('/api/config/tenant-profile', form); showToast('Tenant profile saved'); };
  if (loading) return <div style={{ color: mutedColor }}>Loading...</div>;
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: pk, marginBottom: 4 }}>Tenant Profile</div>
      <div style={{ color: mutedColor, fontSize: 12, marginBottom: 20 }}>{form.name}</div>
      <div style={cardStyle}>
        <SectionTitle>Identity</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Trading Name" value={form.name || ''} onChange={f('name')} />
          <Field label="Legal Name" value={form.legal_name || ''} onChange={f('legal_name')} />
          <Field label="Registration No" value={form.registration_no || ''} onChange={f('registration_no')} />
          <Field label="Tax ID" value={form.tax_id || ''} onChange={f('tax_id')} />
          <SelectField label="Tax Regime" value={form.tax_regime || 'NONE'} onChange={f('tax_regime')} options={[{value:'NONE',label:'None'},{value:'GST',label:'GST'},{value:'VAT',label:'VAT'}]} />
        </div>
        <SectionTitle>Address & Contact</SectionTitle>
        <Field label="Address Line 1" value={form.address_line1 || ''} onChange={f('address_line1')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="City" value={form.city || ''} onChange={f('city')} />
          <Field label="State / Province" value={form.state_province || ''} onChange={f('state_province')} />
          <Field label="Postal Code" value={form.postal_code || ''} onChange={f('postal_code')} />
          <Field label="Country Code" value={form.country_code || 'IN'} onChange={f('country_code')} />
          <Field label="Phone" value={form.phone || ''} onChange={f('phone')} />
          <Field label="Email" value={form.email || ''} onChange={f('email')} />
        </div>
        <SectionTitle>Operational Defaults</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Currency Code" value={form.currency_code || 'INR'} onChange={f('currency_code')} placeholder="GBP" />
          <SelectField label="Fiscal Year Start" value={String(form.fiscal_year_start || 4)} onChange={f('fiscal_year_start')} options={[{value:'1',label:'January'},{value:'4',label:'April'},{value:'7',label:'July'},{value:'10',label:'October'}]} />
          <SelectField label="Date Format" value={form.date_format || 'DD/MM/YYYY'} onChange={f('date_format')} options={[{value:'DD/MM/YYYY',label:'DD/MM/YYYY'},{value:'MM/DD/YYYY',label:'MM/DD/YYYY'},{value:'YYYY-MM-DD',label:'YYYY-MM-DD'}]} />
          <Field label="Time Zone" value={form.time_zone || 'Asia/Kolkata'} onChange={f('time_zone')} />
        </div>
        <SectionTitle>Branding</SectionTitle>
        <Field label="Logo URL" value={form.logo_url || ''} onChange={f('logo_url')} placeholder="https://..." />
        {form.logo_url && <img src={form.logo_url} alt="Logo" style={{ height: 40, marginBottom: 12, borderRadius: 4 }} />}
        <button style={btnStyle} onClick={save}>Save Profile</button>
      </div>
    </div>
  );
};

// ================================================================
// COMPANY PANEL
// ================================================================
const CompanyPanel: React.FC<{ id?: number; companies: Company[]; onSave: () => void }> = ({ id, companies, onSave }) => {
  const existing = id ? companies.find(c => c.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', legal_name: '', tax_id: '', tax_regime: 'VAT', country_code: 'GB', currency_code: 'GBP', city: '', fiscal_year_start: '4' });
  useEffect(() => { if (existing) setForm({ code: existing.code, name: existing.name, legal_name: existing.legal_name || '', tax_id: existing.tax_id || '', tax_regime: existing.tax_regime || 'VAT', country_code: existing.country_code, currency_code: existing.currency_code, city: existing.city || '', fiscal_year_start: '4' }); else setForm({ code: '', name: '', legal_name: '', tax_id: '', tax_regime: 'VAT', country_code: 'GB', currency_code: 'GBP', city: '', fiscal_year_start: '4' }); }, [id]);
  const f = (k: string) => (v: string) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const save = async () => {
    const payload = { ...form, fiscal_year_start: Number(form.fiscal_year_start) };
    if (id) { await apiClient.patch(`/api/org/companies/${id}`, payload); } else { await apiClient.post('/api/org/companies', payload); }
    onSave();
  };
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: pk, marginBottom: 16 }}>{id ? 'Edit Company' : 'New Company'}</div>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Company Code *" value={form.code} onChange={f('code')} placeholder="UK01" readOnly={!!id} />
          <Field label="Name *" value={form.name} onChange={f('name')} />
          <Field label="Legal Name" value={form.legal_name} onChange={f('legal_name')} />
          <Field label="Tax ID" value={form.tax_id} onChange={f('tax_id')} />
          <SelectField label="Tax Regime" value={form.tax_regime} onChange={f('tax_regime')} options={[{value:'NONE',label:'None'},{value:'GST',label:'GST'},{value:'VAT',label:'VAT'}]} />
          <Field label="Country Code" value={form.country_code} onChange={f('country_code')} placeholder="GB" />
          <Field label="Currency Code" value={form.currency_code} onChange={f('currency_code')} placeholder="GBP" />
          <Field label="City" value={form.city} onChange={f('city')} />
          <SelectField label="Fiscal Year Start" value={form.fiscal_year_start} onChange={f('fiscal_year_start')} options={[{value:'1',label:'January'},{value:'4',label:'April'},{value:'7',label:'July'},{value:'10',label:'October'}]} />
        </div>
        <button style={btnStyle} onClick={save}>{id ? 'Update Company' : 'Create Company'}</button>
      </div>
    </div>
  );
};

// ================================================================
// SITE PANEL
// ================================================================
const SitePanel: React.FC<{ id?: number; parentCompanyId?: number; companies: Company[]; calendars: Calendar[]; sites: Site[]; onSave: () => void }> = ({ id, parentCompanyId, companies, calendars, sites, onSave }) => {
  const existing = id ? sites.find(s => s.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', company_id: String(parentCompanyId || ''), site_type: 'WAREHOUSE', site_purpose: '', country_code: 'GB', city: '', calendar_id: '', allows_negative_stock: false, goods_receipt_zone_required: true });
  useEffect(() => {
    if (existing) setForm({ code: existing.code, name: existing.name, company_id: String(existing.company_id || ''), site_type: existing.site_type, site_purpose: existing.site_purpose || '', country_code: existing.country_code || 'GB', city: existing.city || '', calendar_id: String(existing.calendar_id || ''), allows_negative_stock: false, goods_receipt_zone_required: true });
    else setForm({ code: '', name: '', company_id: String(parentCompanyId || ''), site_type: 'WAREHOUSE', site_purpose: '', country_code: 'GB', city: '', calendar_id: '', allows_negative_stock: false, goods_receipt_zone_required: true });
  }, [id, parentCompanyId]);
  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const save = async () => {
    const payload = { ...form, company_id: Number(form.company_id), calendar_id: form.calendar_id ? Number(form.calendar_id) : undefined };
    if (id) { await apiClient.patch(`/api/org/sites/${id}`, payload); } else { await apiClient.post('/api/org/sites', payload); }
    onSave();
  };
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: pk, marginBottom: 16 }}>{id ? 'Edit Site' : 'New Site'}</div>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Site Code *" value={form.code} onChange={f('code')} placeholder="MAIN" readOnly={!!id} />
          <Field label="Name *" value={form.name} onChange={f('name')} />
          <div>
            <span style={labelStyle}>Company *</span>
            <select style={inputStyle} value={form.company_id} onChange={e => f('company_id')(e.target.value)}>
              <option value="">— Select Company —</option>
              {companies.map(co => <option key={co.id} value={co.id}>{co.code} — {co.name}</option>)}
            </select>
          </div>
          <SelectField label="Site Type" value={form.site_type} onChange={f('site_type')} options={['MANUFACTURING','WAREHOUSE','DISTRIBUTION','RETAIL','OFFICE','MIXED'].map(v => ({ value: v, label: v }))} />
          <Field label="Site Purpose" value={form.site_purpose} onChange={f('site_purpose')} placeholder="e.g. Cold storage hub" />
          <div>
            <span style={labelStyle}>Operational Calendar</span>
            <select style={inputStyle} value={form.calendar_id} onChange={e => f('calendar_id')(e.target.value)}>
              <option value="">— None —</option>
              {calendars.map(cal => <option key={cal.id} value={cal.id}>{cal.code} — {cal.name}</option>)}
            </select>
          </div>
          <Field label="Country Code" value={form.country_code} onChange={f('country_code')} />
          <Field label="City" value={form.city} onChange={f('city')} />
        </div>
        <SectionTitle>Operational Settings</SectionTitle>
        <Toggle label="Allow Negative Stock" value={form.allows_negative_stock} onChange={f('allows_negative_stock')} />
        <Toggle label="Zone Required on Goods Receipt" value={form.goods_receipt_zone_required} onChange={f('goods_receipt_zone_required')} />
        <button style={btnStyle} onClick={save}>{id ? 'Update Site' : 'Create Site'}</button>
      </div>
    </div>
  );
};

// ================================================================
// CALENDAR PANEL
// ================================================================
const CalendarPanel: React.FC<{ id?: number; calendars: Calendar[]; onSave: () => void }> = ({ id, calendars, onSave }) => {
  const existing = id ? calendars.find(c => c.id === id) : null;
  const defForm = { code: '', name: '', country_code: 'GB', valid_from_year: '2024', valid_to_year: '2035', work_monday: true, work_tuesday: true, work_wednesday: true, work_thursday: true, work_friday: true, work_saturday: false, work_sunday: false, daily_work_hours: '8' };
  const [form, setForm] = useState<any>(defForm);
  const [newEx, setNewEx] = useState({ exception_date: '', exception_type: 'PUBLIC_HOLIDAY', description: '', is_working_day: false });
  const [calcFrom, setCalcFrom] = useState(''); const [calcTo, setCalcTo] = useState(''); const [calcResult, setCalcResult] = useState<any>(null);
  useEffect(() => { if (existing) setForm({ code: existing.code, name: existing.name, country_code: existing.country_code || 'GB', valid_from_year: String(existing.valid_from_year), valid_to_year: String(existing.valid_to_year), work_monday: existing.work_monday, work_tuesday: existing.work_tuesday, work_wednesday: existing.work_wednesday, work_thursday: existing.work_thursday, work_friday: existing.work_friday, work_saturday: existing.work_saturday, work_sunday: existing.work_sunday, daily_work_hours: String(existing.daily_work_hours) }); else setForm(defForm); }, [id]);
  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const save = async () => {
    const payload = { ...form, valid_from_year: Number(form.valid_from_year), valid_to_year: Number(form.valid_to_year), daily_work_hours: Number(form.daily_work_hours) };
    if (id) { await apiClient.patch(`/api/org/calendars/${id}`, payload); } else { await apiClient.post('/api/org/calendars', payload); }
    onSave();
  };
  const addException = async () => { if (!id) return; await apiClient.post(`/api/org/calendars/${id}/exceptions`, newEx); setNewEx({ exception_date: '', exception_type: 'PUBLIC_HOLIDAY', description: '', is_working_day: false }); };
  const calcWorkDays = async () => { if (!id) return; const r: any = await apiClient.get(`/api/org/calendars/${id}/working-days?from_date=${calcFrom}&to_date=${calcTo}`); setCalcResult(r.data); };
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: pk, marginBottom: 16 }}>{id ? 'Edit Calendar' : 'New Calendar'}</div>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Calendar Code *" value={form.code} onChange={f('code')} placeholder="STD" readOnly={!!id} />
          <Field label="Name *" value={form.name} onChange={f('name')} />
          <Field label="Country Code" value={form.country_code} onChange={f('country_code')} />
          <Field label="Daily Work Hours" value={form.daily_work_hours} onChange={f('daily_work_hours')} type="number" />
          <Field label="Valid From Year" value={form.valid_from_year} onChange={f('valid_from_year')} type="number" />
          <Field label="Valid To Year" value={form.valid_to_year} onChange={f('valid_to_year')} type="number" />
        </div>
        <SectionTitle>Work Days</SectionTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {days.map(d => <div key={d} onClick={() => f(`work_${d}`)(!form[`work_${d}`])} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${form[`work_${d}`] ? pk : pkBorder}`, background: form[`work_${d}`] ? pkDim : 'transparent', color: form[`work_${d}`] ? pk : mutedColor, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{d.slice(0,3)}</div>)}
        </div>
        <button style={btnStyle} onClick={save}>{id ? 'Update Calendar' : 'Create Calendar'}</button>
        {id && <>
          <SectionTitle>Holiday Exceptions</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input style={inputStyle} type="date" value={newEx.exception_date} onChange={e => setNewEx(p => ({ ...p, exception_date: e.target.value }))} />
            <select style={inputStyle} value={newEx.exception_type} onChange={e => setNewEx(p => ({ ...p, exception_type: e.target.value }))}>
              {['PUBLIC_HOLIDAY','COMPANY_HOLIDAY','SPECIAL_WORKDAY'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
            <input style={inputStyle} placeholder="Description" value={newEx.description} onChange={e => setNewEx(p => ({ ...p, description: e.target.value }))} />
            <button style={btnStyle} onClick={addException}>+</button>
          </div>
          <SectionTitle>Working Days Calculator</SectionTitle>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ ...inputStyle, width: 160 }} type="date" value={calcFrom} onChange={e => setCalcFrom(e.target.value)} />
            <span style={{ color: mutedColor }}>→</span>
            <input style={{ ...inputStyle, width: 160 }} type="date" value={calcTo} onChange={e => setCalcTo(e.target.value)} />
            <button style={btnGhostStyle} onClick={calcWorkDays}>Calculate</button>
          </div>
          {calcResult && <div style={{ marginTop: 10, padding: '10px 14px', background: pkDim, borderRadius: 4, fontSize: 13 }}>
            <strong style={{ color: pk }}>{calcResult.working_days}</strong> working days &nbsp;·&nbsp; <strong>{calcResult.calendar_days}</strong> calendar days
            {calcResult.holidays?.length > 0 && <div style={{ marginTop: 6, fontSize: 11, color: mutedColor }}>Holidays: {calcResult.holidays.map((h: any) => h.date).join(', ')}</div>}
          </div>}
        </>}
      </div>
    </div>
  );
};

// ================================================================
// PROCUREMENT UNIT PANEL
// ================================================================
const ProcurementUnitPanel: React.FC<{ id?: number; procUnits: ProcurementUnit[]; companies: Company[]; onSave: () => void }> = ({ id, procUnits, companies, onSave }) => {
  const existing = id ? procUnits.find(u => u.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', scope_type: 'GROUP_WIDE', company_id: '', currency_code: 'GBP', phone: '', email: '', can_release_orders: true, use_reference_conditions: false });
  useEffect(() => { if (existing) setForm({ code: existing.code, name: existing.name, scope_type: existing.scope_type, company_id: '', currency_code: existing.currency_code || 'GBP', phone: '', email: '', can_release_orders: true, use_reference_conditions: false }); else setForm({ code: '', name: '', scope_type: 'GROUP_WIDE', company_id: '', currency_code: 'GBP', phone: '', email: '', can_release_orders: true, use_reference_conditions: false }); }, [id]);
  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const save = async () => {
    const payload: any = { ...form };
    if (form.company_id) payload.company_id = Number(form.company_id);
    if (id) { await apiClient.patch(`/api/org/procurement-units/${id}`, payload); } else { await apiClient.post('/api/org/procurement-units', payload); }
    onSave();
  };
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: pk, marginBottom: 16 }}>{id ? 'Edit Procurement Unit' : 'New Procurement Unit'}</div>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Code *" value={form.code} onChange={f('code')} placeholder="PU01" readOnly={!!id} />
          <Field label="Name *" value={form.name} onChange={f('name')} />
          <Field label="Currency Code" value={form.currency_code} onChange={f('currency_code')} />
          <Field label="Email" value={form.email} onChange={f('email')} />
        </div>
        <SectionTitle>Scope Type</SectionTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['SITE_SPECIFIC','CROSS_SITE','GROUP_WIDE','EXTERNAL'].map(s => <div key={s} onClick={() => f('scope_type')(s)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${form.scope_type === s ? pk : pkBorder}`, background: form.scope_type === s ? pkDim : 'transparent', color: form.scope_type === s ? pk : mutedColor, fontSize: 11, cursor: 'pointer' }}>{s.replace(/_/g,'-')}</div>)}
        </div>
        {form.scope_type === 'SITE_SPECIFIC' && <div style={{ marginBottom: 12 }}>
          <span style={labelStyle}>Company *</span>
          <select style={inputStyle} value={form.company_id} onChange={e => f('company_id')(e.target.value)}>
            <option value="">— Select Company —</option>
            {companies.map(co => <option key={co.id} value={co.id}>{co.code} — {co.name}</option>)}
          </select>
        </div>}
        <SectionTitle>Settings</SectionTitle>
        <Toggle label="Can create POs from reference unit's contracts" value={form.can_release_orders} onChange={f('can_release_orders')} />
        <Toggle label="Use price conditions from reference unit" value={form.use_reference_conditions} onChange={f('use_reference_conditions')} />
        <button style={btnStyle} onClick={save}>{id ? 'Update' : 'Create'} Procurement Unit</button>
      </div>
    </div>
  );
};

// ================================================================
// PROCUREMENT TEAM PANEL
// ================================================================
const ProcurementTeamPanel: React.FC<{ id?: number; procTeams: ProcurementTeam[]; onSave: () => void }> = ({ id, procTeams, onSave }) => {
  const existing = id ? procTeams.find(t => t.id === id) : null;
  const [form, setForm] = useState({ code: '', name: '', description: '', spending_limit: '', spending_currency: 'GBP', material_scope: [] as string[] });
  const [scopeInput, setScopeInput] = useState('');
  useEffect(() => { if (existing) setForm({ code: existing.code, name: existing.name, description: existing.description || '', spending_limit: String(existing.spending_limit || ''), spending_currency: existing.spending_currency || 'GBP', material_scope: existing.material_scope || [] }); else setForm({ code: '', name: '', description: '', spending_limit: '', spending_currency: 'GBP', material_scope: [] }); }, [id]);
  const f = (k: string) => (v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const addScope = () => { if (scopeInput.trim()) { f('material_scope')([...form.material_scope, scopeInput.trim()]); setScopeInput(''); } };
  const removeScope = (i: number) => f('material_scope')(form.material_scope.filter((_: any, idx: number) => idx !== i));
  const save = async () => {
    const payload: any = { ...form };
    if (form.spending_limit) payload.spending_limit = Number(form.spending_limit);
    if (id) { await apiClient.patch(`/api/org/procurement-teams/${id}`, payload); } else { await apiClient.post('/api/org/procurement-teams', payload); }
    onSave();
  };
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: pk, marginBottom: 16 }}>{id ? 'Edit Procurement Team' : 'New Procurement Team'}</div>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Code *" value={form.code} onChange={f('code')} placeholder="PT01" readOnly={!!id} />
          <Field label="Name *" value={form.name} onChange={f('name')} />
          <Field label="Spending Limit" value={form.spending_limit} onChange={f('spending_limit')} type="number" placeholder="0" />
          <Field label="Spending Currency" value={form.spending_currency} onChange={f('spending_currency')} />
        </div>
        <div style={{ marginBottom: 12 }}><span style={labelStyle}>Description</span><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.description} onChange={e => f('description')(e.target.value)} /></div>
        <SectionTitle>Material Scope</SectionTitle>
        <div style={{ fontSize: 11, color: mutedColor, marginBottom: 8 }}>Patterns this team handles. Use * as wildcard — e.g. <code style={{ color: amberColor }}>RAW-*</code></div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="e.g. RAW-* or PKG-001" value={scopeInput} onChange={e => setScopeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addScope()} />
          <button style={btnGhostStyle} onClick={addScope}>+ Add</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {form.material_scope.map((s: string, i: number) => <span key={i} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: `${amberColor}22`, color: amberColor, display: 'flex', alignItems: 'center', gap: 6 }}>{s} <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeScope(i)}>✕</span></span>)}
        </div>
        <button style={btnStyle} onClick={save}>{id ? 'Update' : 'Create'} Procurement Team</button>
      </div>
    </div>
  );
};

export default OrgStructure;
