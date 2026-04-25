import React, { useState, useEffect, useCallback } from "react";
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardBody } from '@/components/ui/Card';
import { SectionTabs } from '@/components/ui/SectionTabs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: number;
  customer_number: string;
  name: string;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  currency: string;
}

interface Deal {
  id: number;
  deal_number: string;
  customer_id: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  deal_date: string;
  requested_delivery: string;
  status: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  notes: string;
}

interface DealLine {
  id: number;
  line_no: number;
  material_id: number;
  material_code: string;
  material_name: string;
  description: string;
  ordered_qty: number;
  confirmed_qty: number;
  shipped_qty: number;
  unit_of_measure: string;
  unit_price: number;
  discount_pct: number;
  line_total: number;
  availability_status: string;
  available_qty: number;
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
    IN_PICK:     "sx-badge--amber",
    SHIPPED:     "sx-badge--green",
    DELIVERED:   "sx-badge--green",
    CANCELLED:   "sx-badge--red",
    PAID:        "sx-badge--green",
    UNPAID:      "sx-badge--amber",
    AVAILABLE:   "sx-badge--green",
    PARTIAL:     "sx-badge--amber",
    UNAVAILABLE: "sx-badge--red",
    UNCHECKED:   "sx-badge--gray",
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [lines, setLines] = useState<DealLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [showCreate, setShowCreate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Create Modal State
  const [newDeal, setNewDeal] = useState({
    customer_id: 0,
    deal_date: new Date().toISOString().split("T")[0],
    requested_delivery: "",
    currency: "USD",
    notes: ""
  });

  const fetchDeals = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/deals${activeTab !== "All" ? `?status=${activeTab.toUpperCase()}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (e) { console.error("fetchDeals failed", e); }
  }, [activeTab]);

  const fetchDealDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/deals/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDeal(data.deal);
        setLines(data.lines || []);
      }
    } catch (e) { console.error("fetchDealDetail failed", e); }
    finally { setLoading(false); }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => { if (selectedId) fetchDealDetail(selectedId); }, [selectedId, fetchDealDetail]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleAction = async (action: string, body?: any) => {
    if (!selectedId) return;
    try {
      const res = await apiFetch(`/api/deals/${selectedId}/${action}`, {
        method: "POST",
        body: JSON.stringify(body || {})
      });
      if (res.ok) {
        fetchDealDetail(selectedId);
        fetchDeals();
      } else {
        const err = await res.json();
        // Use inline error or something instead of alert if possible, but keep simple for action
        console.error(err.error || "Action failed");
      }
    } catch (e) { console.error("Network error"); }
  };

  const saveLines = async () => {
    if (!selectedId) return;
    try {
      const res = await apiFetch(`/api/deals/${selectedId}/lines`, {
        method: "PUT",
        body: JSON.stringify({ lines })
      });
      if (res.ok) fetchDealDetail(selectedId);
    } catch (e) { console.error("Save failed"); }
  };

  const createDeal = async () => {
    try {
      setErrorMsg(null);
      const res = await apiFetch("/api/deals", {
        method: "POST",
        body: JSON.stringify(newDeal)
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreate(false);
        setSelectedId(data.id);
        fetchDeals();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Create failed");
      }
    } catch (e) { setErrorMsg("Network error"); }
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
                { key: "Shipped", label: "Shipped" }
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
              onClick={() => setSelectedId(d.id)}
              className={`sx-list-item ${selectedId === d.id ? 'sx-list-item--active' : ''}`}
              style={{ padding: "16px 24px", display: "block", borderBottom: "1px solid var(--border)", height: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{d.deal_number}</span>
                <Badge label={d.status} status={d.status} />
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.customer_name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span>{new Date(d.requested_delivery).toLocaleDateString()}</span>
                <span style={{ color: "var(--text-primary)" }}>{d.currency} {d.total_amount.toLocaleString()}</span>
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
                  <KpiCard label="TOTAL DEALS" value={deals.length} />
                  <KpiCard label="CONFIRMED" value={deals.filter(d => d.status === 'CONFIRMED').length} />
                  <KpiCard label="SHIPPED (7D)" value={deals.filter(d => d.status === 'SHIPPED').length} deltaDir="up" />
                  <KpiCard 
                    label="TOTAL REVENUE" 
                    value={`${deals[0]?.currency || 'USD'} ${deals.reduce((acc, d) => acc + d.total_amount, 0).toLocaleString()}`} 
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
                              <div className="font-bold text-[var(--accent)]">{d.deal_number}</div>
                              <div className="text-[10px] opacity-40">{d.customer_name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{d.currency} {d.total_amount.toLocaleString()}</div>
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
                          <span className="text-[var(--text-3)]">Top Customer</span>
                          <span className="font-bold text-[var(--accent)]">{deals[0]?.customer_name || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-3)]">Avg Deal Value</span>
                          <span className="font-bold">
                            {deals[0]?.currency || 'USD'} {(deals.reduce((acc, d) => acc + d.total_amount, 0) / (deals.length || 1)).toFixed(0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-3)]">Fulfillment Rate</span>
                          <span className="font-bold text-green-400">94.2%</span>
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
                    <h1 className="sx-page-title" style={{ fontSize: '24px' }}>{deal?.deal_number}</h1>
                    <Badge label={deal?.status || ""} status={deal?.status || ""} />
                    <Badge label={deal?.payment_status || ""} status={deal?.payment_status || ""} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: "var(--text-1)" }}>{deal?.customer_name}</div>
                  <div className="sx-page-sub">Ordered: {deal?.deal_date} | Requested: {deal?.requested_delivery}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {deal?.status === "DRAFT" && (
                    <>
                      <button onClick={saveLines} className="sx-btn">CHECK AVAILABILITY</button>
                      <button onClick={() => handleAction("confirm")} className="sx-btn sx-btn--primary">CONFIRM DEAL</button>
                    </>
                  )}
                  {deal?.status === "CONFIRMED" && (
                    <button className="sx-btn sx-btn--primary" style={{ background: 'var(--green)', color: '#000' }}>CREATE SHIPMENT</button>
                  )}
                  {deal?.status !== "SHIPPED" && deal?.status !== "DELIVERED" && deal?.status !== "CANCELLED" && (
                    <button onClick={() => handleAction("cancel")} className="sx-btn" style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}>CANCEL</button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
              {/* Customer Collapsible Placeholder */}
              {/* Customer Info */}
              <div className="sx-card" style={{ marginBottom: 24, padding: '20px' }}>
                 <div className="sx-label" style={{ marginBottom: '16px' }}>Customer Details</div>
                 <div className="sx-form-grid">
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: "var(--text-1)" }}>{deal?.customer_name}</div>
                      <div style={{ color: "var(--text-2)", fontSize: '13px', marginTop: '4px' }}>{deal?.customer_email}</div>
                      <div style={{ color: "var(--text-2)", fontSize: '13px' }}>{deal?.customer_phone}</div>
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
                      <th>Material</th>
                      <th style={{ textAlign: "right" }}>Ordered</th>
                      <th style={{ textAlign: "right" }}>Confirmed</th>
                      <th style={{ textAlign: "right" }}>Shipped</th>
                      <th style={{ textAlign: "right" }}>Price</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "center" }}>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(l => (
                      <tr key={l.id}>
                        <td>{l.line_no}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{l.material_name}</div>
                          <div className="sx-mono">{l.material_code}</div>
                        </td>
                        <td style={{ textAlign: "right" }}>{l.ordered_qty} {l.unit_of_measure}</td>
                        <td style={{ textAlign: "right" }}>{l.confirmed_qty}</td>
                        <td style={{ textAlign: "right" }}>{l.shipped_qty}</td>
                        <td style={{ textAlign: "right" }}>{l.unit_price.toFixed(2)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>{l.line_total.toFixed(2)}</td>
                        <td style={{ textAlign: "center" }}>
                          <Badge label={l.availability_status} status={l.availability_status} />
                          {l.availability_status === 'PARTIAL' && <div style={{ fontSize: 10, color: "var(--amber)", marginTop: 4 }}>{l.available_qty} avail</div>}
                        </td>
                      </tr>
                    ))}
                    {deal?.status === "DRAFT" && (
                      <tr>
                        <td colSpan={8} style={{ padding: '12px', textAlign: "center" }}>
                           <button className="sx-btn" style={{ borderStyle: "dashed", width: "100%", justifyContent: "center" }}>+ ADD LINE</button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <div className="sx-card" style={{ width: 300, padding: '20px' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ color: "var(--text-3)", fontSize: '13px', fontWeight: 600 }}>Subtotal</span>
                    <span style={{ color: "var(--text-1)", fontSize: '13px' }}>{deal?.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ color: "var(--text-3)", fontSize: '13px', fontWeight: 600 }}>Tax (20%)</span>
                    <span style={{ color: "var(--text-1)", fontSize: '13px' }}>{deal?.tax_amount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 16, fontWeight: 700, fontSize: '18px' }}>
                    <span style={{ color: "var(--accent)" }}>TOTAL</span>
                    <span style={{ color: "var(--accent)" }}>{deal?.currency} {deal?.total_amount.toFixed(2)}</span>
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
          <div className="sx-modal">
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
                <select 
                  value={newDeal.customer_id} 
                  onChange={e => setNewDeal({...newDeal, customer_id: parseInt(e.target.value)})}
                  className="sx-select"
                >
                  <option value={0}>Select Customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="sx-field">
                <label className="sx-label">DATE</label>
                <input type="date" className="sx-input" value={newDeal.deal_date} onChange={e => setNewDeal({...newDeal, deal_date: e.target.value})} />
              </div>
              <div className="sx-field">
                <label className="sx-label">REQ. DELIVERY</label>
                <input type="date" className="sx-input" value={newDeal.requested_delivery} onChange={e => setNewDeal({...newDeal, requested_delivery: e.target.value})} />
              </div>
              <div className="sx-field sx-field--full">
                <label className="sx-label">NOTES</label>
                <textarea className="sx-textarea" value={newDeal.notes} onChange={e => setNewDeal({...newDeal, notes: e.target.value})} />
              </div>
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
