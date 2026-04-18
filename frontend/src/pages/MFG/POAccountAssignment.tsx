// ─────────────────────────────────────────────────────────────────────────────
// POAccountAssignment.tsx — PO Multi-Account Assignment Editor
// Phase 2 implementation matches SupplyXERP dark theme (amber/brown palette)
// Allows split-account assignment by percentage or quantity for PO line items.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from "react";

const T = {
  bg:        "#1a0e00",
  surface:   "#2a1a00",
  surface2:  "#3a2800",
  border:    "#4a3800",
  amber:     "#f59e0b",
  text:      "#fef3c7",
  textMuted: "#92400e",
  green:     "#22c55e",
  red:       "#ef4444",
  yellow:    "#eab308",
};

interface PO {
  id: number;
  po_number: string;
}

interface POLine {
  item_no: number;
  short_text: string;
  quantity: number;
  unit?: string;
}

interface Assignment {
  sequence_no: number;
  acct_assgt_cat: string;
  distribution: string; // '1'=qty, '2'=%
  gl_account: string;
  cost_center: string;
  project_wbs: string;
  quantity?: number;
  percentage?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
}

const POAccountAssignment: React.FC = () => {
  const [pos, setPos] = useState<PO[]>([]);
  const [selectedPO, setSelectedPO] = useState<number | null>(null);
  const [lines, setLines] = useState<POLine[]>([]);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load PO list on mount
  useEffect(() => {
    apiFetch("/api/purchase-orders?limit=100")
      .then(res => res.json())
      .then(data => setPos(data.purchase_orders || []));
  }, []);

  // Load lines for selected PO
  useEffect(() => {
    if (!selectedPO) {
      setLines([]);
      setSelectedItem(null);
      return;
    }
    apiFetch(`/api/purchase-orders/${selectedPO}`)
      .then(res => res.json())
      .then(data => {
        setLines(data.lines || []);
        if (data.lines?.length > 0) setSelectedItem(data.lines[0].item_no);
      });
  }, [selectedPO]);

  // Load assignments for selected item
  const loadAssignments = useCallback(() => {
    if (!selectedPO || !selectedItem) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    apiFetch(`/api/po/${selectedPO}/items/${selectedItem}/account-assignments`)
      .then(res => res.json())
      .then(data => {
        if (data.assignments?.length > 0) {
          setAssignments(data.assignments);
        } else {
          // Default single row
          setAssignments([{
            sequence_no: 1,
            acct_assgt_cat: 'K',
            distribution: '2',
            gl_account: '',
            cost_center: '',
            project_wbs: '',
            percentage: 100
          }]);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedPO, selectedItem]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const updateLine = (idx: number, patch: Partial<Assignment>) => {
    setAssignments(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };

  const addLine = () => {
    const nextSeq = (assignments[assignments.length - 1]?.sequence_no || 0) + 1;
    setAssignments([...assignments, {
      sequence_no: nextSeq,
      acct_assgt_cat: 'K',
      distribution: assignments[0]?.distribution || '2',
      gl_account: '',
      cost_center: '',
      project_wbs: '',
      percentage: 0
    }]);
  };

  const removeLine = (idx: number) => {
    if (assignments.length === 1) return;
    setAssignments(assignments.filter((_, i) => i !== idx));
  };

  const totalPct = useMemo(() => assignments.reduce((s, a) => s + (a.percentage || 0), 0), [assignments]);
  const distribution = assignments[0]?.distribution || '2';

  const handleSave = async () => {
    if (!selectedPO || !selectedItem) return;
    if (distribution === '2' && totalPct > 100.01) {
      alert(`Invalid distribution: Total percentage (${totalPct}%) exceeds 100%.`);
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/po/${selectedPO}/items/${selectedItem}/account-assignments`, {
        method: "PUT",
        body: JSON.stringify({ assignments })
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: T.bg, minHeight: "100%", padding: 24, color: T.text, boxSizing: "border-box" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 900, color: T.amber }}>ACCOUNT ASSIGNMENT EDITOR</h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Purchase Order</label>
          <select 
            value={selectedPO || ""}
            onChange={e => setSelectedPO(+e.target.value)}
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, color: T.text, outline: "none" }}
          >
            <option value="">Select PO...</option>
            {pos.map(po => <option key={po.id} value={po.id}>{po.po_number}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Item Number</label>
          <select 
            value={selectedItem || ""}
            onChange={e => setSelectedItem(+e.target.value)}
            disabled={!selectedPO}
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, color: T.text, outline: "none", opacity: selectedPO ? 1 : 0.5 }}
          >
            {lines.map(l => <option key={l.item_no} value={l.item_no}>{l.item_no} — {l.short_text}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 14, color: T.amber }}>Assignments</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {[['1', 'By Qty'], ['2', 'By %']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setAssignments(prev => prev.map(a => ({ ...a, distribution: val })))}
                  style={{
                    background: distribution === val ? T.amber : T.surface2,
                    border: distribution === val ? "none" : `1px solid ${T.border}`,
                    color: distribution === val ? "#000" : T.text,
                    fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 4, cursor: "pointer"
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
          {distribution === '2' && (
            <div style={{ fontSize: 13, fontWeight: 700, color: totalPct > 100 ? T.red : (totalPct === 100 ? T.green : T.yellow) }}>
              Total Distribution: {totalPct.toFixed(1)}%
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading assignments...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Cat</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>G/L Account</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Cost Center</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>WBS Element</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>{distribution === '2' ? 'Percentage' : 'Quantity'}</th>
                <th style={{ padding: "8px 12px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: "8px 4px" }}>
                    <select 
                      value={a.acct_assgt_cat}
                      onChange={e => updateLine(i, { acct_assgt_cat: e.target.value })}
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: 6, borderRadius: 4, width: "100%" }}
                    >
                      <option value="K">K (Cost Center)</option>
                      <option value="C">C (Sales Order)</option>
                      <option value="F">F (Order)</option>
                      <option value="P">P (Project)</option>
                      <option value="N">N (Network)</option>
                      <option value="A">A (Asset)</option>
                    </select>
                  </td>
                  <td style={{ padding: "8px 4px" }}><input value={a.gl_account} onChange={e => updateLine(i, { gl_account: e.target.value })} placeholder="400000" style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: 6, borderRadius: 4, width: "100%" }} /></td>
                  <td style={{ padding: "8px 4px" }}><input value={a.cost_center} onChange={e => updateLine(i, { cost_center: e.target.value })} placeholder="1000" style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: 6, borderRadius: 4, width: "100%" }} /></td>
                  <td style={{ padding: "8px 4px" }}><input value={a.project_wbs} onChange={e => updateLine(i, { project_wbs: e.target.value })} placeholder="PRJ-001" style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: 6, borderRadius: 4, width: "100%" }} /></td>
                  <td style={{ padding: "8px 4px" }}>
                    <input 
                      type="number"
                      value={distribution === '2' ? a.percentage : a.quantity} 
                      onChange={e => updateLine(i, distribution === '2' ? { percentage: +e.target.value } : { quantity: +e.target.value })}
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: 6, borderRadius: 4, width: "80px", textAlign: "right" }} 
                    />
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "center" }}>
                    <button onClick={() => removeLine(i)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 16 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button 
            onClick={addLine}
            style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 16px", color: T.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
          >+ ADD ASSIGNMENT</button>
          <button 
            onClick={handleSave}
            disabled={saving || !selectedItem}
            style={{ background: T.amber, border: "none", borderRadius: 6, padding: "8px 24px", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: (saving || !selectedItem) ? 0.6 : 1 }}
          >{saving ? "SAVING..." : "SAVE ASSIGNMENTS"}</button>
          {saved && <span style={{ color: T.green, fontSize: 12, display: "flex", alignItems: "center" }}>✓ Saved successfully</span>}
        </div>
      </div>
      
      <div style={{ marginTop: 24, padding: 16, background: "rgba(245, 158, 11, 0.05)", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11, color: T.textMuted }}>
        <h4 style={{ margin: "0 0 8px", color: T.amber, fontSize: 10, textTransform: "uppercase" }}>Quick Help</h4>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          <li><strong>Distribution by Percentage:</strong> Sum of all lines must be exactly 100%.</li>
          <li><strong>Distribution by Quantity:</strong> Sum of all lines must equal the total PO item quantity.</li>
          <li><strong>G/L Account:</strong> Required for all lines if using cost centers.</li>
        </ul>
      </div>
    </div>
  );
};

export default POAccountAssignment;
