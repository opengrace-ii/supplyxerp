// ─────────────────────────────────────────────────────────────────────────────
// POBlockCancel.tsx — PO Block/Cancel Management Cockpit
// Phase 2 implementation matches SupplyXERP dark theme (amber/brown palette)
// Handles cross-PO line item blocking, unblocking, and soft deletion.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";

// ─── Constants & Types ────────────────────────────────────────────────────────

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

interface POLine {
  po_id: number;
  po_number: string;
  item_no: number;
  material_name?: string;
  short_text?: string;
  quantity: number;
  unit?: string;
  blocked: boolean;
  block_reason_code?: string;
  blocked_by?: string;
  blocked_at?: string;
  deleted: boolean;
}

interface BlockReason {
  code: string;
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
}

// ─── Components ────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color = T.amber }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "16px 20px", flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

const POBlockCancel: React.FC = () => {
  const { setModule } = useAppStore();
  const [lines, setLines] = useState<POLine[]>([]);
  const [reasons, setReasons] = useState<BlockReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'BLOCKED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load reasons
      const resR = await apiFetch("/api/po/block-reasons");
      if (resR.ok) {
        const dataR = await resR.json();
        setReasons(dataR.block_reasons || []);
      }

      // 2. Load all POs
      const resPO = await apiFetch("/api/purchase-orders?limit=200");
      if (!resPO.ok) throw new Error("Failed to load purchase orders");
      const dataPO = await resPO.json();
      const pos = dataPO.purchase_orders || [];

      // 3. Load lines for each PO in parallel (chunks of 10)
      const allLines: POLine[] = [];
      const chunkSize = 10;
      for (let i = 0; i < pos.length; i += chunkSize) {
        const chunk = pos.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(async (po: any) => {
            const resL = await apiFetch(`/api/purchase-orders/${po.id}`);
            if (resL.ok) {
              const dataL = await resL.json();
              return (dataL.lines || []).map((l: any) => ({
                ...l,
                po_id: po.id,
                po_number: po.po_number
              }));
            }
            return [];
          })
        );
        allLines.push(...results.flat());
      }
      setLines(allLines);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUnblock = async (line: POLine) => {
    try {
      const res = await apiFetch(`/api/po/${line.po_id}/items/${line.item_no}/unblock`, { method: "POST" });
      if (!res.ok) throw new Error("Unblock failed");
      // Refresh local state for this PO
      const resL = await apiFetch(`/api/purchase-orders/${line.po_id}`);
      if (resL.ok) {
        const dataL = await resL.json();
        const newLines = (dataL.lines || []).map((l: any) => ({ ...l, po_id: line.po_id, po_number: line.po_number }));
        setLines(prev => {
          const filtered = prev.filter(p => p.po_id !== line.po_id);
          return [...filtered, ...newLines];
        });
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (line: POLine) => {
    try {
      const res = await apiFetch(`/api/po/${line.po_id}/items/${line.item_no}`, { method: "DELETE" });
      if (res.status === 409) {
        const data = await res.json();
        alert(`Cannot delete — goods receipt of ${data.gr_qty} items already posted against this line.`);
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      
      // Update local state
      setLines(prev => prev.map(p => 
        (p.po_id === line.po_id && p.item_no === line.item_no) 
        ? { ...p, deleted: true } 
        : p
      ));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredLines = useMemo(() => {
    return lines.filter(l => {
      const matchesSearch = l.po_number.toLowerCase().includes(search.toLowerCase()) || 
                            (l.short_text || "").toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'BLOCKED') return l.blocked && !l.deleted;
      if (filter === 'CANCELLED') return l.deleted;
      return true;
    });
  }, [lines, filter, search]);

  const stats = {
    totalBlocked: lines.filter(l => l.blocked && !l.deleted).length,
    cancelled: lines.filter(l => l.deleted).length,
    totalLines: lines.length
  };

  if (loading && lines.length === 0) {
    return <div style={{ color: T.amber, padding: 40, background: T.bg, height: "100%" }}>Loading blocking cockpit...</div>;
  }

  return (
    <div style={{ background: T.bg, minHeight: "100%", padding: 24, color: T.text, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.amber, letterSpacing: "-0.02em" }}>PO BLOCK MANAGEMENT</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <input 
            type="text" 
            placeholder="Search by PO or Material..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6,
              padding: "8px 16px", color: T.text, fontSize: 13, width: 260, outline: "none"
            }}
          />
          <button 
            onClick={loadData}
            style={{
              background: T.amber, border: "none", borderRadius: 6, padding: "8px 16px",
              color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}
          >REFRESH</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <SummaryCard label="Total Blocked Items" value={stats.totalBlocked} color={T.yellow} />
        <SummaryCard label="Cancelled Items" value={stats.cancelled} color={T.red} />
        <SummaryCard label="Total Items Under Review" value={lines.filter(l => l.blocked || l.deleted).length} color={T.amber} />
        <SummaryCard label="Active Items" value={stats.totalLines - stats.cancelled} color={T.green} />
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: "rgba(0,0,0,0.2)" }}>
          {(['ALL', 'BLOCKED', 'CANCELLED'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "14px 24px", background: "none", border: "none",
                color: filter === f ? T.amber : T.textMuted, fontWeight: filter === f ? 700 : 500,
                fontSize: 12, cursor: "pointer", borderBottom: filter === f ? `2px solid ${T.amber}` : "2px solid transparent"
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${T.border}` }}>
                {["PO Number", "Item", "Material", "Short Text", "Qty", "Reason", "Blocked By", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: T.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: "center", color: T.textMuted }}>No items found matching the filter.</td>
                </tr>
              )}
              {filteredLines.map(l => (
                <tr key={`${l.po_id}-${l.item_no}`} style={{ borderBottom: `1px solid ${T.border}`, background: l.deleted ? "rgba(239, 68, 68, 0.05)" : "none" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: T.amber }}>{l.po_number}</td>
                  <td style={{ padding: "12px 16px" }}>{l.item_no}</td>
                  <td style={{ padding: "12px 16px" }}>{l.material_name || "—"}</td>
                  <td style={{ padding: "12px 16px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.short_text}</td>
                  <td style={{ padding: "12px 16px" }}>{l.quantity} {l.unit}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {l.deleted ? (
                      <span style={{ color: T.red, fontWeight: 700 }}>CANCELLED</span>
                    ) : l.blocked ? (
                      <span style={{ color: T.yellow }}>
                        {reasons.find(r => r.code === l.block_reason_code)?.description || l.block_reason_code}
                      </span>
                    ) : (
                      <span style={{ color: T.green }}>ACTIVE</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: T.textMuted }}>{l.blocked_by || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {l.blocked && !l.deleted && (
                        <button 
                          onClick={() => handleUnblock(l)}
                          style={{ background: T.green, border: "none", color: "#000", fontWeight: 700, fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}
                        >UNBLOCK</button>
                      )}
                      {!l.deleted && (
                        <button 
                          onClick={() => handleDelete(l)}
                          style={{ background: T.red, border: "none", color: "#fff", fontWeight: 700, fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}
                        >DELETE</button>
                      )}
                      <button 
                         onClick={() => setModule('POManagement')}
                         style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}
                      >VIEW PO</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {error && <div style={{ marginTop: 16, color: T.red, fontSize: 12 }}>Error: {error}</div>}
    </div>
  );
};

export default POBlockCancel;
