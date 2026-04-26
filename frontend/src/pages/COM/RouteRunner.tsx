import React, { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Shipment {
  id: number;
  shipment_number: string;
  deal_id: number;
  deal_number: string;
  customer_id: number;
  customer_name: string;
  status: string;
  carrier: string;
  tracking_number: string;
  dispatch_zone: string;
  scheduled_dispatch: string;
  actual_dispatch?: string;
  delivery_address: string;
  notes: string;
}

interface ShipmentLine {
  id: number;
  deal_line_no: number;
  material_id: number;
  material_code: string;
  material_name: string;
  description: string;
  planned_qty: number;
  packed_qty: number;
  unit_of_measure: string;
  hu_codes: string[];
  status: string;
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

function apiFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

const Badge = ({ label, status }: { label: string; status: string }) => {
  const colors: any = {
    PENDING:     "sx-badge--gray",
    PICKING:     "sx-badge--amber",
    PACKED:      "sx-badge--green",
    DISPATCHED:  "sx-badge--blue",
    DELIVERED:   "sx-badge--green",
    FAILED:      "sx-badge--red",
  };
  const colorClass = colors[status] || "sx-badge--gray";
  return (
    <span className={`sx-badge ${colorClass}`}>
      {label}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RouteRunnerPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [lines, setLines] = useState<ShipmentLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  
  // Assign HU Modal
  const [huModal, setHuModal] = useState<{ line_id: number, visible: boolean }>({ line_id: 0, visible: false });
  const [huCode, setHuCode] = useState("");
  const [huQty, setHuQty] = useState(0);

  const fetchShipments = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/shipments${activeTab !== "All" ? `?status=${activeTab.toUpperCase()}` : ""}`);
      const data = await res.json();
      setShipments(data.shipments || []);
    } catch (e) { console.error(e); }
  }, [activeTab]);

  const fetchShipmentDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/shipments/${id}`);
      const data = await res.json();
      setShipment(data.shipment);
      setLines(data.lines || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);
  useEffect(() => { if (selectedId) fetchShipmentDetail(selectedId); }, [selectedId, fetchShipmentDetail]);

  const handleAction = async (action: string, body?: any) => {
    if (!selectedId) return;
    try {
      const res = await apiFetch(`/api/shipments/${selectedId}/${action}`, {
        method: "POST",
        body: JSON.stringify(body || {})
      });
      if (res.ok) {
        fetchShipmentDetail(selectedId);
        fetchShipments();
      } else {
        const err = await res.json();
        console.error(err.error || "Action failed");
      }
    } catch (e) { console.error("Network error"); }
  };

  const assignHU = async () => {
    if (!selectedId || !huModal.line_id) return;
    try {
      const res = await apiFetch(`/api/shipments/${selectedId}/lines/${huModal.line_id}/assign-hu`, {
        method: "PUT",
        body: JSON.stringify({ hu_code: huCode, qty: huQty })
      });
      if (res.ok) {
        setHuModal({ line_id: 0, visible: false });
        setHuCode("");
        fetchShipmentDetail(selectedId);
      }
    } catch (e) { console.error("Assignment failed"); }
  };

  return (
    <div className="sx-split">
      {/* Sidebar */}
      <div className="sx-split-left" style={{ width: '300px', minWidth: '300px' }}>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 className="text-xl font-bold text-[var(--accent)] tracking-tight">RouteRunner</h2>
            <div className="text-sm text-[var(--text-3)] mt-0.5">Shipment and dispatch logistics</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["All", "Picking", "Packed", "Dispatched", "Delivered"].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t)}
                className={activeTab === t ? "sx-badge sx-badge--blue" : "sx-badge sx-badge--gray"}
                style={{ cursor: "pointer", border: "none" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          {shipments.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedId(s.id)}
              className={`sx-list-item ${selectedId === s.id ? 'sx-list-item--active' : ''}`}
              style={{ padding: "16px 24px", display: "block", borderBottom: "1px solid var(--border)", height: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{s.shipment_number}</span>
                <Badge label={s.status} status={s.status} />
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{s.customer_name}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>Ref: {s.deal_number} | Sch: {s.scheduled_dispatch}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="sx-split-right" style={{ display: "flex", flexDirection: "column" }}>
        {!selectedId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚚</div>
            <div className="text-xl font-bold text-[var(--accent)] tracking-tight">RouteRunner Logistics</div>
            <div className="text-sm text-[var(--text-3)] mt-1">Select a shipment to manage fulfillment and dispatch.</div>
          </div>
        ) : (
          <>
            {/* Status Workflow Bar */}
            <div style={{ padding: "16px 24px", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
               {["PICKING", "PACKED", "DISPATCHED", "DELIVERED"].map((step, idx) => (
                 <React.Fragment key={step}>
                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                     <div style={{ 
                       width: 24, height: 24, borderRadius: "50%", background: shipment?.status === step ? "var(--accent)" : "var(--bg-surface3)", 
                       border: `1px solid ${shipment?.status === step ? 'var(--accent)' : 'var(--border)'}`, display: "flex", alignItems: "center", justifyContent: "center",
                       fontSize: 10, fontWeight: 700, color: shipment?.status === step ? "var(--accent-text)" : "var(--text-3)"
                     }}>{idx + 1}</div>
                     <span style={{ fontSize: '11px', fontWeight: 700, color: shipment?.status === step ? "var(--accent)" : "var(--text-3)" }}>{step}</span>
                   </div>
                   <div className={`sx-workflow-step ${shipment?.status === step ? 'is-active' : ''}`}>
                     <div className="sx-workflow-num">{idx + 1}</div>
                     <span className="sx-workflow-label">{step}</span>
                   </div>
                   {idx < 3 && <div className="sx-workflow-line"></div>}
                 </React.Fragment>
               ))}
               <div style={{ flex: 1 }}></div>
               {shipment?.status === "PICKING" && <button onClick={() => handleAction("pack")} className="sx-btn sx-btn--primary">MARK AS PACKED</button>}
               {shipment?.status === "PACKED" && <button onClick={() => handleAction("dispatch")} className="sx-btn sx-btn--primary">DISPATCH SHIPMENT</button>}
               {shipment?.status === "DISPATCHED" && <button onClick={() => handleAction("confirm-delivery")} className="sx-btn sx-btn--primary" style={{ background: 'var(--green)', color: '#000' }}>CONFIRM DELIVERY</button>}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
                {/* Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="sx-card" style={{ padding: '20px' }}>
                       <div className="sx-label" style={{ marginBottom: '16px' }}>Shipment Info</div>
                       <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                         <div style={{ fontSize: '13px' }}><span style={{ color: "var(--text-3)", fontWeight: 600 }}>Number:</span> <span className="sx-mono">{shipment?.shipment_number}</span></div>
                         <div style={{ fontSize: '13px' }}><span style={{ color: "var(--text-3)", fontWeight: 600 }}>Deal:</span> <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{shipment?.deal_number}</span></div>
                         <div style={{ fontSize: '13px' }}><span style={{ color: "var(--text-3)", fontWeight: 600 }}>Customer:</span> <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{shipment?.customer_name}</span></div>
                         <div style={{ fontSize: '13px' }}><span style={{ color: "var(--text-3)", fontWeight: 600 }}>Carrier:</span> <span style={{ color: 'var(--text-2)' }}>{shipment?.carrier || "—"}</span></div>
                         <div style={{ fontSize: '13px' }}><span style={{ color: "var(--text-3)", fontWeight: 600 }}>Tracking:</span> <span className="sx-mono">{shipment?.tracking_number || "—"}</span></div>
                       </div>
                    </div>
                    <div className="sx-card" style={{ padding: '20px' }}>
                       <div className="sx-label" style={{ marginBottom: '16px' }}>Delivery Address</div>
                       <div style={{ whiteSpace: "pre-line", color: "var(--text-2)", fontSize: '13px', lineHeight: 1.5 }}>{shipment?.delivery_address}</div>
                    </div>
                </div>

                {/* Pick List */}
                <div className="sx-card">
                  <div className="sx-card-head">
                    <span className="sx-card-title">Pick List & Fulfillment</span>
                  </div>
                  <table className="sx-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th style={{ textAlign: "right" }}>Planned</th>
                        <th style={{ textAlign: "right" }}>Packed</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(l => (
                        <tr key={l.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{l.material_name}</div>
                            <div className="sx-mono">{l.material_code}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                               {l.hu_codes?.map(hu => <span key={hu} className="sx-mono" style={{ background: "var(--bg-surface3)", padding: "2px 6px", borderRadius: "4px", fontSize: '10px' }}>{hu}</span>)}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>{l.planned_qty} {l.unit_of_measure}</td>
                          <td style={{ textAlign: "right", color: l.packed_qty >= l.planned_qty ? "var(--green)" : "var(--amber)" }}>{l.packed_qty}</td>
                          <td style={{ textAlign: "center" }}>
                            <Badge label={l.status} status={l.status} />
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {shipment?.status === "PICKING" && l.status !== "PACKED" && (
                              <button 
                                onClick={() => { setHuModal({ line_id: l.id, visible: true }); setHuQty(l.planned_qty - l.packed_qty); }}
                                className="sx-btn sx-btn--ghost sx-btn--sm"
                              >
                                ASSIGN HU
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Assign HU Modal */}
      {huModal.visible && (
        <div className="sx-modal-overlay">
          <div className="sx-modal" style={{ width: 400 }}>
            <h3 className="sx-modal-title">Assign Stock to Line</h3>
            <div className="sx-modal-sub">Scan handling unit barcode and specify quantity</div>
            <div className="sx-form-grid">
              <div className="sx-field sx-field--full">
                <label className="sx-label">HU BARCODE</label>
                <input  style={{ background:'var(--bg-input)', color:'var(--text-1)', border:'1px solid var(--border-hi)', borderRadius:'6px', padding:'0 10px', height:'36px', width:'100%', fontFamily:'var(--font-sans)', fontSize:'13px', outline:'none' }} 
                  autoFocus 
                  type="text" 
                  value={huCode} 
                  onChange={e => setHuCode(e.target.value)} 
                  placeholder="Scan HU..."
                  className="sx-input"
                />
              </div>
              <div className="sx-field sx-field--full">
                <label className="sx-label">PICK QUANTITY</label>
                <input  style={{ background:'var(--bg-input)', color:'var(--text-1)', border:'1px solid var(--border-hi)', borderRadius:'6px', padding:'0 10px', height:'36px', width:'100%', fontFamily:'var(--font-sans)', fontSize:'13px', outline:'none' }} 
                  type="number" 
                  value={huQty} 
                  onChange={e => setHuQty(parseFloat(e.target.value))} 
                  className="sx-input"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="sx-btn" onClick={() => setHuModal({ line_id: 0, visible: false })}>Cancel</button>
              <button className="sx-btn sx-btn--primary" onClick={assignHU}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
