import { useState, useEffect, useCallback } from "react";
import { SectionTabs } from '@/components/ui/SectionTabs';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardBody } from '@/components/ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuildOrder {
  id: number;
  order_number: string;
  output_material_id?: number;
  output_description?: string;
  planned_qty: number;
  actual_qty: number;
  unit_of_measure: string;
  planned_start?: string;
  planned_finish?: string;
  actual_start?: string;
  actual_finish?: string;
  status: string;
  priority: string;
  production_zone?: string;
  output_zone?: string;
  notes?: string;
  created_at: string;
  output_material_name?: string;
  output_material_code?: string;
}

interface Component {
  id: number;
  sequence: number;
  material_id?: number;
  description: string;
  required_qty: number;
  issued_qty: number;
  unit_of_measure: string;
  issue_status: string;
  material_name?: string;
  material_code?: string;
}

interface MaterialStatus {
  components: {
    sequence: number;
    material: string;
    required: number;
    issued: number;
    outstanding: number;
    status: string;
  }[];
  all_issued: boolean;
  ready_to_produce: boolean;
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

function Badge({ label, status }: { label: string; status: string }) {
  const colors: Record<string, string> = {
    DRAFT:       "sx-badge--gray",
    RELEASED:    "sx-badge--blue",
    IN_PROGRESS: "sx-badge--amber",
    COMPLETED:   "sx-badge--green",
    CANCELLED:   "sx-badge--red",
    HIGH:        "sx-badge--red",
    NORMAL:      "sx-badge--gray",
    LOW:         "sx-badge--blue",
  };
  const colorClass = colors[status] ?? "sx-badge--gray";
  return (
    <span className={`sx-badge ${colorClass}`}>
      {label}
    </span>
  );
}

function Fld({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${span}` }} className="sx-field">
      <div className="sx-label">{label}</div>
      <div style={{ fontSize: '13px', color: "var(--text-1)", fontWeight: 500 }}>{children}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BuildOrderPage() {
  const [orders, setOrders] = useState<BuildOrder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [order, setOrder] = useState<BuildOrder | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [materialStatus, setMaterialStatus] = useState<MaterialStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [showCreate, setShowCreate] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiFetch("/api/build-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.build_orders || []);
      }
    } catch (e) { console.error("fetchOrders failed", e); }
  }, []);

  const fetchOrderDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/build-orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.build_order);
        setComponents(data.components || []);
      }
      
      const sRes = await apiFetch(`/api/build-orders/${id}/material-status`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setMaterialStatus(sData);
      }
    } catch (e) { console.error("fetchOrderDetail failed", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { 
    if (selectedId) {
        fetchOrderDetail(selectedId);
        if (activeTab === 'Dashboard') setActiveTab('Overview');
    }
  }, [selectedId, fetchOrderDetail]);

  const handleAction = async (action: string, body?: any) => {
    if (!selectedId) return;
    try {
      const res = await apiFetch(`/api/build-orders/${selectedId}/${action}`, {
        method: "POST",
        body: JSON.stringify(body || {})
      });
      if (res.ok) {
        fetchOrderDetail(selectedId);
        fetchOrders();
      } else {
        const err = await res.json();
        console.error(err.error || "Action failed");
      }
    } catch (e) { console.error("Network error"); }
  };

  return (
    <div className="sx-split">
      {/* Left Sidebar: List */}
      <div className="sx-split-left">
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 className="text-xl font-bold text-[var(--accent)] tracking-tight">Build Orders</h2>
              <p className="text-sm text-[var(--text-3)] mt-0.5">Manufacturing execution</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="sx-btn sx-btn--primary">+ NEW</button>
          </div>
          
          <div className="mt-2">
            <SectionTabs
              tabs={[
                { key: 'Dashboard', label: 'Dashboard' },
                { key: 'List', label: 'All Orders' }
              ]}
              active={selectedId ? 'List' : activeTab}
              onChange={(k) => {
                if (k === 'Dashboard') {
                    setSelectedId(null);
                    setActiveTab('Dashboard');
                } else {
                    setActiveTab('List');
                }
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {orders.map(bo => (
            <div 
              key={bo.id} 
              onClick={() => setSelectedId(bo.id)}
              className={`sx-list-item ${selectedId === bo.id ? 'sx-list-item--active' : ''}`}
              style={{ padding: "16px 24px", display: "block", borderBottom: "1px solid var(--border)", height: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{bo.order_number}</span>
                <Badge label={bo.status} status={bo.status} />
              </div>
              <div style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 600 }}>{bo.output_material_name || bo.output_description}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span>Qty: {bo.planned_qty} {bo.unit_of_measure}</span>
                <span>{bo.planned_start ? new Date(bo.planned_start).toLocaleDateString() : ""}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content: Detail */}
      <div className="sx-split-right" style={{ display: "flex", flexDirection: "column" }}>
        {!selectedId ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
            {activeTab === "Dashboard" ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-4 gap-4">
                  <KpiCard label="TOTAL ORDERS" value={orders.length} />
                  <KpiCard label="RELEASED" value={orders.filter(o => o.status === 'RELEASED').length} />
                  <KpiCard label="IN PROGRESS" value={orders.filter(o => o.status === 'IN_PROGRESS').length} deltaDir="up" />
                  <KpiCard label="COMPLETED" value={orders.filter(o => o.status === 'COMPLETED').length} />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <div className="p-4 border-b border-[var(--border)] font-bold text-xs uppercase tracking-widest text-[var(--text-3)]">Recent Activity</div>
                    <CardBody>
                      <div className="space-y-3">
                        {orders.slice(0, 5).map(o => (
                          <div key={o.id} className="flex justify-between items-center text-xs">
                            <span className="font-mono text-[var(--accent)]">{o.order_number}</span>
                            <span className="text-[var(--text-2)]">{o.output_material_name}</span>
                            <Badge label={o.status} status={o.status} />
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                  <Card>
                    <div className="p-4 border-b border-[var(--border)] font-bold text-xs uppercase tracking-widest text-[var(--text-3)]">Priority Queue</div>
                    <CardBody>
                       <div className="space-y-3">
                        {orders.filter(o => o.priority === 'HIGH').slice(0, 5).map(o => (
                          <div key={o.id} className="flex justify-between items-center text-xs">
                            <span className="font-mono text-[var(--accent)]">{o.order_number}</span>
                            <Badge label="HIGH" status="HIGH" />
                            <span className="text-[var(--text-3)]">{o.planned_start ? new Date(o.planned_start).toLocaleDateString() : '—'}</span>
                          </div>
                        ))}
                        {orders.filter(o => o.priority === 'HIGH').length === 0 && <div className="text-[var(--text-4)] italic">No high priority orders</div>}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
                    <div className="sx-page-title">Select a build order to view details</div>
                </div>
            )}
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>Loading…</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "32px 40px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 className="sx-page-title" style={{ fontSize: '24px' }}>{order?.order_number}</h1>
                  <div style={{ color: "var(--text-2)", fontSize: '14px', marginTop: '4px' }}>{order?.output_material_name} <span className="sx-mono">({order?.output_material_code})</span></div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {order?.status === "DRAFT" && <button onClick={() => handleAction("release")} className="sx-btn sx-btn--primary">RELEASE ORDER</button>}
                  {(order?.status === "DRAFT" || order?.status === "RELEASED") && <button onClick={() => handleAction("cancel")} className="sx-btn" style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}>CANCEL</button>}
                </div>
              </div>

              <SectionTabs
                tabs={[
                  { key: 'Overview', label: 'Overview' },
                  { key: 'Components', label: 'Components' },
                  { key: 'Material Issue', label: 'Material Issue' },
                  { key: 'Production', label: 'Production' },
                ]}
                active={activeTab === 'Dashboard' ? 'Overview' : activeTab}
                onChange={setActiveTab}
              />
            </div>

            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
              {activeTab === "Overview" && (
                <div className="sx-card sx-form-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", padding: '24px' }}>
                  <Fld label="Status"><Badge label={order?.status || ""} status={order?.status || ""} /></Fld>
                  <Fld label="Priority"><Badge label={order?.priority || ""} status={order?.priority || ""} /></Fld>
                  <Fld label="Planned Qty">{order?.planned_qty} {order?.unit_of_measure}</Fld>
                  <Fld label="Actual Qty">{order?.actual_qty} {order?.unit_of_measure}</Fld>
                  
                  <Fld label="Production Zone"><span className="sx-mono">{order?.production_zone || "—"}</span></Fld>
                  <Fld label="Output Zone"><span className="sx-mono">{order?.output_zone || "—"}</span></Fld>
                  <Fld label="Planned Start">{order?.planned_start ? new Date(order?.planned_start).toLocaleString() : "—"}</Fld>
                  <Fld label="Planned Finish">{order?.planned_finish ? new Date(order?.planned_finish).toLocaleString() : "—"}</Fld>

                  <Fld label="Actual Start">{order?.actual_start ? new Date(order?.actual_start).toLocaleString() : "—"}</Fld>
                  <Fld label="Actual Finish">{order?.actual_finish ? new Date(order?.actual_finish).toLocaleString() : "—"}</Fld>
                  <Fld label="Notes" span={2}>{order?.notes || "—"}</Fld>
                </div>
              )}

              {activeTab === "Components" && (
                <div className="sx-card">
                  <table className="sx-table">
                    <thead>
                      <tr>
                        <th>Seq</th>
                        <th>Material</th>
                        <th style={{ textAlign: "right" }}>Required</th>
                        <th style={{ textAlign: "right" }}>Issued</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map(c => (
                        <tr key={c.id}>
                          <td>{c.sequence}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{c.material_name}</div>
                            <div className="sx-mono">{c.material_code}</div>
                          </td>
                          <td style={{ textAlign: "right" }}>{c.required_qty} {c.unit_of_measure}</td>
                          <td style={{ textAlign: "right" }}>{c.issued_qty} {c.unit_of_measure}</td>
                          <td style={{ textAlign: "center" }}><Badge label={c.issue_status} status={c.issue_status === 'ISSUED' ? 'COMPLETED' : c.issue_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "Material Issue" && (
                <div>
                  <div className="sx-card" style={{ marginBottom: 24, padding: "20px 24px" }}>
                    <div className="sx-label" style={{ marginBottom: '16px' }}>Ready for Production?</div>
                    <div style={{ display: "flex", gap: 32 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: materialStatus?.ready_to_produce ? "var(--green)" : "var(--red)" }}></span>
                        <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>{materialStatus?.ready_to_produce ? "Material partially issued" : "No material issued"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: materialStatus?.all_issued ? "var(--green)" : "var(--amber)" }}></span>
                        <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>{materialStatus?.all_issued ? "Fully staged" : "Awaiting staging"}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div className="sx-card" style={{ padding: '24px' }}>
                      <div className="sx-label" style={{ marginBottom: '20px', color: 'var(--accent)' }}>Scan HU to Issue</div>
                      <div className="sx-form-grid sx-form-grid--1">
                        <div className="sx-field">
                          <label className="sx-label">HU Code</label>
                          <input type="text" placeholder="Scan Barcode..." className="sx-input" />
                        </div>
                        <div className="sx-field">
                          <label className="sx-label">Quantity</label>
                          <input type="number" defaultValue={1} className="sx-input" />
                        </div>
                        <button className="sx-btn sx-btn--primary" style={{ marginTop: 8, justifyContent: "center" }}>POST MATERIAL ISSUE</button>
                      </div>
                    </div>
                    <div className="sx-card" style={{ padding: '24px' }}>
                      <div className="sx-label" style={{ marginBottom: '16px' }}>Outstanding Requirements</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {(materialStatus?.components || []).filter(c => c.outstanding > 0).map(c => (
                          <div key={c.sequence} style={{ paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{c.material}</span>
                            <span style={{ color: "var(--amber)", fontWeight: 600 }}>{c.outstanding} missing</span>
                          </div>
                        ))}
                        {materialStatus?.components.filter(c => c.outstanding > 0).length === 0 && <div style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>All materials staged.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Production" && (
                <div style={{ maxWidth: 500 }}>
                  <div className="sx-card" style={{ padding: '24px' }}>
                    <div className="sx-label" style={{ marginBottom: '24px', color: 'var(--accent)', fontSize: '14px' }}>Confirm Finished Goods</div>
                    <div className="sx-form-grid sx-form-grid--1">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="sx-field">
                          <label className="sx-label">Completed Qty</label>
                          <input type="number" defaultValue={order?.planned_qty} className="sx-input" />
                        </div>
                        <div className="sx-field">
                          <label className="sx-label">Unit</label>
                          <div style={{ height: '36px', display: 'flex', alignItems: 'center', padding: "0 10px", fontSize: 13, color: "var(--text-1)", background: "var(--bg-surface3)", borderRadius: "var(--r-md)", border: "1px solid var(--border-hi)" }}>
                            {order?.unit_of_measure}
                          </div>
                        </div>
                      </div>
                      <div className="sx-field">
                        <label className="sx-label">New HU Code</label>
                        <input type="text" placeholder="Auto-generate or Scan..." className="sx-input" />
                      </div>
                      <div className="sx-field">
                        <label className="sx-label">Target Storage Zone</label>
                        <input type="text" defaultValue={order?.output_zone || ""} className="sx-input" />
                      </div>
                      <div className="sx-field">
                        <label className="sx-label">Production Notes</label>
                        <textarea className="sx-textarea" />
                      </div>
                      <button 
                        onClick={() => handleAction("confirm-output", { confirmed_qty: order?.planned_qty, output_hu_code: "AUTO", output_zone: order?.output_zone })}
                        className="sx-btn sx-btn--primary"
                        style={{ background: 'var(--green)', color: '#000', justifyContent: "center", marginTop: 12, height: '40px' }}
                      >
                        CONFIRM PRODUCTION COMPLETION
                      </button>
                      <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", margin: "12px 0 0" }}>This will trigger an automatic Quality Gate (QC) check record.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="sx-modal-overlay">
          <div className="sx-modal" style={{ width: 400 }}>
             <h3 className="sx-modal-title">New Build Order</h3>
             <div className="sx-modal-sub">Create a new manufacturing instruction</div>
             <div className="sx-form-grid">
                <div className="sx-field sx-field--full">
                  <label className="sx-label">Output Product ID</label>
                  <input type="number" className="sx-input" />
                </div>
                <div className="sx-field sx-field--full">
                  <label className="sx-label">Description</label>
                  <input type="text" className="sx-input" />
                </div>
                <div className="sx-field sx-field--full">
                  <label className="sx-label">Planned Quantity</label>
                  <input type="number" className="sx-input" />
                </div>
             </div>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button className="sx-btn" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="sx-btn sx-btn--primary">Create</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
