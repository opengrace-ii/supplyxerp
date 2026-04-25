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

const MODULES = ["All", "PO", "RFQ", "SUPPLY PACT", "VENDOR", "MATERIAL", "AUTH", "SYSTEM"];
const ACTIONS = ["All", "Created", "Updated", "Deleted", "Approved", "Sent", "Auth"];

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

function translateLog(log: LogEntry): TranslatedLog {
  let action = "Interaction";
  let module = "OTHER";
  let reference = "—";
  let businessDetail = `${log.method} ${log.path}`;

  const { method, path } = log;

  // Translation Logic
  if (path.startsWith("/api/purchase-orders")) {
    module = "PO";
    if (method === "POST") action = "Created Purchase Order";
    if (method === "PATCH" || method === "PUT") action = "Updated Purchase Order";
  } else if (path.startsWith("/api/purchase-requests")) {
    module = "PR";
    if (method === "POST") action = "Created Purchase Request";
  } else if (path.startsWith("/api/supply-pacts")) {
    module = "SUPPLY PACT";
    if (method === "POST") action = "Created Supply Pact";
    if (path.includes("/activate")) action = "Activated Supply Pact";
  } else if (path.startsWith("/api/vendors") || path.startsWith("/api/suppliers")) {
    module = "VENDOR";
    if (path.includes("/scorecard") && method === "POST") action = "Submitted Vendor Score";
    if (method === "POST" && path.endsWith("/suppliers")) action = "Created Supplier";
  } else if (path.startsWith("/api/po/") && path.includes("/items/")) {
    module = "PO";
    if (path.includes("/block") && method === "POST") action = "Blocked PO Line Item";
    if (path.includes("/unblock") && method === "POST") action = "Released PO Line Item";
    if (method === "DELETE") action = "Deleted PO Line Item";
  } else if (path.startsWith("/api/dispatch/send")) {
    module = "DISPATCH";
    action = "Dispatched Document";
  } else if (path.startsWith("/api/auth/login")) {
    module = "AUTH";
    action = "User Login";
  } else if (path.startsWith("/api/po/") && path.includes("/progress/")) {
    module = "PROGRESS";
    if (path.includes("/initialize")) action = "Initialized Milestone Tracking";
    else action = "Updated Milestone Event";
  } else if (path.startsWith("/api/products")) {
    module = "MATERIAL";
    if (method === "POST") action = "Created Product";
    if (method === "PUT") action = "Updated Product";
  }

  // Extract ID if possible for reference
  const parts = path.split("/");
  if (parts.length > 3 && !isNaN(Number(parts[3]))) {
    reference = `#${parts[3]}`;
  }

  return {
    ...log,
    action,
    module,
    reference,
    businessDetail,
    timeAgo: getTimeAgo(log.timestamp),
  };
}

// ─── Components ───────────────────────────────────────────────────────────────

const Badge = ({ label, colorClass = "sx-badge--gray" }: { label: string; colorClass?: string }) => (
  <span className={`sx-badge ${colorClass}`}>{label}</span>
);

export default function AuditLog() {
  const [logs, setLogs] = useState<TranslatedLog[]>([]);
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
      const res = await apiFetch("/api/system/logs?limit=500");
      const d: LogEntry[] = await res.json();
      
      // Filter for audit-worthy logs: mutations (POST, PUT, PATCH, DELETE)
      const filtered = d
        .filter(l => ["POST", "PUT", "PATCH", "DELETE"].includes(l.method))
        .map(translateLog);
      
      setLogs(filtered);
    } catch (err) { console.error("Logs load fail", err); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    logs.forEach(l => users.add(l.user_email));
    return ["All", ...Array.from(users)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (filters.user !== "All" && l.user_email !== filters.user) return false;
      if (filters.module !== "All" && l.module !== filters.module) return false;
      if (filters.action !== "All" && !l.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
      
      const logDate = new Date(l.timestamp);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(filters.days));
      if (logDate < cutoff) return false;

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
                <tr key={l.id} style={{ opacity: l.status_code >= 400 ? 0.7 : 1 }}>
                  <td title={new Date(l.timestamp).toLocaleString()} style={{ color: "var(--text-secondary)" }}>
                    {l.timeAgo}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{l.user_email}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {l.status_code >= 400 && <span title={`Error ${l.status_code}`}>⚠️</span>}
                      <span style={{ fontWeight: 700, color: l.status_code >= 400 ? "var(--red)" : "var(--text-primary)" }}>{l.action}</span>
                    </div>
                  </td>
                  <td>
                    <Badge label={l.module} colorClass={getModuleColor(l.module)} />
                  </td>
                  <td style={{ color: "var(--accent)", fontWeight: 700 }}>{l.reference}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {l.businessDetail}
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
    case "PO": return "sx-badge--amber";
    case "RFQ": return "sx-badge--blue";
    case "SUPPLY PACT": return "sx-badge--pink"; // assuming pink exists or use secondary
    case "VENDOR": return "sx-badge--green";
    case "AUTH": return "sx-badge--red";
    default: return "sx-badge--purple"; // assuming purple exists
  }
}
