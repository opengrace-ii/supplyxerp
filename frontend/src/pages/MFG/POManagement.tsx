// ─────────────────────────────────────────────────────────────────────────────
// POManagement.tsx — Phase 1 PO Document Completeness
// Matches SupplyXERP dark theme exactly (amber/brown palette from MaterialHub)
// Uses BIGINT IDs (not UUID), cookie-based auth (credentials: 'include')
// Integrates with existing /api/purchase-orders endpoints
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PO {
  id: number;
  po_number: string;
  vendor_name?: string;
  supplier_name?: string;
  doc_date?: string;
  created_at?: string;
  currency?: string;
  exchange_rate?: number;
  fixed_exch_rate?: boolean;
  status?: string;
  output_sent?: boolean;
  total_amount?: number;
  purch_org?: string;
  purch_group?: string;
  company_code?: string;
  collective_no?: string;
  header_text?: string;
  delivery_terms_text?: string;
  warranty_text?: string;
  penalty_text?: string;
}

interface POLine {
  id: number;
  item_no: number;
  material_code?: string;
  material_name?: string;
  short_text?: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  currency?: string;
  delivery_date?: string;
  plant?: string;
  storage_location?: string;
  account_assignment?: string;
  blocked?: boolean;
  block_reason_code?: string;
  deleted?: boolean;
}

interface DeliverySettings {
  overdelivery_tol: number;
  underdelivery_tol: number;
  unlimited_overdeliv: boolean;
  shipping_instr: string;
  planned_deliv_time: number;
  reminder_1_days: number | null;
  reminder_2_days: number | null;
  reminder_3_days: number | null;
  stock_type: string;
  goods_receipt: boolean;
  gr_non_valuated: boolean;
  deliv_compl: boolean;
  part_del_allowed: boolean;
}

interface InvoiceSettings {
  inv_receipt: boolean;
  final_invoice: boolean;
  gr_based_iv: boolean;
  tax_code: string;
  dp_category: string;
}

interface ScheduleLine {
  schedule_line: number;
  delivery_date: string;
  scheduled_qty: number;
  stat_del_date?: string;
  gr_qty: number;
  open_qty: number;
}

interface Confirmation {
  sequence_no: number;
  conf_control: string;
  conf_category: string;
  delivery_date?: string;
  quantity?: number;
  reference: string;
  inbound_delivery_no: string;
  order_ack_reqd: boolean;
  rejection_ind: boolean;
}

interface AccountLine {
  sequence_no: number;
  acct_assgt_cat: string;
  distribution: string;
  gl_account: string;
  cost_center: string;
  project_wbs: string;
  quantity?: number;
  percentage?: number;
}

interface ItemAddress {
  diff_address: boolean;
  street: string;
  city: string;
  zip_code: string;
  country: string;
}

interface ItemWeights {
  base_uom: string;
  order_uom: string;
  conv_num: number;
  conv_den: number;
  gross_weight: number;
  net_weight: number;
  weight_unit: string;
  volume: number;
  volume_unit: string;
}

interface BlockReason { code: string; description: string; }

interface NewPOForm {
  vendor_id: string;
  doc_type: string;
  currency: string;
  payment_terms: string;
  purch_org: string;
  purch_group: string;
  company_code: string;
}

// ─── Theme — matches SupplyXERP dark palette ───────────────────────────────

const T = {
  bg:        "#1a0e00",   // deepest background
  surface:   "#2a1a00",   // card/panel background
  surface2:  "#3a2800",   // slightly lighter surface
  border:    "#4a3800",   // standard border
  borderHi:  "#6b5200",   // highlighted border
  amber:     "#f59e0b",   // primary accent
  amberDim:  "#b45309",   // dimmer amber
  text:      "#fef3c7",   // primary text
  textMuted: "#92400e",   // muted text
  textDim:   "#78350f",   // very dim text
  pink:      "#ec4899",   // secondary accent (CFG theme carry-over)
  green:     "#22c55e",
  red:       "#ef4444",
  blue:      "#3b82f6",
  yellow:    "#eab308",
  white:     "#fff8f0",
};

// ─── Shared helpers ────────────────────────────────────────────────────────

function apiFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
}

function useAPI<T>(url: string | null) {
  const [data, setData]     = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

async function apiPut(url: string, body: unknown) {
  const res = await apiFetch(url, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(url: string, body: unknown) {
  const res = await apiFetch(url, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDelete(url: string) {
  const res = await apiFetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Atoms ────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    green:  { bg: "#14532d",  text: T.green  },
    red:    { bg: "#7f1d1d",  text: T.red    },
    yellow: { bg: "#713f12",  text: T.yellow },
    blue:   { bg: "#1e3a5f",  text: T.blue   },
    gray:   { bg: "#292524",  text: "#a8a29e" },
    amber:  { bg: "#451a03",  text: T.amber  },
  };
  const s = colors[color] ?? colors.gray;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.text,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function statusColor(s?: string) {
  switch ((s ?? "").toUpperCase()) {
    case "OPEN":      return "blue";
    case "RELEASED":  return "green";
    case "SENT":      return "green";
    case "BLOCKED":   return "yellow";
    case "CANCELLED":
    case "CANCELED":  return "red";
    case "CLOSED":    return "gray";
    default:          return "gray";
  }
}

function Inp({
  value, onChange, type = "text", placeholder, readOnly, small,
}: {
  value: string | number;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  small?: boolean;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        width: "100%",
        padding: small ? "3px 7px" : "5px 9px",
        fontSize: small ? 11 : 12,
        background: readOnly ? T.bg : T.surface2,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        color: readOnly ? T.textMuted : T.text,
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
      }}
    />
  );
}

function Sel({
  value, onChange, options, small,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  small?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: small ? "3px 6px" : "5px 8px",
        fontSize: small ? 11 : 12,
        background: T.surface2,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        color: T.text,
        outline: "none",
        boxSizing: "border-box",
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Chk({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text, cursor: "pointer", userSelect: "none" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: T.amber, width: 13, height: 13 }} />
      {label}
    </label>
  );
}

function Fld({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: 14, marginBottom: 10 }}>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{title}</div>
      )}
      {children}
    </div>
  );
}

function Btn({
  children, onClick, color = "amber", small, disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: "amber" | "ghost" | "red" | "green";
  small?: boolean;
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    amber: { background: T.amber, color: "#1a0e00", border: "none", fontWeight: 700 },
    ghost: { background: "transparent", color: T.text, border: `1px solid ${T.border}` },
    red:   { background: "#7f1d1d", color: T.red, border: `1px solid #b91c1c` },
    green: { background: "#14532d", color: T.green, border: `1px solid #166534` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "3px 10px" : "6px 14px",
        fontSize: small ? 11 : 12,
        borderRadius: 5,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
        ...styles[color],
      }}
    >
      {children}
    </button>
  );
}

function SaveRow({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
      <Btn onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
      {saved && <span style={{ fontSize: 11, color: T.green }}>✓ Saved</span>}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────

function Tabs({ tabs, active, onChange, small }: { tabs: string[]; active: string; onChange: (t: string) => void; small?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${T.border}`, marginBottom: 14, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: small ? "4px 9px" : "6px 12px",
            fontSize: small ? 11 : 11,
            fontWeight: active === t ? 700 : 400,
            background: active === t ? T.surface2 : "transparent",
            border: "none",
            borderBottom: active === t ? `2px solid ${T.amber}` : "2px solid transparent",
            color: active === t ? T.amber : T.textMuted,
            cursor: "pointer",
            borderRadius: "3px 3px 0 0",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── Item detail tabs ─────────────────────────────────────────────────────

function DeliveryTab({ poId, itemNo }: { poId: number; itemNo: number }) {
  const { data, loading } = useAPI<DeliverySettings>(`/api/po/${poId}/items/${itemNo}/delivery`);
  const def: DeliverySettings = { overdelivery_tol: 0, underdelivery_tol: 0, unlimited_overdeliv: false, shipping_instr: "", planned_deliv_time: 1, reminder_1_days: null, reminder_2_days: null, reminder_3_days: null, stock_type: "unrestricted", goods_receipt: true, gr_non_valuated: false, deliv_compl: false, part_del_allowed: true };
  const [f, setF] = useState<DeliverySettings>(def);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setF(data); else setF(def); }, [data]); // eslint-disable-line
  const s = (k: keyof DeliverySettings, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 12 }}>Loading…</div>;

  return (
    <div>
      <Section title="Tolerances">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Fld label="Overdelivery tol (%)"><Inp value={f.overdelivery_tol} type="number" onChange={(v) => s("overdelivery_tol", +v)} /></Fld>
          <Fld label="Underdelivery tol (%)"><Inp value={f.underdelivery_tol} type="number" onChange={(v) => s("underdelivery_tol", +v)} /></Fld>
          <Fld label=""><div style={{ paddingTop: 18 }}><Chk label="Unlimited overdelivery" checked={f.unlimited_overdeliv} onChange={(v) => s("unlimited_overdeliv", v)} /></div></Fld>
        </div>
      </Section>
      <Section title="Reminders / Expediting">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Fld label="1st Reminder (days)"><Inp value={f.reminder_1_days ?? ""} type="number" placeholder="-3" onChange={(v) => s("reminder_1_days", v ? +v : null)} /></Fld>
          <Fld label="2nd Reminder (days)"><Inp value={f.reminder_2_days ?? ""} type="number" onChange={(v) => s("reminder_2_days", v ? +v : null)} /></Fld>
          <Fld label="3rd Reminder (days)"><Inp value={f.reminder_3_days ?? ""} type="number" onChange={(v) => s("reminder_3_days", v ? +v : null)} /></Fld>
          <Fld label="Planned Deliv. Time">
            <Inp value={f.planned_deliv_time} type="number" onChange={(v) => s("planned_deliv_time", +v)} />
          </Fld>
          <Fld label="Shipping Instr."><Inp value={f.shipping_instr} onChange={(v) => s("shipping_instr", v)} /></Fld>
          <Fld label="Stock Type">
            <Sel value={f.stock_type} onChange={(v) => s("stock_type", v)} options={[
              { value: "unrestricted", label: "Unrestricted use" },
              { value: "quality", label: "Quality inspection" },
              { value: "blocked", label: "Blocked stock" },
            ]} />
          </Fld>
        </div>
      </Section>
      <Section title="Goods Receipt">
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Chk label="Goods Receipt" checked={f.goods_receipt} onChange={(v) => s("goods_receipt", v)} />
          <Chk label="GR Non-valuated" checked={f.gr_non_valuated} onChange={(v) => s("gr_non_valuated", v)} />
          <Chk label="Delivery Complete" checked={f.deliv_compl} onChange={(v) => s("deliv_compl", v)} />
          <Chk label="Partial delivery allowed" checked={f.part_del_allowed} onChange={(v) => s("part_del_allowed", v)} />
        </div>
      </Section>
      <SaveRow onSave={async () => { setSaving(true); try { await apiPut(`/api/po/${poId}/items/${itemNo}/delivery`, f); setSaved(true); setTimeout(() => setSaved(false), 2000); } finally { setSaving(false); } }} saving={saving} saved={saved} />
    </div>
  );
}

function InvoiceTab({ poId, itemNo }: { poId: number; itemNo: number }) {
  const { data, loading } = useAPI<InvoiceSettings>(`/api/po/${poId}/items/${itemNo}/invoice`);
  const [f, setF] = useState<InvoiceSettings>({ inv_receipt: true, final_invoice: false, gr_based_iv: true, tax_code: "", dp_category: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setF(data); }, [data]);
  const s = (k: keyof InvoiceSettings, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 12 }}>Loading…</div>;

  return (
    <div>
      <Section title="Invoice Controls">
        <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
          <Chk label="Inv. Receipt" checked={f.inv_receipt} onChange={(v) => s("inv_receipt", v)} />
          <Chk label="Final Invoice" checked={f.final_invoice} onChange={(v) => s("final_invoice", v)} />
          <Chk label="GR-Based IV" checked={f.gr_based_iv} onChange={(v) => s("gr_based_iv", v)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Fld label="Tax Code"><Inp value={f.tax_code} onChange={(v) => s("tax_code", v)} placeholder="01" /></Fld>
          <Fld label="DP Category"><Inp value={f.dp_category} onChange={(v) => s("dp_category", v)} /></Fld>
        </div>
      </Section>
      <SaveRow onSave={async () => { setSaving(true); try { await apiPut(`/api/po/${poId}/items/${itemNo}/invoice`, f); setSaved(true); setTimeout(() => setSaved(false), 2000); } finally { setSaving(false); } }} saving={saving} saved={saved} />
    </div>
  );
}

function ScheduleTab({ poId, itemNo, totalQty, unit }: { poId: number; itemNo: number; totalQty: number; unit: string }) {
  const { data, loading, refetch } = useAPI<{ schedule_lines: ScheduleLine[] }>(`/api/po/${poId}/items/${itemNo}/delivery-schedule`);
  const [lines, setLines] = useState<ScheduleLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.schedule_lines?.length) setLines(data.schedule_lines);
    else setLines([{ schedule_line: 1, delivery_date: "", scheduled_qty: totalQty, gr_qty: 0, open_qty: totalQty }]);
  }, [data, totalQty]);

  const upd = (i: number, k: keyof ScheduleLine, v: unknown) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  const total = lines.reduce((s, l) => s + +l.scheduled_qty, 0);
  const diff = +(total - totalQty).toFixed(3);
  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 12 }}>Loading…</div>;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: T.surface2 }}>
              {["#", "Delivery Date", `Sched. Qty (${unit})`, `GR Qty`, `Open Qty`, "Stat. Del. Date"].map((h) => (
                <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: T.amber, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.schedule_line} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "4px 8px", color: T.textMuted }}>{l.schedule_line}</td>
                <td style={{ padding: "3px 5px" }}><Inp value={l.delivery_date} type="date" small onChange={(v) => upd(i, "delivery_date", v)} /></td>
                <td style={{ padding: "3px 5px" }}><Inp value={l.scheduled_qty} type="number" small onChange={(v) => upd(i, "scheduled_qty", +v)} /></td>
                <td style={{ padding: "4px 8px", color: T.textMuted }}>{l.gr_qty ?? 0}</td>
                <td style={{ padding: "4px 8px", color: l.open_qty > 0 ? T.yellow : T.textMuted }}>{+(l.open_qty ?? l.scheduled_qty - (l.gr_qty ?? 0)).toFixed(3)}</td>
                <td style={{ padding: "3px 5px" }}><Inp value={l.stat_del_date ?? ""} type="date" small onChange={(v) => upd(i, "stat_del_date", v)} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: T.surface2 }}>
              <td colSpan={2} style={{ padding: "5px 8px", fontSize: 11, fontWeight: 600 }}>Total</td>
              <td style={{ padding: "5px 8px", fontWeight: 600, color: diff !== 0 ? T.yellow : T.green }}>
                {total} {unit}
                {diff !== 0 && <span style={{ marginLeft: 6, fontSize: 10, color: T.yellow }}>({diff > 0 ? "+" : ""}{diff} vs PO)</span>}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Btn small color="ghost" onClick={() => {
          const next = (lines[lines.length - 1]?.schedule_line ?? 0) + 1;
          setLines((ls) => [...ls, { schedule_line: next, delivery_date: "", scheduled_qty: 0, gr_qty: 0, open_qty: 0 }]);
        }}>+ Add line</Btn>
        <Btn small disabled={saving} onClick={async () => {
          setSaving(true);
          try { await apiPut(`/api/po/${poId}/items/${itemNo}/delivery-schedule`, { lines }); refetch(); }
          finally { setSaving(false); }
        }}>{saving ? "Saving…" : "Save"}</Btn>
      </div>
    </div>
  );
}

function ConfirmTab({ poId, itemNo }: { poId: number; itemNo: number }) {
  const { data, loading, refetch } = useAPI<{ confirmations: Confirmation[] }>(`/api/po/${poId}/items/${itemNo}/confirmations`);
  const [showAdd, setShowAdd] = useState(false);
  const [nc, setNc] = useState<Confirmation>({ sequence_no: 1, conf_control: "0004", conf_category: "LA", reference: "", inbound_delivery_no: "", order_ack_reqd: true, rejection_ind: false });
  const [saving, setSaving] = useState(false);
  const confs = data?.confirmations ?? [];
  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 12 }}>Loading…</div>;
  return (
    <div>
      <Section title="Confirmation Control">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Fld label="Conf. Control">
            <Sel value={nc.conf_control} onChange={(v) => setNc((x) => ({ ...x, conf_control: v }))} options={[
              { value: "0001", label: "0001 — Confirmations" },
              { value: "0002", label: "0002 — Rough GR" },
              { value: "0003", label: "0003 — Inb.Deliv./Rough GR" },
              { value: "0004", label: "0004 — Inbound Delivery" },
            ]} />
          </Fld>
          <Fld label=""><div style={{ paddingTop: 18 }}><Chk label="Order Acknowledgment Required" checked={nc.order_ack_reqd} onChange={(v) => setNc((x) => ({ ...x, order_ack_reqd: v }))} /></div></Fld>
        </div>
      </Section>
      {confs.length > 0 && (
        <Section title="Recorded Confirmations">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: T.surface2 }}>
                {["Cat.", "Del. Date", "Qty", "Reference", "Inbound Deliv.", "Rejection"].map((h) => (
                  <th key={h} style={{ padding: "5px 8px", color: T.amber, fontWeight: 600, textAlign: "left", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {confs.map((cf, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "4px 8px" }}>{cf.conf_category}</td>
                  <td style={{ padding: "4px 8px" }}>{cf.delivery_date ?? "—"}</td>
                  <td style={{ padding: "4px 8px" }}>{cf.quantity ?? "—"}</td>
                  <td style={{ padding: "4px 8px" }}>{cf.reference || "—"}</td>
                  <td style={{ padding: "4px 8px" }}>{cf.inbound_delivery_no || "—"}</td>
                  <td style={{ padding: "4px 8px" }}>{cf.rejection_ind ? <Badge label="Rejected" color="red" /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {!showAdd ? (
        <Btn small color="ghost" onClick={() => setShowAdd(true)}>+ Record confirmation</Btn>
      ) : (
        <Section title="New Confirmation">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Fld label="Delivery Date"><Inp value={nc.delivery_date ?? ""} type="date" onChange={(v) => setNc((x) => ({ ...x, delivery_date: v }))} /></Fld>
            <Fld label="Quantity"><Inp value={nc.quantity ?? ""} type="number" onChange={(v) => setNc((x) => ({ ...x, quantity: +v }))} /></Fld>
            <Fld label="Reference"><Inp value={nc.reference} onChange={(v) => setNc((x) => ({ ...x, reference: v }))} /></Fld>
            <Fld label="Inbound Del. No."><Inp value={nc.inbound_delivery_no} onChange={(v) => setNc((x) => ({ ...x, inbound_delivery_no: v }))} /></Fld>
            <Fld label=""><div style={{ paddingTop: 18 }}><Chk label="Rejection Indicator" checked={nc.rejection_ind} onChange={(v) => setNc((x) => ({ ...x, rejection_ind: v }))} /></div></Fld>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small disabled={saving} onClick={async () => {
              setSaving(true);
              try { await apiPost(`/api/po/${poId}/items/${itemNo}/confirmations`, nc); setShowAdd(false); refetch(); }
              finally { setSaving(false); }
            }}>{saving ? "…" : "Save"}</Btn>
            <Btn small color="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </Section>
      )}
    </div>
  );
}

function AddressTab({ poId, itemNo }: { poId: number; itemNo: number }) {
  const { data, loading, refetch } = useAPI<ItemAddress>(`/api/po/${poId}/items/${itemNo}/address`);
  const [f, setF]     = useState<ItemAddress>({ diff_address: false, street: "", city: "", zip_code: "", country: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => { if (data) setF(data); }, [data]);

  const onSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/po/${poId}/items/${itemNo}/address`, f);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      refetch();
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 11 }}>Loading address…</div>;

  return (
    <div>
      <Section title="Delivery Address Override">
        <div style={{ marginBottom: 12 }}>
          <Chk label="Use Different Delivery Address" checked={f.diff_address} onChange={(v) => setF({ ...f, diff_address: v })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, opacity: f.diff_address ? 1 : 0.5, pointerEvents: f.diff_address ? "auto" : "none" }}>
          <Fld label="Street/House No." span={2}><Inp value={f.street} onChange={(v) => setF({ ...f, street: v })} /></Fld>
          <Fld label="City"><Inp value={f.city} onChange={(v) => setF({ ...f, city: v })} /></Fld>
          <Fld label="Postal Code"><Inp value={f.zip_code} onChange={(v) => setF({ ...f, zip_code: v })} /></Fld>
          <Fld label="Country"><Inp value={f.country} onChange={(v) => setF({ ...f, country: v })} placeholder="e.g. GB, DE, US" /></Fld>
        </div>
        <div style={{ marginTop: 16 }}>
          <SaveRow onSave={onSave} saving={saving} saved={saved} />
        </div>
      </Section>
    </div>
  );
}

function WeightsTab({ poId, itemNo, baseUnit }: { poId: number; itemNo: number; baseUnit: string }) {
  const { data, loading, refetch } = useAPI<ItemWeights>(`/api/po/${poId}/items/${itemNo}/weights`);
  const [f, setF]     = useState<ItemWeights>({ base_uom: baseUnit, order_uom: baseUnit, conv_num: 1, conv_den: 1, gross_weight: 0, net_weight: 0, weight_unit: "KG", volume: 0, volume_unit: "M3" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => { if (data) setF(data); }, [data]);

  const onSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/po/${poId}/items/${itemNo}/weights`, f);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      refetch();
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 11 }}>Loading units/weights…</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="UOM Conversion">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}><Inp value={f.conv_num} type="number" onChange={(v) => setF({ ...f, conv_num: +v })} /></div>
            <div style={{ color: T.textMuted }}>{f.order_uom}</div>
            <div style={{ color: T.amber }}>=</div>
            <div style={{ flex: 1 }}><Inp value={f.conv_den} type="number" onChange={(v) => setF({ ...f, conv_den: +v })} /></div>
            <div style={{ color: T.textMuted }}>{f.base_uom}</div>
          </div>
          <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>Define the relation between the order unit and the base unit of measure.</p>
        </Section>
        <Section title="Weights and Volume">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Fld label="Gross Weight"><Inp value={f.gross_weight} type="number" onChange={(v) => setF({ ...f, gross_weight: +v })} /></Fld>
            <Fld label="Net Weight"><Inp value={f.net_weight} type="number" onChange={(v) => setF({ ...f, net_weight: +v })} /></Fld>
            <Fld label="Weight Unit"><Inp value={f.weight_unit} onChange={(v) => setF({ ...f, weight_unit: v })} /></Fld>
            <Fld label="Volume"><Inp value={f.volume} type="number" onChange={(v) => setF({ ...f, volume: +v })} /></Fld>
            <Fld label="Volume Unit"><Inp value={f.volume_unit} onChange={(v) => setF({ ...f, volume_unit: v })} /></Fld>
          </div>
        </Section>
      </div>
      <div style={{ marginTop: 10 }}>
        <SaveRow onSave={onSave} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

function AccountTab({ poId, itemNo }: { poId: number; itemNo: number }) {
  const { data, loading } = useAPI<{ assignments: AccountLine[] }>(`/api/po/${poId}/items/${itemNo}/account-assignments`);
  const [lines, setLines] = useState<AccountLine[]>([]);
  const [dist, setDist] = useState("2");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.assignments?.length) { setLines(data.assignments); setDist(data.assignments[0]?.distribution ?? "2"); }
    else setLines([{ sequence_no: 1, acct_assgt_cat: "K", distribution: "2", gl_account: "", cost_center: "", project_wbs: "", percentage: 100 }]);
  }, [data]);

  const upd = (i: number, k: keyof AccountLine, v: unknown) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const totalPct = lines.reduce((s, l) => s + +(l.percentage ?? 0), 0);
  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 12 }}>Loading…</div>;
  return (
    <div>
      <Section title="Account Assignment">
        <div style={{ display: "flex", gap: 16, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.textMuted }}>Distribution:</span>
          {[["1", "By quantity"], ["2", "By percentage"]].map(([v, l]) => (
            <label key={v} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, cursor: "pointer", color: T.text }}>
              <input type="radio" name={`dist-${poId}-${itemNo}`} value={v} checked={dist === v} onChange={() => setDist(v)} style={{ accentColor: T.amber }} />
              {l}
            </label>
          ))}
          {dist === "2" && (
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: totalPct > 100 ? T.red : totalPct === 100 ? T.green : T.yellow }}>
              Total: {totalPct.toFixed(1)}%
            </span>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: T.surface2 }}>
              {["Cat.", "G/L Account", "Cost Center", "WBS", dist === "2" ? "%" : "Quantity"].map((h) => (
                <th key={h} style={{ padding: "5px 8px", color: T.amber, fontWeight: 600, textAlign: "left", borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.sequence_no} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "3px 5px" }}>
                  <Sel small value={l.acct_assgt_cat} onChange={(v) => upd(i, "acct_assgt_cat", v)} options={[
                    { value: "K", label: "K — Cost center" },
                    { value: "C", label: "C — Sales order" },
                    { value: "F", label: "F — Order" },
                    { value: "P", label: "P — Project" },
                    { value: "N", label: "N — Network" },
                    { value: "A", label: "A — Asset" },
                  ]} />
                </td>
                <td style={{ padding: "3px 5px" }}><Inp value={l.gl_account} small onChange={(v) => upd(i, "gl_account", v)} /></td>
                <td style={{ padding: "3px 5px" }}><Inp value={l.cost_center} small onChange={(v) => upd(i, "cost_center", v)} /></td>
                <td style={{ padding: "3px 5px" }}><Inp value={l.project_wbs} small onChange={(v) => upd(i, "project_wbs", v)} /></td>
                <td style={{ padding: "3px 5px" }}>
                  <Inp value={dist === "2" ? (l.percentage ?? "") : (l.quantity ?? "")} type="number" small
                    onChange={(v) => upd(i, dist === "2" ? "percentage" : "quantity", +v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn small color="ghost" onClick={() => {
            const seq = (lines[lines.length - 1]?.sequence_no ?? 0) + 1;
            setLines((ls) => [...ls, { sequence_no: seq, acct_assgt_cat: "K", distribution: dist, gl_account: "", cost_center: "", project_wbs: "" }]);
          }}>+ Add account</Btn>
          <Btn small disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              await apiPut(`/api/po/${poId}/items/${itemNo}/account-assignments`, { assignments: lines.map((l) => ({ ...l, distribution: dist })) });
              setSaved(true); setTimeout(() => setSaved(false), 2000);
            } finally { setSaving(false); }
          }}>{saving ? "Saving…" : "Save"}</Btn>
          {saved && <span style={{ fontSize: 11, color: T.green }}>✓ Saved</span>}
        </div>
      </Section>
    </div>
  );
}

function TextsTab({ poId, po }: { poId: number; po: PO }) {
  const [f, setF] = useState({ header_text: po.header_text ?? "", delivery_terms_text: po.delivery_terms_text ?? "", warranty_text: po.warranty_text ?? "", penalty_text: po.penalty_text ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fields: [string, keyof typeof f][] = [["Header text", "header_text"], ["Terms of delivery", "delivery_terms_text"], ["Warranty", "warranty_text"], ["Penalty for breach", "penalty_text"]];
  return (
    <div>
      {fields.map(([label, key]) => (
        <Section key={key} title={label}>
          <textarea
            value={f[key]}
            onChange={(e) => setF((x) => ({ ...x, [key]: e.target.value }))}
            rows={3}
            style={{ width: "100%", fontSize: 12, padding: "7px 9px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </Section>
      ))}
      <SaveRow onSave={async () => { setSaving(true); try { await apiPost(`/api/po/${poId}/header-enrich`, f); setSaved(true); setTimeout(() => setSaved(false), 2000); } finally { setSaving(false); } }} saving={saving} saved={saved} />
    </div>
  );
}

function AdditionalTab({ poId, po }: { poId: number; po: PO }) {
  const [f, setF] = useState({ collective_no: po.collective_no ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <Section title="Additional Data">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 12 }}>
        <Fld label="Collective No.">
          <Inp value={f.collective_no} onChange={(v) => setF({ collective_no: v })} placeholder="External reference / legacy PO no." />
        </Fld>
      </div>
      <div style={{ padding: "8px 12px", background: T.surface, border: `1px solid ${T.borderHi}`, borderRadius: 5, fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
        💡 <strong style={{ color: T.text }}>Collective No.</strong> is used to track and trace POs in reports. Enter the legacy PO number when migrating from another system.
      </div>
      <SaveRow onSave={async () => { setSaving(true); try { await apiPost(`/api/po/${poId}/header-enrich`, f); setSaved(true); setTimeout(() => setSaved(false), 2000); } finally { setSaving(false); } }} saving={saving} saved={saved} />
    </Section>
  );
}

function StatusTab({ poId }: { poId: number }) {
  const { data, loading } = useAPI<{ status_lines: { item_no: number; ordered_qty: number; order_unit: string; delivered_qty: number; still_to_deliver_qty: number; invoiced_qty: number; still_to_deliver_val: number; }[] }>(`/api/po/${poId}/status`);
  if (loading) return <div style={{ color: T.textMuted, padding: 12, fontSize: 12 }}>Loading…</div>;
  const lines = data?.status_lines ?? [];
  return (
    <Section title="PO Status">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: T.surface2 }}>
            {["Item", "Ordered", "Unit", "Delivered", "Still to Deliver", "Invoiced", "Still-to-Del. Value"].map((h) => (
              <th key={h} style={{ padding: "5px 8px", color: T.amber, fontWeight: 600, textAlign: h === "Item" ? "left" : "right", borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: T.textMuted, fontSize: 12 }}>No status data yet — post goods receipts or invoices to see progress.</td></tr>
          )}
          {lines.map((l) => (
            <tr key={l.item_no} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "4px 8px", fontWeight: 700, color: T.amber }}>{String(l.item_no).padStart(5, "0")}</td>
              <td style={{ padding: "4px 8px", textAlign: "right" }}>{l.ordered_qty}</td>
              <td style={{ padding: "4px 8px", textAlign: "right", color: T.textMuted }}>{l.order_unit}</td>
              <td style={{ padding: "4px 8px", textAlign: "right", color: T.green }}>{l.delivered_qty}</td>
              <td style={{ padding: "4px 8px", textAlign: "right", color: l.still_to_deliver_qty > 0 ? T.yellow : T.textMuted }}>{l.still_to_deliver_qty}</td>
              <td style={{ padding: "4px 8px", textAlign: "right" }}>{l.invoiced_qty}</td>
              <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600 }}>{l.still_to_deliver_val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

// ─── Block modal ──────────────────────────────────────────────────────────

function BlockModal({ poId, itemNo, isBlocked, reasons, onClose, onDone }: {
  poId: number; itemNo: number; isBlocked: boolean;
  reasons: BlockReason[]; onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState(reasons[0]?.code ?? "01");
  const [saving, setSaving] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 24, width: 380, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, color: T.text }}>{isBlocked ? "Unblock" : "Block"} Item #{String(itemNo).padStart(5, "0")}</h3>
        {!isBlocked && (
          <Fld label="Block Reason">
            <Sel value={reason} onChange={setReason} options={reasons.map((r) => ({ value: r.code, label: `${r.code} — ${r.description}` }))} />
          </Fld>
        )}
        {isBlocked && <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 16px" }}>Removing this block will allow goods receipts to be posted against this line item.</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn color="ghost" small onClick={onClose}>Cancel</Btn>
          <Btn color={isBlocked ? "green" : "red"} small disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              if (isBlocked) await apiPost(`/api/po/${poId}/items/${itemNo}/unblock`, {});
              else await apiPost(`/api/po/${poId}/items/${itemNo}/block`, { block_reason_code: reason, blocked_by: "current_user" });
              onDone();
            } finally { setSaving(false); }
          }}>{saving ? "…" : isBlocked ? "Unblock" : "Block"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── New PO modal ─────────────────────────────────────────────────────────

function NewPOModal({ suppliers, onClose, onCreated }: {
  suppliers: { id: number; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [f, setF] = useState<NewPOForm>({ vendor_id: suppliers[0]?.id?.toString() ?? "", doc_type: "NB", currency: "USD", payment_terms: "NET30", purch_org: "1000", purch_group: "001", company_code: "1100" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const s = (k: keyof NewPOForm, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 24, width: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: T.amber }}>Create Purchase Order</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Fld label="Vendor" span={2}>
            <Sel value={f.vendor_id} onChange={(v) => s("vendor_id", v)} options={suppliers.map((s) => ({ value: s.id.toString(), label: s.name }))} />
          </Fld>
          <Fld label="Document Type">
            <Sel value={f.doc_type} onChange={(v) => s("doc_type", v)} options={[
              { value: "NB", label: "NB — Standard PO" },
              { value: "FO", label: "FO — Framework order" },
            ]} />
          </Fld>
          <Fld label="Currency"><Inp value={f.currency} onChange={(v) => s("currency", v)} /></Fld>
          <Fld label="Payment Terms"><Inp value={f.payment_terms} onChange={(v) => s("payment_terms", v)} /></Fld>
          <Fld label="Purch. Org."><Inp value={f.purch_org} onChange={(v) => s("purch_org", v)} /></Fld>
          <Fld label="Purch. Group"><Inp value={f.purch_group} onChange={(v) => s("purch_group", v)} /></Fld>
          <Fld label="Company Code"><Inp value={f.company_code} onChange={(v) => s("company_code", v)} /></Fld>
        </div>
        {err && <div style={{ fontSize: 11, color: T.red, marginBottom: 10 }}>⚠ {err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn color="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={saving} onClick={async () => {
            if (!f.vendor_id) { setErr("Vendor is required"); return; }
            setSaving(true); setErr("");
            try {
              await apiPost("/api/purchase-orders", { supplier_id: parseInt(f.vendor_id), document_type: f.doc_type, currency: f.currency, purchasing_org: f.purch_org, purchasing_group: f.purch_group, company_code: f.company_code, lines: [] });
              onCreated();
            } catch (e: unknown) {
              setErr(e instanceof Error ? e.message : "Failed to create PO");
            } finally { setSaving(false); }
          }}>{saving ? "Creating…" : "Create PO"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function POManagement() {
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [lines, setLines] = useState<POLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [selectedLine, setSelectedLine] = useState<POLine | null>(null);
  const [headerTab, setHeaderTab] = useState("Conditions");
  const [itemTab, setItemTab] = useState("Delivery");
  const [search, setSearch] = useState("");
  const [blockModal, setBlockModal] = useState<{ itemNo: number; isBlocked: boolean } | null>(null);
  const [showNewPO, setShowNewPO] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [blockReasons, setBlockReasons] = useState<BlockReason[]>([]);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load reference data
  useEffect(() => {
    apiFetch("/api/po/block-reasons").then((r) => r.json()).then((d) => setBlockReasons(d.block_reasons ?? [])).catch(() => {});
    apiFetch("/api/suppliers?limit=200").then((r) => r.json()).then((d) => {
      const raw = d.suppliers ?? d.data ?? [];
      setSuppliers(raw.map((s: { id: number; name?: string; company_name?: string }) => ({ id: s.id, name: s.name ?? s.company_name ?? `Supplier ${s.id}` })));
    }).catch(() => {});
  }, []);

  const loadPOs = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/purchase-orders?search=${encodeURIComponent(q)}&limit=50` : "/api/purchase-orders?limit=50";
      const res = await apiFetch(url);
      const d   = await res.json();
      const arr: PO[] = d.purchase_orders ?? d.data ?? [];
      setPos(arr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPOs(); }, [loadPOs]);

  const selectPO = async (po: PO) => {
    setSelectedPO(po);
    setSelectedLine(null);
    setHeaderTab("Conditions");
    setLinesLoading(true);
    try {
      const res = await apiFetch(`/api/purchase-orders/${po.id}/items`);
      const d = await res.json();
      setLines(d.items ?? d.purchase_order_lines ?? d.lines ?? []);
    } catch {
      setLines([]);
    } finally {
      setLinesLoading(false);
    }
  };

  const onSearch = (v: string) => {
    setSearch(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => loadPOs(v), 350);
  };

  const HEADER_TABS = ["Conditions", "Texts", "Partners", "Additional Data", "Org. Data", "Status", "Output"];
  const ITEM_TABS   = ["Delivery", "Invoice", "Confirmations", "Delivery Schedule", "Delivery Address", "Quantities/Weights", "Condition Control"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, color: T.text, fontFamily: "inherit" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.amber }}>Purchase Orders</span>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search PO number, vendor…"
          style={{ flex: 1, maxWidth: 300, padding: "5px 10px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 5, color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}
        />
        <div style={{ marginLeft: "auto" }}>
          <Btn onClick={() => setShowNewPO(true)}>+ New PO</Btn>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Document overview panel */}
        <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${T.border}`, overflowY: "auto", background: T.surface }}>
          <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${T.border}` }}>
            Document Overview
          </div>
          {loading && <div style={{ padding: 20, textAlign: "center", color: T.textMuted, fontSize: 12 }}>Loading…</div>}
          {!loading && pos.length === 0 && (
            <div style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>No purchase orders found.</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>Create one from MaterialHub or click "+ New PO".</div>
            </div>
          )}
          {pos.map((po) => (
            <div
              key={po.id}
              onClick={() => selectPO(po)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderLeft: selectedPO?.id === po.id ? `3px solid ${T.amber}` : "3px solid transparent",
                background: selectedPO?.id === po.id ? T.surface2 : "transparent",
                borderBottom: `1px solid ${T.border}`,
                transition: "background 0.1s",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>{po.po_number}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{po.vendor_name ?? po.supplier_name ?? "—"}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                <Badge label={po.status ?? "OPEN"} color={statusColor(po.status)} />
                {po.total_amount != null && (
                  <span style={{ fontSize: 10, color: T.textMuted, marginLeft: "auto" }}>
                    {po.currency} {po.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main detail area */}
        {!selectedPO ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.textMuted }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📄</div>
            <div style={{ fontSize: 13 }}>Select a purchase order to view details</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* PO summary bar */}
            <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "12px 20px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase" }}>Standard PO</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.amber }}>{selectedPO.po_number}</div>
                </div>
                {[
                  ["Vendor",       selectedPO.vendor_name ?? selectedPO.supplier_name],
                  ["Doc. Date",    selectedPO.doc_date ?? selectedPO.created_at?.slice(0, 10)],
                  ["Currency",     selectedPO.currency],
                  ["Exch. Rate",   selectedPO.exchange_rate?.toFixed(5)],
                  ["Purch. Org",   selectedPO.purch_org],
                ].map(([k, v]) => v ? (
                  <div key={k as string}>
                    <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginTop: 2 }}>{v}</div>
                  </div>
                ) : null)}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={selectedPO.status ?? "OPEN"} color={statusColor(selectedPO.status)} />
                  {selectedPO.output_sent && <Badge label="Output sent" color="green" />}
                </div>
              </div>
            </div>

            {/* Header tabs */}
            <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 20px", flexShrink: 0 }}>
              <div style={{ paddingTop: 10 }}>
                <Tabs tabs={HEADER_TABS} active={headerTab} onChange={setHeaderTab} />
              </div>
            </div>
            <div style={{ padding: "14px 20px", background: T.bg, flexShrink: 0 }}>
              {headerTab === "Conditions" && (
                <Section title="Header Conditions">
                  <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>Header-level surcharges and discounts apply proportionally across all line items. Use item-level Condition Control tab for line-specific overrides.</p>
                </Section>
              )}
              {headerTab === "Texts"           && <TextsTab poId={selectedPO.id} po={selectedPO} />}
              {headerTab === "Additional Data" && <AdditionalTab poId={selectedPO.id} po={selectedPO} />}
              {headerTab === "Org. Data" && (
                <Section title="Organizational Data">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <Fld label="Purch. Organization"><Inp value={selectedPO.purch_org ?? "—"} readOnly /></Fld>
                    <Fld label="Purch. Group"><Inp value={selectedPO.purch_group ?? "—"} readOnly /></Fld>
                    <Fld label="Company Code"><Inp value={selectedPO.company_code ?? "—"} readOnly /></Fld>
                  </div>
                </Section>
              )}
              {headerTab === "Status"  && <StatusTab poId={selectedPO.id} />}
              {headerTab === "Partners" && (
                <Section title="Partners">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Fld label="Goods Supplier"><Inp value={selectedPO.vendor_name ?? selectedPO.supplier_name ?? "—"} readOnly /></Fld>
                    <Fld label="Invoicing Party"><Inp value={selectedPO.vendor_name ?? selectedPO.supplier_name ?? "—"} readOnly /></Fld>
                  </div>
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 10, marginBottom: 0 }}>Configure separate invoicing party via the header enrichment API if the goods supplier and invoicing party differ.</p>
                </Section>
              )}
              {headerTab === "Output" && (
                <Section title="Output / Print">
                  <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    {[["1", "🖨 Print"], ["5", "✉ Email"], ["6", "⇄ EDI"]].map(([med, label]) => (
                      <Btn key={med} color="ghost" small onClick={async () => {
                        await apiPost(`/api/po/${selectedPO.id}/output`, { medium: med, partner_function: "VN", language: "EN" });
                        setSelectedPO((p) => p ? { ...p, output_sent: true } : p);
                      }}>{label}</Btn>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>
                    {selectedPO.output_sent ? "✓ Output previously sent to supplier." : "PO not yet sent to supplier."}
                  </div>
                </Section>
              )}
            </div>

            {/* Item overview */}
            <div style={{ padding: "0 20px 12px", flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Item Overview</div>
              <div style={{ overflowX: "auto", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: T.surface2 }}>
                      {["St.", "Itm", "A", "Material", "Short Text", "PO Qty", "OUn", "Del. Date", "Net Price", "Curr.", ""].map((h, i) => (
                        <th key={i} style={{ padding: "6px 8px", textAlign: h === "Net Price" || h === "PO Qty" ? "right" : "left", color: T.amber, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linesLoading && (
                      <tr><td colSpan={11} style={{ padding: 16, textAlign: "center", color: T.textMuted }}>Loading items…</td></tr>
                    )}
                    {!linesLoading && lines.filter((l) => !l.deleted).length === 0 && (
                      <tr><td colSpan={11} style={{ padding: 16, textAlign: "center", color: T.textMuted, fontSize: 12 }}>No line items — add items to this PO.</td></tr>
                    )}
                    {lines.filter((l) => !l.deleted).map((line) => (
                      <tr
                        key={line.item_no}
                        onClick={() => { setSelectedLine(line); setItemTab("Delivery"); }}
                        style={{
                          borderBottom: `1px solid ${T.border}`,
                          cursor: "pointer",
                          background: selectedLine?.item_no === line.item_no ? T.surface2 : "transparent",
                          opacity: line.blocked ? 0.65 : 1,
                        }}
                      >
                        <td style={{ padding: "5px 8px" }}>
                          {line.blocked && <span title="Blocked" style={{ color: T.yellow, fontSize: 13 }}>🔒</span>}
                        </td>
                        <td style={{ padding: "5px 8px", fontWeight: 700, color: T.amber }}>{String(line.item_no).padStart(5, "0")}</td>
                        <td style={{ padding: "5px 8px", color: T.textMuted }}>{line.account_assignment || "L"}</td>
                        <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 10, color: T.textMuted }}>{line.material_code ?? "—"}</td>
                        <td style={{ padding: "5px 8px", maxWidth: 220 }}>{line.material_name ?? line.short_text ?? "—"}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{line.quantity}</td>
                        <td style={{ padding: "5px 8px", color: T.textMuted }}>{line.unit_of_measure}</td>
                        <td style={{ padding: "5px 8px", whiteSpace: "nowrap", color: T.textMuted }}>{line.delivery_date ?? "—"}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: T.text }}>{line.unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "5px 8px", color: T.textMuted }}>{line.currency ?? selectedPO.currency}</td>
                        <td style={{ padding: "5px 6px" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setBlockModal({ itemNo: line.item_no, isBlocked: !!line.blocked }); }}
                            style={{
                              padding: "2px 8px", fontSize: 10, cursor: "pointer",
                              border: `1px solid ${line.blocked ? T.green : T.red}`,
                              borderRadius: 3, background: "transparent",
                              color: line.blocked ? T.green : T.red, fontFamily: "inherit",
                            }}
                          >
                            {line.blocked ? "Unblock" : "Block"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "6px 10px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
                  <Btn small color="ghost" onClick={() => setShowAddItem(true)}>+ Add item</Btn>
                  <Btn small color="ghost">Mass change</Btn>
                </div>
              </div>
            </div>

            {/* Item detail — 7 tabs */}
            {selectedLine && (
              <div style={{ padding: "0 20px 24px", flexShrink: 0 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ padding: "8px 14px", background: T.surface2, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>Item {String(selectedLine.item_no).padStart(5, "0")}</span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{selectedLine.material_name ?? selectedLine.short_text}</span>
                    {selectedLine.blocked && <Badge label="BLOCKED" color="yellow" />}
                  </div>
                  <div style={{ padding: "10px 14px 0" }}>
                    <Tabs tabs={ITEM_TABS} active={itemTab} onChange={setItemTab} small />
                  </div>
                  <div style={{ padding: "0 14px 14px" }}>
                    {itemTab === "Delivery"          && <DeliveryTab poId={selectedPO.id} itemNo={selectedLine.item_no} />}
                    {itemTab === "Invoice"           && <InvoiceTab poId={selectedPO.id} itemNo={selectedLine.item_no} />}
                    {itemTab === "Confirmations"     && <ConfirmTab poId={selectedPO.id} itemNo={selectedLine.item_no} />}
                    {itemTab === "Delivery Schedule" && <ScheduleTab poId={selectedPO.id} itemNo={selectedLine.item_no} totalQty={selectedLine.quantity} unit={selectedLine.unit_of_measure ?? "EA"} />}
                    {itemTab === "Delivery Address"  && <AddressTab poId={selectedPO.id} itemNo={selectedLine.item_no} />}
                    {itemTab === "Quantities/Weights" && <WeightsTab poId={selectedPO.id} itemNo={selectedLine.item_no} baseUnit={selectedLine.unit_of_measure ?? "EA"} />}
                    {itemTab === "Condition Control" && (
                      <Section title="Item-Level Conditions">
                        <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>Item pricing conditions — gross price, discounts, surcharges, freight — are maintained here and override header conditions for this line.</p>
                      </Section>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {blockModal && selectedPO && (
        <BlockModal
          poId={selectedPO.id}
          itemNo={blockModal.itemNo}
          isBlocked={blockModal.isBlocked}
          reasons={blockReasons}
          onClose={() => setBlockModal(null)}
          onDone={() => { setBlockModal(null); selectPO(selectedPO); }}
        />
      )}
      {showNewPO && (
        <NewPOModal
          suppliers={suppliers}
          onClose={() => setShowNewPO(false)}
          onCreated={() => { setShowNewPO(false); loadPOs(); }}
        />
      )}
      {/* ─── Add Item modal ─────────────────────────────────────────────────────── */}
      {showAddItem && selectedPO && (
        <AddItemModal
          poId={selectedPO.id}
          onClose={() => setShowAddItem(false)}
          onCreated={() => { setShowAddItem(false); selectPO(selectedPO); }}
        />
      )}
    </div>
  );
}

// ─── Add Item Modal — Standallone Component ───────────────────────────────

function AddItemModal({ poId, onClose, onCreated }: {
  poId: number; onClose: () => void; onCreated: () => void;
}) {
  const [f, setF] = useState({ product_id: "", qty: 1, unit: "EA", price: 10.0, text: "", date: new Date().toISOString().split("T")[0] });
  const [products, setProducts] = useState<{ id: number; code: string; name: string; base_unit: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/api/stock/products?limit=100")
      .then(r => r.ok ? r.json() : Promise.reject("Fetch failed"))
      .then(d => { if (active) setProducts(d.products ?? []); })
      .catch(e => { console.error("AddItemModal fetch error:", e); });
    return () => { active = false; };
  }, []); // Only fetch on mount

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 24, width: 440, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: T.amber }}>Add Item to PO</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Fld label="Material" span={2}>
            <Sel value={f.product_id} onChange={(v) => {
              const p = products.find(ox => ox.id.toString() === v);
              setF(x => ({ ...x, product_id: v, unit: p?.base_unit ?? "EA", text: p?.name ?? "" }));
            }} options={products.map(p => ({ value: p.id.toString(), label: `[${p.code}] ${p.name}` }))} />
          </Fld>
          <Fld label="Quantity"><Inp type="number" value={f.qty} onChange={v => setF(x => ({ ...x, qty: +v }))} /></Fld>
          <Fld label="Unit"><Inp value={f.unit} onChange={v => setF(x => ({ ...x, unit: v }))} /></Fld>
          <Fld label="Net Price"><Inp type="number" value={f.price} onChange={v => setF(x => ({ ...x, price: +v }))} /></Fld>
          <Fld label="Delivery Date"><Inp type="date" value={f.date} onChange={v => setF(x => ({ ...x, date: v }))} /></Fld>
          <Fld label="Short Text" span={2}><Inp value={f.text} onChange={v => setF(x => ({ ...x, text: v }))} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn color="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={saving || !f.product_id} onClick={async () => {
             setSaving(true);
             try {
               await apiPost(`/api/purchase-orders/${poId}/items`, { product_id: parseInt(f.product_id), quantity: f.qty, unit: f.unit, unit_price: f.price, short_text: f.text, delivery_date: f.date });
               onCreated();
             } finally { setSaving(false); }
          }}>{saving ? "Adding…" : "Add Item"}</Btn>
        </div>
      </div>
    </div>
  );
}
