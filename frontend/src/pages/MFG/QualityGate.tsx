import { useState, useEffect, useCallback } from "react";
import { KpiCard } from '@/components/ui/KpiCard';
import { SectionTabs } from '@/components/ui/SectionTabs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QualityCheck {
  id: number;
  check_number: string;
  trigger_type: string;
  trigger_id: number;
  material_id: number;
  supplier_id?: number;
  quantity_to_inspect: number;
  quantity_passed: number;
  quantity_failed: number;
  quantity_pending: number;
  status: string;
  result: string;
  inspector?: string;
  inspection_date?: string;
  failure_category?: string;
  storage_zone?: string;
  quarantine_zone?: string;
  notes?: string;
  created_at: string;
  material_name?: string;
  supplier_name?: string;
}

interface Finding {
  id: number;
  finding_no: number;
  finding_type: string;
  category: string;
  description: string;
  quantity_affected: number;
  severity: string;
}

interface Dashboard {
  open_checks: number;
  overdue_checks: number;
  passed_this_week: number;
  failed_this_week: number;
  rejection_rate_pct: number;
  top_failure_categories: { category: string; count: number }[];
  supplier_quality_alerts: { supplier_name: string; failed_count: number; current_score: number }[];
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
    OPEN:        "sx-badge--gray",
    IN_PROGRESS: "sx-badge--amber",
    PASSED:      "sx-badge--green",
    FAILED:      "sx-badge--red",
    PARTIAL:     "sx-badge--blue",
    PASS:        "sx-badge--green",
    REJECT:      "sx-badge--red",
    CRITICAL:    "sx-badge--red",
    MAJOR:       "sx-badge--amber",
    MINOR:       "sx-badge--blue",
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

export default function QualityGatePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [check, setCheck] = useState<QualityCheck | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch("/api/quality-checks/dashboard");
      const data = await res.json();
      setDashboard(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchChecks = useCallback(async () => {
    try {
      const res = await apiFetch("/api/quality-checks");
      const data = await res.json();
      setChecks(data.quality_checks || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchCheckDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/quality-checks/${id}`);
      const data = await res.json();
      setCheck(data.quality_check);
      setFindings(data.findings || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); fetchChecks(); }, [fetchDashboard, fetchChecks]);
  useEffect(() => { if (selectedId) fetchCheckDetail(selectedId); }, [selectedId, fetchCheckDetail]);

  const handleStart = async () => {
    if (!selectedId) return;
    try {
      const res = await apiFetch(`/api/quality-checks/${selectedId}/start`, {
        method: "POST",
        body: JSON.stringify({ inspector: "CURRENT_USER" })
      });
      if (res.ok) fetchCheckDetail(selectedId);
    } catch (e) { console.error(e); }
  };

  const handleRecord = async (result: string) => {
    if (!selectedId || !check) return;
    try {
      const res = await apiFetch(`/api/quality-checks/${selectedId}/record-result`, {
        method: "POST",
        body: JSON.stringify({
          result,
          quantity_passed: result === 'PASS' ? check.quantity_to_inspect : 0,
          quantity_failed: result === 'REJECT' ? check.quantity_to_inspect : 0,
          inspector: "CURRENT_USER",
          storage_zone: check.storage_zone || "STOCK-A1",
          quarantine_zone: "QUARANTINE-X",
          notes: "Recorded via QualityGate UI"
        })
      });
      if (res.ok) {
        fetchCheckDetail(selectedId);
        fetchDashboard();
        fetchChecks();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Quality Gate</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Inspection management and supplier quality</p>
        </div>
      </div>
      <SectionTabs
        tabs={[
          { key: 'Dashboard', label: 'Dashboard' },
          { key: 'Pending Inspections', label: 'Pending Inspections' },
          { key: 'History', label: 'History' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        className="px-6"
      />

      <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
        {activeTab === "Dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-8">
             <KpiCard label="Open Checks" value={dashboard?.open_checks ?? 0} />
             <KpiCard label="Overdue (>3D)" value={dashboard?.overdue_checks ?? 0} deltaDir={(dashboard?.overdue_checks ?? 0) > 0 ? 'down' : 'neutral'} />
             <KpiCard label="Passed (7D)" value={dashboard?.passed_this_week ?? 0} deltaDir={(dashboard?.passed_this_week ?? 0) > 0 ? 'up' : 'neutral'} />
             <KpiCard label="Rejection Rate" value={`${(dashboard?.rejection_rate_pct ?? 0).toFixed(1)}%`} deltaDir={(dashboard?.rejection_rate_pct ?? 0) > 0 ? 'down' : 'neutral'} />
          </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
               <div className="sx-card" style={{ padding: '24px' }}>
                 <div className="sx-label" style={{ marginBottom: '16px', color: 'var(--accent)' }}>Top Failure Categories</div>
                 {(dashboard?.top_failure_categories || []).length === 0 ? (
                   <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No failure categories recorded.</div>
                 ) : (dashboard?.top_failure_categories || []).map(c => (
                   <div key={c.category} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                     <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{c.category}</span>
                     <span style={{ fontWeight: 700, color: "var(--text-1)" }}>{c.count}</span>
                   </div>
                 ))}
               </div>
               <div className="sx-card" style={{ padding: '24px', borderColor: 'var(--red-dim)' }}>
                 <div className="sx-label" style={{ marginBottom: '16px', color: 'var(--red)' }}>Supplier Quality Alerts</div>
                 {(dashboard?.supplier_quality_alerts || []).length === 0 ? (
                   <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No supplier quality alerts.</div>
                 ) : (dashboard?.supplier_quality_alerts || []).map(s => (
                   <div key={s.supplier_name} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                     <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{s.supplier_name}</span>
                     <div style={{ textAlign: "right" }}>
                       <div style={{ fontWeight: 700, color: "var(--red)" }}>{s.failed_count} Failures</div>
                       <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Current Score: {s.current_score}</div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {(activeTab === "Pending Inspections" || activeTab === "History") && (
          <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 32, height: "calc(100% - 100px)" }}>
            {/* List */}
            <div className="sx-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="sx-label" style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                {activeTab === "History" ? "Inspection History" : "Pending Queue"}
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {checks.filter(c => activeTab === "History" ? (c.status === 'PASSED' || c.status === 'FAILED') : (c.status === 'OPEN' || c.status === 'IN_PROGRESS')).map(c => (
                    <div 
                    key={c.id} 
                    onClick={() => setSelectedId(c.id)}
                    className={`sx-list-item ${selectedId === c.id ? 'sx-list-item--active' : ''}`}
                    style={{ padding: "16px", display: "block", borderBottom: "1px solid var(--border)", height: "auto" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="sx-mono" style={{ fontWeight: 700, color: "var(--accent)" }}>{c.check_number}</span>
                      <Badge label={c.status} status={c.status} />
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{c.material_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{c.trigger_type} ID: {c.trigger_id}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Qty: {c.quantity_to_inspect}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail */}
            <div className="sx-card" style={{ padding: '32px' }}>
              {!selectedId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔬</div>
                  <div className="sx-page-title">Select an inspection</div>
                  <div className="sx-page-sub">View or process the selected inspection</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h2 className="sx-page-title" style={{ fontSize: '24px' }}>{check?.check_number}</h2>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-1)", marginTop: '4px' }}>{check?.material_name}</div>
                      <div style={{ color: "var(--text-3)", marginTop: 6, fontSize: '13px' }}>Supplier: {check?.supplier_name || "Internal"}</div>
                    </div>
                    <Badge label={check?.status || ""} status={check?.status || ""} />
                  </div>

                  <div className="sx-form-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <Fld label="Trigger">{check?.trigger_type}</Fld>
                    <Fld label="Quantity">{check?.quantity_to_inspect}</Fld>
                    <Fld label="Created At">{check?.created_at ? new Date(check.created_at).toLocaleString() : ""}</Fld>
                  </div>

                  {check?.status === 'OPEN' && (
                    <div style={{ padding: 48, border: "1px dashed var(--border)", textAlign: "center", borderRadius: "var(--r-lg)", background: "var(--bg-surface2)" }}>
                      <p style={{ color: "var(--text-3)", marginBottom: 24, fontSize: 14 }}>Inspection not yet started.</p>
                      <button onClick={handleStart} className="sx-btn sx-btn--primary">START INSPECTION</button>
                    </div>
                  )}

                  {check?.status === 'IN_PROGRESS' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                      <div style={{ background: "var(--bg-surface2)", padding: 24, borderRadius: "var(--r-md)", border: '1px solid var(--border)' }}>
                        <div className="sx-label" style={{ marginBottom: '20px', color: 'var(--accent)' }}>Record Inspection Results</div>
                        <div style={{ display: "flex", gap: 16 }}>
                          <button onClick={() => handleRecord('PASS')} className="sx-btn" style={{ flex: 1, background: 'var(--green)', color: '#000', justifyContent: "center", padding: "16px" }}>PASS / ACCEPT</button>
                          <button onClick={() => handleRecord('REJECT')} className="sx-btn" style={{ flex: 1, background: 'var(--red)', color: '#000', justifyContent: "center", padding: "16px" }}>FAIL / REJECT</button>
                        </div>
                      </div>

                      <div>
                        <div className="sx-label" style={{ marginBottom: '16px' }}>Findings ({findings.length})</div>
                        {findings.length === 0 ? <p style={{ color: "var(--text-3)", fontSize: 14 }}>No findings recorded.</p> : (
                          <table className="sx-table" style={{ background: "transparent" }}>
                             <thead>
                               <tr>
                                 <th>Type</th>
                                 <th>Description</th>
                                 <th style={{ textAlign: "right" }}>Qty</th>
                                 <th style={{ textAlign: "center" }}>Severity</th>
                               </tr>
                             </thead>
                             <tbody>
                               {findings.map(f => (
                                 <tr key={f.id}>
                                   <td>{f.finding_type}</td>
                                   <td>{f.description}</td>
                                   <td style={{ textAlign: "right" }}>{f.quantity_affected}</td>
                                   <td style={{ textAlign: "center" }}><Badge label={f.severity} status={f.severity} /></td>
                                 </tr>
                               ))}
                             </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {(check?.status === 'PASSED' || check?.status === 'FAILED' || check?.status === 'PARTIAL') && (
                    <div className="sx-form-grid" style={{ gridTemplateColumns: "1fr 1fr", background: "var(--bg-surface2)", padding: 24, borderRadius: "var(--r-md)", border: '1px solid var(--border)' }}>
                      <Fld label="Result"><Badge label={check?.result || ""} status={check?.result || ""} /></Fld>
                      <Fld label="Inspector">{check?.inspector}</Fld>
                      <Fld label="Quantity Passed">{check?.quantity_passed}</Fld>
                      <Fld label="Quantity Failed">{check?.quantity_failed}</Fld>
                      <Fld label="Category">{check?.failure_category || "N/A"}</Fld>
                      <Fld label="Target Zone"><span className="sx-mono">{check?.storage_zone || check?.quarantine_zone}</span></Fld>
                      <Fld label="Inspector Notes" span={2}>{check?.notes}</Fld>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
