import React, { useState, useEffect, useCallback, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  timestamp: string;
  user_id: number;
  user_email: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  ip_address: string;
}

interface TranslatedLog extends LogEntry {
  action: string;
  module: string;
  reference: string;
  businessDetail: string;
  timeAgo: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODULES = ["All", "product", "purchase_order", "purchase_request", "rfq_document", "quality_check", "handling_unit", "gr_document"];
const ACTIONS = ["All", "PRODUCT_CREATED", "PRODUCT_UPDATED", "PO_CREATED", "PO_APPROVED", "PR_CREATED", "STOCK_TRANSFERRED", "GR_POSTED", "QC_RESULT_RECORDED"];

const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATED:         'Created Product',
  PRODUCT_UPDATED:         'Updated Product',
  PO_CREATED:              'Created Purchase Order',
  PO_APPROVED:             'Approved Purchase Order',
  PR_CREATED:              'Created Purchase Request',
  STOCK_TRANSFERRED:       'Transferred Stock',
  GR_POSTED:               'Posted Goods Receipt',
  QC_RESULT_RECORDED:      'Recorded QC Result',
  RFQ_CREATED:             'Created RFQ',
  RFQ_FINALISED:           'Finalised RFQ',
  USER_CREATED:            'Added User',
};

const MODULE_LABELS: Record<string, string> = {
  product:          'Materials',
  purchase_order:   'Purchasing',
  purchase_request: 'Purchasing',
  rfq_document:     'RFQ',
  quality_check:    'Quality',
  handling_unit:    'Warehouse',
  gr_document:      'Goods Receipt',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeAgo(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  module: string;
  reference: string;
  details: any;
  username: string;
  user_email: string;
}

// ─── Components ───────────────────────────────────────────────────────────────

const Badge = ({ label, colorClass = "sx-badge--gray" }: { label: string; colorClass?: string }) => (
  <span className={`sx-badge ${colorClass}`}>{label}</span>
);

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    user: "All",
    module: "All",
    action: "All",
    days: "7",
  });

  const apiFetch = useCallback((url: string, opts: any = {}) => {
    return fetch(url, { ...opts, credentials: "include" });
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/system/audit-log?period=${filters.days}`);
      const data: AuditEntry[] = await res.json();
      setLogs(data);
    } catch (err) { console.error("Logs load fail", err); }
    finally { setLoading(false); }
  }, [apiFetch, filters.days]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    logs.forEach(l => {
        if (l.user_email) users.add(l.user_email);
        else if (l.username) users.add(l.username);
    });
    return ["All", ...Array.from(users)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const userMatch = filters.user === "All" || l.user_email === filters.user || l.username === filters.user;
      if (!userMatch) return false;
      
      if (filters.module !== "All" && l.module !== filters.module) return false;
      if (filters.action !== "All" && l.action !== filters.action) return false;
      
      return true;
    });
  }, [logs, filters]);


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }} data-section="SYSTEM">
      
      {/* ── Header ── */}
      <div style={{ padding: "32px 48px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "var(--accent)" }}>Audit Log</h1>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>Business activity trail — who did what, when</div>
      </div>

      {/* ── Filters ── */}
      <div style={{ padding: "20px 48px", background: "var(--bg-surface2)", borderBottom: "1px solid var(--border)", display: "flex", gap: 24, alignItems: "flex-end" }}>
        <FilterGroup label="USER">
          <select value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})} className="sx-input sx-select" style={{ minWidth: 140 }}>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </FilterGroup>
        
        <FilterGroup label="MODULE">
          <select value={filters.module} onChange={e => setFilters({...filters, module: e.target.value})} className="sx-input sx-select" style={{ minWidth: 140 }}>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </FilterGroup>

        <FilterGroup label="ACTION">
          <select value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})} className="sx-input sx-select" style={{ minWidth: 140 }}>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </FilterGroup>

        <FilterGroup label="PERIOD">
          <select value={filters.days} onChange={e => setFilters({...filters, days: e.target.value})} className="sx-input sx-select" style={{ minWidth: 140 }}>
            <option value="1">Last 24 Hours</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </FilterGroup>

        <button 
          onClick={() => setFilters({ user: "All", module: "All", action: "All", days: "7" })}
          className="sx-btn sx-btn--ghost"
        >
          CLEAR FILTERS
        </button>

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em" }}>{filteredLogs.length} EVENTS MATCHED</div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, padding: 48, overflowY: "auto" }}>
        <div className="sx-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="sx-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>USER</th>
                <th>ACTION</th>
                <th>MODULE</th>
                <th>REFERENCE</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(l => (
                <tr key={l.id}>
                  <td title={new Date(l.timestamp).toLocaleString()} style={{ color: "var(--text-secondary)" }}>
                    {getTimeAgo(l.timestamp)}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{l.user_email || l.username}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {ACTION_LABELS[l.action] || l.action}
                    </span>
                  </td>
                  <td>
                    <Badge 
                      label={MODULE_LABELS[l.module] || l.module} 
                      colorClass={getModuleColor(MODULE_LABELS[l.module] || l.module)} 
                    />
                  </td>
                  <td style={{ color: "var(--accent)", fontWeight: 700 }}>{l.reference}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {renderDetails(l)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderDetails(log: AuditEntry) {
    if (!log.details) return "—";
    
    // Simple logic to extract a summary from details
    const d = log.details;
    if (typeof d === 'string') return d;
    
    if (log.action === "GR_POSTED") {
        return `${d.quantity} ${d.unit} of product received`;
    }
    if (log.action === "STOCK_TRANSFERRED") {
        return `Moved ${d.quantity} units to zone ${d.to_zone_id}`;
    }
    if (log.action === "PRODUCT_CREATED") {
        return `Code: ${d.code}, Name: ${d.name}`;
    }
    
    return JSON.stringify(d).substring(0, 80) + "...";
}


// ─── Styles & Subcomponents ───────────────────────────────────────────────────

function FilterGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="sx-field" style={{ marginBottom: 0 }}>
      <label className="sx-label">{label}</label>
      {children}
    </div>
  );
}

function getModuleColor(m: string) {
  switch (m) {
    case "Purchasing": return "sx-badge--amber";
    case "RFQ": return "sx-badge--blue";
    case "Goods Receipt": return "sx-badge--pink";
    case "Warehouse": return "sx-badge--green";
    case "Quality": return "sx-badge--red";
    case "Materials": return "sx-badge--purple";
    default: return "sx-badge--gray";
  }
}
