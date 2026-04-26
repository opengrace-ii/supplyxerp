import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Shipment {
  id: number;
  public_id: string;
  shipment_number: string;
  sales_order_id: number | null;
  so_number: string | null;
  customer_name: string | null;
  status: string;
  carrier_id: number | null;
  carrier_name: string | null;
  carrier_mode: string | null;
  tracking_ref: string | null;
  planned_date: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  ship_to_address: string | null;
  ship_to_city: string | null;
  ship_to_country: string;
  notes: string | null;
}

interface ShipmentLine {
  id: number;
  sales_order_line_id: number | null;
  material_id: number | null;
  material_code: string | null;
  material_name: string | null;
  description: string;
  quantity: string; // numeric comes as string from pg
  unit_of_measure: string;
  line_number: number;
}

interface Carrier {
  id: number;
  name: string;
  code: string;
  mode: string;
}

interface Dashboard {
  total_shipments: number;
  pending: number;
  in_progress: number;
  dispatched: number;
  in_transit: number;
  delivered: number;
  overdue: number;
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

const Badge = ({ label, status }: { label: string; status: string }) => {
  const colors: Record<string, string> = {
    PENDING:     "sx-badge--gray",
    PICKING:     "sx-badge--blue",
    PACKED:      "sx-badge--blue",
    DISPATCHED:  "sx-badge--amber",
    IN_TRANSIT:  "sx-badge--amber",
    DELIVERED:   "sx-badge--green",
    CANCELLED:   "sx-badge--red",
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
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [lines, setLines] = useState<ShipmentLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  
  // Modals
  const [assignModal, setAssignModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<number>(0);
  const [trackingRef, setTrackingRef] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, shipRes, carrRes] = await Promise.all([
        api.getRouteRunnerDashboard(),
        api.listShipments(activeTab !== "All" ? { status: activeTab.toUpperCase() } : {}),
        api.listCarriers()
      ]);
      setDashboard(dashRes.data);
      setShipments(shipRes.data || []);
      setCarriers(carrRes.data || []);
    } catch (e) { console.error(e); }
  }, [activeTab]);

  const fetchShipmentDetail = useCallback(async (publicId: string) => {
    setLoading(true);
    try {
      const res = await api.getShipment(publicId);
      setShipment(res.data);
      setLines(res.lines || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (selectedId) fetchShipmentDetail(selectedId); }, [selectedId, fetchShipmentDetail]);

  const handleAction = async (action: string) => {
    if (!selectedId) return;
    try {
      let res;
      if (action === "dispatch") res = await api.dispatchShipment(selectedId);
      else if (action === "deliver") res = await api.markShipmentDelivered(selectedId);
      
      if (res?.data) {
        fetchShipmentDetail(selectedId);
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const handleAssignCarrier = async () => {
    if (!selectedId || !selectedCarrier) return;
    try {
      const res = await api.assignCarrier(selectedId, {
        carrier_id: selectedCarrier,
        tracking_ref: trackingRef
      });
      if (res.data) {
        setAssignModal(false);
        fetchShipmentDetail(selectedId);
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="sx-split">
      {/* Sidebar */}
      <div className="sx-split-left" style={{ width: '300px', minWidth: '300px' }}>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 className="text-2xl font-bold text-[var(--accent)] tracking-tight">RouteRunner</h2>
            <div className="text-sm text-[var(--text-3)] mt-1">Outbound Logistics & Dispatch</div>
          </div>

          {/* Dashboard Mini Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="sx-card" style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>{dashboard?.pending || 0}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Pending</div>
            </div>
            <div className="sx-card" style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--amber)' }}>{dashboard?.dispatched || 0}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>In Transit</div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["All", "Pending", "Picking", "Packed", "Dispatched", "Delivered"].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t)}
                className={activeTab === t ? "sx-badge sx-badge--blue" : "sx-badge sx-badge--gray"}
                style={{ cursor: "pointer", border: "none", outline: 'none' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {shipments.map(s => (
            <div 
              key={s.public_id} 
              onClick={() => setSelectedId(s.public_id)}
              className={`sx-list-item ${selectedId === s.public_id ? 'sx-list-item--active' : ''}`}
              style={{ padding: "16px 24px", cursor: 'pointer', borderBottom: "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 800, color: "var(--accent)", fontSize: '13px' }}>{s.shipment_number}</span>
                <Badge label={s.status} status={s.status} />
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{s.customer_name}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>SO: {s.so_number || 'Manual'} | Sch: {s.planned_date || 'No Date'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="sx-split-right" style={{ display: "flex", flexDirection: "column" }}>
        {!selectedId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚛</div>
            <div className="text-2xl font-bold text-[var(--accent)] tracking-tight">RouteRunner Operations</div>
            <div className="text-sm text-[var(--text-3)] mt-2 max-w-md text-center">Select a shipment from the list to assign carriers, manage dispatch events, and confirm final delivery.</div>
          </div>
        ) : (
          <>
            {/* Header / Actions */}
            <div style={{ padding: "20px 32px", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--accent-faded)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)' }}>{shipment?.shipment_number}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{shipment?.customer_name}</div>
                  </div>
               </div>
               
               <div style={{ display: 'flex', gap: 12 }}>
                 {shipment?.status === "PENDING" && (
                   <button onClick={() => setAssignModal(true)} className="sx-btn sx-btn--secondary">ASSIGN CARRIER</button>
                 )}
                 {shipment?.status === "PENDING" && shipment.carrier_id && (
                   <button onClick={() => handleAction("dispatch")} className="sx-btn sx-btn--primary">DISPATCH</button>
                 )}
                 {shipment?.status === "DISPATCHED" && (
                   <button onClick={() => handleAction("deliver")} className="sx-btn sx-btn--primary" style={{ background: 'var(--green)', color: '#000' }}>MARK DELIVERED</button>
                 )}
               </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32 }}>
                
                {/* Information Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="sx-card" style={{ padding: '24px' }}>
                       <div className="sx-label" style={{ marginBottom: '20px', fontSize: '11px', letterSpacing: '0.05em' }}>LOGISTICS PROFILE</div>
                       <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: "var(--text-3)", fontSize: '12px' }}>Sales Order</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '12px' }}>{shipment?.so_number || "None"}</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: "var(--text-3)", fontSize: '12px' }}>Carrier</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '12px' }}>{shipment?.carrier_name || "Unassigned"}</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: "var(--text-3)", fontSize: '12px' }}>Tracking Ref</span>
                            <span className="sx-mono" style={{ fontSize: '12px' }}>{shipment?.tracking_ref || "—"}</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: "var(--text-3)", fontSize: '12px' }}>Planned Date</span>
                            <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{shipment?.planned_date || "—"}</span>
                         </div>
                       </div>
                    </div>

                    <div className="sx-card" style={{ padding: '24px' }}>
                       <div className="sx-label" style={{ marginBottom: '20px', fontSize: '11px' }}>DELIVERY DESTINATION</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                         <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: '14px' }}>{shipment?.customer_name}</div>
                         <div style={{ whiteSpace: "pre-line", color: "var(--text-3)", fontSize: '13px', lineHeight: 1.6 }}>
                           {shipment?.ship_to_address}<br/>
                           {shipment?.ship_to_city}, {shipment?.ship_to_country}
                         </div>
                       </div>
                    </div>

                    {shipment?.notes && (
                      <div className="sx-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent)' }}>
                        <div className="sx-label" style={{ marginBottom: '12px', fontSize: '11px' }}>DISPATCHER NOTES</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-2)', fontStyle: 'italic' }}>"{shipment.notes}"</div>
                      </div>
                    )}
                </div>

                {/* Items Table */}
                <div className="sx-card" style={{ overflow: 'hidden' }}>
                  <div className="sx-card-head" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="sx-card-title">Manifest Items</span>
                  </div>
                  <table className="sx-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Material / Description</th>
                        <th style={{ textAlign: "right" }}>Quantity</th>
                        <th style={{ textAlign: "right" }}>UoM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(l => (
                        <tr key={l.id}>
                          <td style={{ color: 'var(--text-3)', fontSize: '11px' }}>{l.line_number}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: "var(--text-1)", fontSize: '13px' }}>{l.material_name || l.description}</div>
                            <div className="sx-mono" style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 2 }}>{l.material_code || "NON-STOCK"}</div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: 'var(--accent)' }}>{parseFloat(l.quantity).toLocaleString()}</td>
                          <td style={{ textAlign: "right", color: 'var(--text-3)', fontSize: '12px' }}>{l.unit_of_measure}</td>
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

      {/* Assign Carrier Modal */}
      {assignModal && (
        <div className="sx-modal-overlay">
          <div className="sx-modal" style={{ width: 450 }}>
            <h3 className="sx-modal-title">Assign Logistics Carrier</h3>
            <p className="sx-modal-sub">Select a verified carrier and provide tracking references.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
              <div className="sx-field">
                <label className="sx-label">CARRIER</label>
                <select 
                  className="sx-input" 
                  value={selectedCarrier} 
                  onChange={e => setSelectedCarrier(parseInt(e.target.value))}
                  style={{ width: '100%', height: '40px' }}
                >
                  <option value={0}>Select Carrier...</option>
                  {carriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.mode})</option>
                  ))}
                </select>
              </div>

              <div className="sx-field">
                <label className="sx-label">TRACKING REFERENCE</label>
                <input 
                  type="text" 
                  className="sx-input" 
                  value={trackingRef} 
                  onChange={e => setTrackingRef(e.target.value)}
                  placeholder="e.g. DHL-12345678"
                  style={{ width: '100%', height: '40px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button className="sx-btn" onClick={() => setAssignModal(false)}>CANCEL</button>
              <button className="sx-btn sx-btn--primary" onClick={handleAssignCarrier} disabled={!selectedCarrier}>CONFIRM ASSIGNMENT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
