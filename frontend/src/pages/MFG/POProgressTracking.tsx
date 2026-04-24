import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── Theme Tokens (Ambient/Amber MFG) ─────────────────────────────────────────
const T = {
  bg: "#1a0e00",
  surface: "#201405",
  surface2: "#2d1b0a",
  surface3: "#3d250d",
  border: "#4a3319",
  borderMuted: "#332211",
  amber: "#f59e0b",
  amberDim: "#b45309",
  text: "#fef3c7",
  textMuted: "#d48d3b",
  textDim: "#92400e",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  gray: "#6b7280",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScenarioEvent {
  event_code: string;
  event_description: string;
  sequence_no: number;
  planned_offset_days: number;
}

interface Scenario {
  code: string;
  name: string;
  description: string;
  events: ScenarioEvent[];
}

interface ProgressRow {
  id: number;
  item_no: number;
  event_code: string;
  event_description: string;
  sequence_no: number;
  baseline_date: string;
  plan_date: string;
  forecast_date: string | null;
  actual_date: string | null;
  variance_days: number;
  rag_status: string;
  notes: string;
}

interface PO {
  id: number;
  po_number: string;
  vendor_name?: string;
  supplier_name?: string;
  status?: string;
}

interface POLine {
  line_number: number;
  short_text: string;
  is_tracked?: boolean; // We'll infer this from progress data
}

interface DashboardData {
  summary: {
    total_tracking: number;
    red_events: number;
    yellow_events: number;
    green_events: number;
  };
  alerts: {
    po_id: number;
    po_number: string;
    item_no: number;
    event_code: string;
    event_desc: string;
    plan_date: string;
    forecast_date: string | null;
    variance_days: number;
    rag_status: string;
  }[];
}

// ─── Components ───────────────────────────────────────────────────────────────

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44`, textTransform: "uppercase" }}>
    {label}
  </span>
);

const IconButton = ({ children, onClick, color = T.amber }: any) => (
  <button
    onClick={onClick}
    style={{ background: "transparent", border: "none", color, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, transition: "background 0.2s" }}
    onMouseOver={(e) => (e.currentTarget.style.background = `${T.amber}11`)}
    onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
  >
    {children}
  </button>
);

const Btn = ({ children, onClick, variant = "primary", disabled = false, small = false }: any) => {
  const isPrimary = variant === "primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "4px 10px" : "8px 16px",
        background: isPrimary ? T.amber : "transparent",
        color: isPrimary ? T.bg : T.amber,
        border: `1px solid ${T.amber}`,
        borderRadius: 6,
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
};

export default function POProgressTracking() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pos, setPos] = useState<PO[]>([]);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [lines, setLines] = useState<POLine[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [initForm, setInitForm] = useState({ scenario: "IMPORT", baseline: new Date().toISOString().split("T")[0] });
  const [editRow, setEditRow] = useState<string | null>(null); // event_code
  const [editForm, setEditForm] = useState({ actual: "", forecast: "", notes: "" });

  const apiFetch = useCallback((url: string, opts: any = {}) => {
    return fetch(url, { ...opts, credentials: "include" });
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await apiFetch("/api/po/progress/dashboard");
      const d = await res.json();
      setDashboard(d);
    } catch (err) { console.error("Dash load fail", err); }
  }, [apiFetch]);

  const loadPOs = useCallback(async () => {
    try {
      const res = await apiFetch("/api/purchase-orders?limit=100");
      const d = await res.json();
      setPos(d.purchase_orders ?? []);
    } catch (err) { console.error("PO load fail", err); }
  }, [apiFetch]);

  const loadScenarios = useCallback(async () => {
    try {
      const res = await apiFetch("/api/po/scenarios");
      const d = await res.json();
      setScenarios(d);
    } catch (err) { console.error("Scenario load fail", err); }
  }, [apiFetch]);

  useEffect(() => {
    loadDashboard();
    loadPOs();
    loadScenarios();
  }, [loadDashboard, loadPOs, loadScenarios]);

  const selectPO = async (po: PO) => {
    setSelectedPO(po);
    setSelectedLine(null);
    setProgress([]);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/purchase-orders/${po.id}/items`);
      const d = await res.json();
      setLines(d.items ?? []);
    } finally { setLoading(false); }
  };

  const selectLine = async (itemNo: number) => {
    setSelectedLine(itemNo);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/po/${selectedPO?.id}/progress`);
      const d = await res.json();
      // Filter for this specific line item
      setProgress(d.filter((r: any) => r.item_no === itemNo));
    } finally { setLoading(false); }
  };

  const initializeTracking = async () => {
    if (!selectedPO || selectedLine === null) return;
    setLoading(true);
    try {
      await apiFetch(`/api/po/${selectedPO.id}/progress/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_no: selectedLine, scenario_code: initForm.scenario, baseline_date: initForm.baseline }),
      });
      setShowInitModal(false);
      selectLine(selectedLine);
      loadDashboard();
    } finally { setLoading(false); }
  };

  const saveUpdate = async (eventCode: string) => {
    if (!selectedPO) return;
    setLoading(true);
    try {
      await apiFetch(`/api/po/${selectedPO.id}/progress/${eventCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_date: editForm.actual, forecast_date: editForm.forecast, notes: editForm.notes }),
      });
      setEditRow(null);
      selectLine(selectedLine!);
      loadDashboard();
    } finally { setLoading(false); }
  };

  const getRAGColor = (status: string) => {
    switch (status) {
      case "GREEN": return T.green;
      case "YELLOW": return T.yellow;
      case "RED": return T.red;
      default: return T.gray;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, color: T.text, fontSize: 13 }}>
      
      {/* ── Section 1: Dashboard Alert Banner ── */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <StatCard label="RED Events (Overdue)" value={dashboard?.summary.red_events ?? 0} color={T.red} />
          <StatCard label="YELLOW Events (At Risk)" value={dashboard?.summary.yellow_events ?? 0} color={T.yellow} />
          <StatCard label="GREEN Events (On Track)" value={dashboard?.summary.green_events ?? 0} color={T.green} />
          <StatCard label="Total Tracking" value={dashboard?.summary.total_tracking ?? 0} color={T.amber} />
        </div>

        {dashboard?.alerts && dashboard.alerts.length > 0 && (
          <div style={{ background: T.surface2, borderRadius: 8, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.surface3, color: T.textMuted, textAlign: "left" }}>
                  <th style={{ padding: "8px 12px" }}>PO Number</th>
                  <th style={{ padding: "8px 12px" }}>Item</th>
                  <th style={{ padding: "8px 12px" }}>Event</th>
                  <th style={{ padding: "8px 12px" }}>Plan Date</th>
                  <th style={{ padding: "8px 12px" }}>Forecast</th>
                  <th style={{ padding: "8px 12px" }}>Variance</th>
                  <th style={{ padding: "8px 12px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.alerts.map((a, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.borderMuted}`, borderLeft: `3px solid ${getRAGColor(a.rag_status)}` }}>
                    <td style={{ padding: "8px 12px", color: T.amber, fontWeight: 600 }}>{a.po_number}</td>
                    <td style={{ padding: "8px 12px" }}>{a.item_no}</td>
                    <td style={{ padding: "8px 12px" }}>{a.event_desc}</td>
                    <td style={{ padding: "8px 12px" }}>{a.plan_date}</td>
                    <td style={{ padding: "8px 12px" }}>{a.forecast_date ?? "—"}</td>
                    <td style={{ padding: "8px 12px", color: a.variance_days > 0 ? T.red : T.green }}>
                      {a.variance_days > 0 ? `+${a.variance_days} days` : a.variance_days < 0 ? `${a.variance_days} days` : "On time"}
                    </td>
                    <td style={{ padding: "8px 12px" }}><Badge label={a.rag_status} color={getRAGColor(a.rag_status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        
        {/* ── Section 2: PO Selector ── */}
        <div style={{ width: 280, borderRight: `1px solid ${T.border}`, background: T.surface, overflowY: "auto", padding: "12px 0" }}>
          <div style={{ padding: "0 12px 12px", fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Select Purchase Order
          </div>
          {pos.map(po => (
            <div key={po.id} onClick={() => selectPO(po)} style={{ padding: "10px 16px", cursor: "pointer", background: selectedPO?.id === po.id ? T.surface2 : "transparent", borderLeft: selectedPO?.id === po.id ? `3px solid ${T.amber}` : "3px solid transparent", borderBottom: `1px solid ${T.borderMuted}` }}>
              <div style={{ color: T.amber, fontWeight: 700 }}>{po.po_number}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{po.vendor_name ?? po.supplier_name ?? "Unknown Vendor"}</div>
            </div>
          ))}
        </div>

        {/* ── Section 3: Item & Timeline Area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, overflowY: "auto" }}>
          {!selectedPO ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, flexDirection: "column" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div>Select a Purchase Order from the left panel to begin.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: T.amber }}>{selectedPO.po_number}</span>
                <span style={{ color: T.textMuted }}>|</span>
                <span style={{ fontSize: 14 }}>{selectedPO.vendor_name ?? selectedPO.supplier_name}</span>
                <Badge label={selectedPO.status ?? "OPEN"} color={T.amber} />
              </div>

              {/* Item selection tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                {lines.map(l => (
                  <div 
                    key={l.line_number} 
                    onClick={() => selectLine(l.line_number)}
                    style={{ 
                      padding: "6px 12px", 
                      borderRadius: 6, 
                      cursor: "pointer", 
                      background: selectedLine === l.line_number ? T.amber : T.surface2,
                      color: selectedLine === l.line_number ? T.bg : T.text,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    Item {l.line_number}: {l.short_text}
                  </div>
                ))}
              </div>

              {selectedLine !== null && (
                <div>
                  {progress.length === 0 ? (
                    <div style={{ padding: 40, background: T.surface, borderRadius: 12, border: `1px dashed ${T.border}`, textAlign: "center" }}>
                      <div style={{ color: T.textMuted, marginBottom: 16 }}>No tracking initialized for this item.</div>
                      <Btn onClick={() => setShowInitModal(true)}>Initialize Tracking</Btn>
                    </div>
                  ) : (
                    <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: T.surface2, textAlign: "left", color: T.textMuted }}>
                            <th style={{ padding: 12 }}>Milestone Event</th>
                            <th style={{ padding: 12 }}>Baseline</th>
                            <th style={{ padding: 12 }}>Plan</th>
                            <th style={{ padding: 12 }}>Forecast</th>
                            <th style={{ padding: 12 }}>Actual</th>
                            <th style={{ padding: 12 }}>Var.</th>
                            <th style={{ padding: 12 }}>RAG</th>
                            <th style={{ padding: 12 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {progress.map((p) => (
                            <React.Fragment key={p.id}>
                              <tr style={{ borderBottom: `1px solid ${T.borderMuted}`, opacity: loading ? 0.5 : 1 }}>
                                <td style={{ padding: 12, fontWeight: 700 }}>{p.event_description}</td>
                                <td style={{ padding: 12, fontSize: 11 }}>{p.baseline_date}</td>
                                <td style={{ padding: 12, fontSize: 11 }}>{p.plan_date}</td>
                                <td style={{ padding: 12, fontSize: 11, color: T.yellow }}>{p.forecast_date ?? "—"}</td>
                                <td style={{ padding: 12, fontSize: 11, color: T.green }}>{p.actual_date ?? "—"}</td>
                                <td style={{ padding: 12, color: p.variance_days > 0 ? T.red : T.green }}>
                                  {p.variance_days ? `${p.variance_days > 0 ? "+" : ""}${p.variance_days}` : "0"}
                                </td>
                                <td style={{ padding: 12 }}>
                                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: getRAGColor(p.rag_status), boxShadow: `0 0 8px ${getRAGColor(p.rag_status)}44` }} />
                                </td>
                                <td style={{ padding: 12 }}>
                                  <Btn small variant="secondary" onClick={() => {
                                    setEditRow(p.event_code);
                                    setEditForm({ actual: p.actual_date ?? "", forecast: p.forecast_date ?? "", notes: p.notes });
                                  }}>Update</Btn>
                                </td>
                              </tr>
                              {editRow === p.event_code && (
                                <tr style={{ background: `${T.amber}08` }}>
                                  <td colSpan={8} style={{ padding: "16px 24px", borderBottom: `1px solid ${T.amber}44` }}>
                                    <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <label style={{ fontSize: 10, color: T.textMuted }}>Forecast Date</label>
                                        <input type="date" value={editForm.forecast} onChange={e => setEditForm({ ...editForm, forecast: e.target.value })} style={inputStyle} />
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <label style={{ fontSize: 10, color: T.textMuted }}>Actual Date</label>
                                        <input type="date" value={editForm.actual} onChange={e => setEditForm({ ...editForm, actual: e.target.value })} style={inputStyle} />
                                      </div>
                                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                                        <label style={{ fontSize: 10, color: T.textMuted }}>Internal Notes</label>
                                        <input type="text" placeholder="Add tracking comments..." value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={inputStyle} />
                                      </div>
                                      <div style={{ display: "flex", gap: 8 }}>
                                        <Btn small onClick={() => saveUpdate(p.event_code)}>Save</Btn>
                                        <Btn small variant="secondary" onClick={() => setEditRow(null)}>Cancel</Btn>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Initialization Modal ── */}
      {showInitModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.amber}`, borderRadius: 12, padding: 32, width: 400 }}>
            <h3 style={{ marginTop: 0, color: T.amber }}>Initialize Tracking</h3>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 24 }}>Set up milestone timeline for Item {selectedLine} using a scenario template.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.textMuted }}>Scenario Template</label>
                <select value={initForm.scenario} onChange={e => setInitForm({ ...initForm, scenario: e.target.value })} style={inputStyle}>
                  {scenarios.map(s => <option key={s.code} value={s.code}>{s.name} ({s.events.length} events)</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.textMuted }}>Baseline Date (T=0)</label>
                <input type="date" value={initForm.baseline} onChange={e => setInitForm({ ...initForm, baseline: e.target.value })} style={inputStyle} />
              </div>
              
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <Btn variant="primary" onClick={initializeTracking} disabled={loading}>Initialize</Btn>
                <Btn variant="secondary" onClick={() => setShowInitModal(false)}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const isNeutral = value === 0;
  return (
    <div style={{ 
      flex: 1, 
      padding: "12px 20px", 
      background: !isNeutral && (color === T.red || color === T.yellow) ? `${color}11` : T.surface2, 
      border: `1px solid ${!isNeutral ? color : T.border}`, 
      borderRadius: 8 
    }}>
      <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: !isNeutral ? color : T.text }}>{value}</div>
    </div>
  );
}

const inputStyle = {
  background: T.bg,
  border: `1px solid ${T.border}`,
  borderRadius: 4,
  padding: "6px 10px",
  color: T.text,
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit"
};
