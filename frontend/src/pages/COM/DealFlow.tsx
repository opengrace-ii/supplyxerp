import React, { useState, useEffect, useCallback } from "react";
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardBody } from '@/components/ui/Card';
import { SectionTabs } from '@/components/ui/SectionTabs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: number;
  public_id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  currency: string;
}

interface Deal {
  id: number;
  public_id: string;
  so_number: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  customer_email?: string;
  order_date: string;
  requested_date: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
}

interface DealLine {
  id: number;
  public_id: string;
  line_number: number;
  material_id: number | null;
  material_code: string;
  material_name: string;
  description: string;
  quantity: number;
  delivered_qty: number;
  unit_of_measure: string;
  unit_price: number;
  discount_pct: number;
  line_total: number;
  status: string;
}

interface DashboardStats {
  total_orders: number;
  draft: number;
  confirmed: number;
  dispatched: number;
  delivered: number;
  cancelled: number;
  total_revenue: number;
  pending_value: number;
  avg_order_value: number;
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
    DRAFT:       "sx-badge--gray",
    CONFIRMED:   "sx-badge--blue",
    PICKING:     "sx-badge--amber",
    PACKED:      "sx-badge--amber",
    DISPATCHED:  "sx-badge--green",
    DELIVERED:   "sx-badge--green",
    CANCELLED:   "sx-badge--red",
    OPEN:        "sx-badge--gray",
    PARTIAL:     "sx-badge--amber",
  };
  const colorClass = colors[status] || "sx-badge--gray";
  return (
    <span className={`sx-badge ${colorClass}`}>
      {label}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DealFlowPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null); // UUID
  const [deal, setDeal] = useState<Deal | null>(null);
  const [lines, setLines] = useState<DealLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [showCreate, setShowCreate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Create Modal State
  const [newDeal, setNewDeal] = useState({
    customer_id: 0,
    order_date: new Date().toISOString().split("T")[0],
    requested_date: "",
    currency: "GBP",
    notes: "",
    lines: [
      {
        description: "",
        quantity: 1,
        unit_of_measure: "EA",
        unit_price: 0,
        discount_pct: 0
      }
    ]
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch("/api/com/deal-flow/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.data);
      }
    } catch (e) { console.error("fetchDashboard failed", e); }
  }, []);

  const fetchDeals = useCallback(async () => {
    try {
      // NOTE: The current backend ListSalesOrders doesn't natively filter by status yet,
      // but we can pass status as a query parameter if we update it later.
      // For now, we fetch all and filter locally, or just fetch all.
      const res = await apiFetch("/api/com/sales-orders");
      if (res.ok) {
        const data = await res.json();
        let fetchedDeals = data.data || [];
        if (activeTab !== "Dashboard" && activeTab !== "All") {
           // Map tabs to statuses
           const tabStatus = activeTab === "In Pick" ? "PICKING" : activeTab.toUpperCase();
           fetchedDeals = fetchedDeals.filter((d: Deal) => d.status === tabStatus);
        }
        setDeals(fetchedDeals);
      }
    } catch (e) { console.error("fetchDeals failed", e); }
  }, [activeTab]);

  const fetchDealDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/com/sales-orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDeal(data.data);
        setLines(data.lines || []);
      }
    } catch (e) { console.error("fetchDealDetail failed", e); }
    finally { setLoading(false); }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/com/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { 
    if (activeTab === "Dashboard") {
      fetchDashboard();
    }
    fetchDeals(); 
  }, [fetchDeals, fetchDashboard, activeTab]);

  useEffect(() => { if (selectedId) fetchDealDetail(selectedId); }, [selectedId, fetchDealDetail]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleAction = async (action: string, body?: any) => {
    if (!selectedId) return;
    try {
      const res = await apiFetch(`/api/com/sales-orders/${selectedId}/${action}`, {
        method: "POST",
        body: JSON.stringify(body || {})
      });
      if (res.ok) {
        fetchDealDetail(selectedId);
        fetchDeals();
        if (activeTab === "Dashboard") fetchDashboard();
      } else {
        const err = await res.json();
        console.error(err.error || "Action failed");
        alert(err.error || "Action failed");
      }
    } catch (e) { console.error("Network error"); }
  };

  const createDeal = async () => {
    try {
      setErrorMsg(null);
      // Validate lines
      const validLines = newDeal.lines.filter(l => l.description.trim() !== "" && l.quantity > 0);
      if (validLines.length === 0) {
        setErrorMsg("At least one valid line is required");
        return;
      }

      const payload = { ...newDeal, lines: validLines };
      if (!payload.requested_date) delete (payload as any).requested_date;

      const res = await apiFetch("/api/com/sales-orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreate(false);
        setSelectedId(data.data.public_id);
        setNewDeal({
            customer_id: 0,
            order_date: new Date().toISOString().split("T")[0],
            requested_date: "",
            currency: "GBP",
            notes: "",
            lines: [{ description: "", quantity: 1, unit_of_measure: "EA", unit_price: 0, discount_pct: 0 }]
        });
        fetchDeals();
        fetchDashboard();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Create failed");
      }
    } catch (e) { setErrorMsg("Network error"); }
  };

  const handleAddLine = () => {
    setNewDeal({
      ...newDeal,
      lines: [...newDeal.lines, { description: "", quantity: 1, unit_of_measure: "EA", unit_price: 0, discount_pct: 0 }]
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...newDeal.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setNewDeal({ ...newDeal, lines: newLines });
  };

  return (
    <div className="sx-split">
      {/* Sidebar */}
      <div className="sx-split-left">
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 className="text-xl font-bold text-[var(--accent)] tracking-tight">DealFlow</h2>
            <p className="text-sm text-[var(--text-3)] mt-0.5">Customer orders &amp; fulfillment</p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="sx-btn sx-btn--primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            + NEW DEAL
          </button>
          <div className="mt-4">
            <SectionTabs
              tabs={[
                { key: "Dashboard", label: "Dashboard" },
                { key: "All", label: "All Deals" },
                { key: "Confirmed", label: "Confirmed" },
                { key: "In Pick", label: "In Pick" },
                { key: "Dispatched", label: "Dispatched" }
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
        <div>
          {deals.map(d => (
            <div 
              key={d.id} 
              onClick={() => setSelectedId(d.public_id)}
              className={`sx-list-item ${selectedId === d.public_id ? 'sx-list-item--active' : ''}`}
              style={{ padding: "16px 24px", display: "block", borderBottom: "1px solid var(--border)", height: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{d.so_number}</span>
                <Badge label={d.status} status={d.status} />
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.customer_name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span>{d.requested_date ? new Date(d.requested_date).toLocaleDateString() : 'No Delivery Date'}</span>
                <span style={{ color: "var(--text-primary)" }}>{d.currency} {Number(d.total_amount).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="sx-split-right" style={{ display: "flex", flexDirection: "column" }}>
        {!selectedId ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
            {activeTab === "Dashboard" ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-4 gap-4">
                  <KpiCard label="TOTAL DEALS" value={dashboard?.total_orders || 0} />
                  <KpiCard label="CONFIRMED" value={dashboard?.confirmed || 0} />
                  <KpiCard label="DISPATCHED" value={dashboard?.dispatched || 0} deltaDir="up" />
                  <KpiCard 
                    label="TOTAL REVENUE" 
                    value={`GBP ${(dashboard?.total_revenue || 0).toLocaleString()}`} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <div className="p-4 border-b border-[var(--border)] font-bold text-xs uppercase tracking-widest text-[var(--text-3)]">Recent Deals</div>
                    <CardBody>
                      <div className="space-y-4">
                        {deals.slice(0, 5).map(d => (
                          <div key={d.id} className="flex justify-between items-center text-sm">
                            <div>
                              <div className="font-bold text-[var(--accent)]">{d.so_number}</div>
                              <div className="text-[10px] opacity-40">{d.customer_name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{d.currency} {Number(d.total_amount).toLocaleString()}</div>
                              <Badge label={d.status} status={d.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <div className="p-4 border-b border-[var(--border)] font-bold text-xs uppercase tracking-widest text-[var(--text-3)]">Market Insights</div>
                    <CardBody>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-3)]">Pending Value</span>
                          <span className="font-bold text-[var(--accent)]">GBP {Number(dashboard?.pending_value || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-3)]">Avg Deal Value</span>
                          <span className="font-bold">
                            GBP {Number(dashboard?.avg_order_value || 0).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', padding: 64 }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
                <div className="sx-page-title">DealFlow Customer Orders</div>
                <div className="sx-page-sub">Select a deal from the list or create a new one.</div>
                <button onClick={() => setShowCreate(true)} className="sx-btn" style={{ marginTop: 24 }}>+ CREATE NEW DEAL</button>
              </div>
            )}
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>Loading…</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '24px 32px', background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <h1 className="sx-page-title" style={{ fontSize: '24px' }}>{deal?.so_number}</h1>
                    <Badge label={deal?.status || ""} status={deal?.status || ""} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: "var(--text-1)" }}>{deal?.customer_name}</div>
                  <div className="sx-page-sub">Ordered: {deal?.order_date} | Requested: {deal?.requested_date || 'N/A'}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {deal?.status === "DRAFT" && (
                    <>
                      <button onClick={() => handleAction("confirm")} className="sx-btn sx-btn--primary">CONFIRM DEAL</button>
                    </>
                  )}
                  {deal?.status === "CONFIRMED" && (
                    <button className="sx-btn sx-btn--primary" style={{ background: 'var(--green)', color: '#000' }}>CREATE SHIPMENT</button>
                  )}
                  {deal?.status !== "DISPATCHED" && deal?.status !== "DELIVERED" && deal?.status !== "CANCELLED" && (
                    <button onClick={() => handleAction("cancel")} className="sx-btn" style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}>CANCEL</button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
              {/* Customer Info */}
              <div className="sx-card" style={{ marginBottom: 24, padding: '20px' }}>
                 <div className="sx-label" style={{ marginBottom: '16px' }}>Customer Details</div>
                 <div className="sx-form-grid">
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: "var(--text-1)" }}>{deal?.customer_name}</div>
                      <div style={{ color: "var(--text-2)", fontSize: '13px', marginTop: '4px' }}>{deal?.customer_email || 'No email provided'}</div>
                      <div style={{ color: "var(--text-2)", fontSize: '13px' }}>{deal?.customer_code}</div>
                    </div>
                    <div>
                      <div className="sx-label">Notes</div>
                      <div style={{ color: "var(--text-2)", fontSize: '13px' }}>{deal?.notes || "No notes"}</div>
                    </div>
                 </div>
              </div>

              {/* Lines Table */}
              <div className="sx-card">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Material / Description</th>
                      <th style={{ textAlign: "right" }}>Ordered</th>
                      <th style={{ textAlign: "right" }}>Delivered</th>
                      <th style={{ textAlign: "right" }}>Price</th>
                      <th style={{ textAlign: "right" }}>Discount %</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(l => (
                      <tr key={l.id}>
                        <td>{l.line_number}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{l.description}</div>
                          {l.material_code && <div className="sx-mono">{l.material_code} - {l.material_name}</div>}
                        </td>
                        <td style={{ textAlign: "right" }}>{Number(l.quantity)} {l.unit_of_measure}</td>
                        <td style={{ textAlign: "right" }}>{Number(l.delivered_qty)}</td>
                        <td style={{ textAlign: "right" }}>{Number(l.unit_price).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>{Number(l.discount_pct).toFixed(2)}%</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>{Number(l.line_total).toFixed(2)}</td>
                        <td style={{ textAlign: "center" }}>
                          <Badge label={l.status} status={l.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <div className="sx-card" style={{ width: 300, padding: '20px' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ color: "var(--text-3)", fontSize: '13px', fontWeight: 600 }}>Subtotal</span>
                    <span style={{ color: "var(--text-1)", fontSize: '13px' }}>{Number(deal?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ color: "var(--text-3)", fontSize: '13px', fontWeight: 600 }}>Tax</span>
                    <span style={{ color: "var(--text-1)", fontSize: '13px' }}>{Number(deal?.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 16, fontWeight: 700, fontSize: '18px' }}>
                    <span style={{ color: "var(--accent)" }}>TOTAL</span>
                    <span style={{ color: "var(--accent)" }}>{deal?.currency} {Number(deal?.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="sx-modal-overlay">
          <div className="sx-modal" style={{ width: '600px' }}>
            <h3 className="sx-modal-title">New Deal</h3>
            <div className="sx-modal-sub">Create a new customer sales deal</div>
            {errorMsg && (
              <div className="sx-error" style={{ marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}
            <div className="sx-form-grid">
              <div className="sx-field sx-field--full">
                <label className="sx-label">CUSTOMER</label>
                <select  style={{ background:'var(--bg-input)', color:'var(--text-1)', border:'1px solid var(--border-hi)', borderRadius:'6px', padding:'0 10px', height:'36px', width:'100%', fontFamily:'var(--font-sans)', fontSize:'13px', outline:'none', cursor:'pointer' }} 
                  value={newDeal.customer_id} 
                  onChange={e => setNewDeal({...newDeal, customer_id: parseInt(e.target.value)})}
                  className="sx-select"
                >
                  <option value={0}>Select Customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="sx-field">
                <label className="sx-label">DATE</label>
                <input type="date" className="sx-input" value={newDeal.order_date} onChange={e => setNewDeal({...newDeal, order_date: e.target.value})} />
              </div>
              <div className="sx-field">
                <label className="sx-label">REQ. DELIVERY</label>
                <input type="date" className="sx-input" value={newDeal.requested_date} onChange={e => setNewDeal({...newDeal, requested_date: e.target.value})} />
              </div>
              <div className="sx-field sx-field--full">
                <label className="sx-label">NOTES</label>
                <textarea className="sx-textarea" value={newDeal.notes} onChange={e => setNewDeal({...newDeal, notes: e.target.value})} />
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <div className="sx-label" style={{ marginBottom: '8px' }}>LINE ITEMS</div>
              {newDeal.lines.map((line, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    className="sx-input" 
                    style={{ flex: 2 }} 
                    placeholder="Description" 
                    value={line.description} 
                    onChange={e => updateLine(idx, 'description', e.target.value)} 
                  />
                  <input 
                    type="number" 
                    className="sx-input" 
                    style={{ flex: 1 }} 
                    placeholder="Qty" 
                    value={line.quantity} 
                    min={1}
                    onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value))} 
                  />
                  <input 
                    type="number" 
                    className="sx-input" 
                    style={{ flex: 1 }} 
                    placeholder="Price" 
                    value={line.unit_price} 
                    min={0}
                    step={0.01}
                    onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value))} 
                  />
                </div>
              ))}
              <button className="sx-btn" onClick={handleAddLine} style={{ marginTop: '8px', fontSize: '12px' }}>
                + Add Line
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="sx-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="sx-btn sx-btn--primary" onClick={createDeal}>Create Deal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
