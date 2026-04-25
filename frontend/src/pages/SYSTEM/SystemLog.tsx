import React, { useState, useEffect } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { Input, Select } from '@/components/ui/Form';

interface SystemLog {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: string;
  operation: string;
  message: string;
  status_code: number;
  path: string;
  duration_ms: number;
  created_at: string;
}

interface LogSummary {
  total: number;
  errors: number;
  warns: number;
  infos: number;
  avg_latency: number;
}

const SystemLog: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const query = new URLSearchParams();
      if (filterLevel) query.append('level', filterLevel);
      if (filterCategory) query.append('category', filterCategory);
      if (search) query.append('search', search);

      const [logsRes, summaryRes] = await Promise.all([
        fetch(`/api/system/logs?${query.toString()}`),
        fetch('/api/system/logs/summary')
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [filterLevel, filterCategory, search]);

  const getLevelColorClass = (level: string) => {
    switch (level) {
      case 'ERROR': return 'sx-badge--red';
      case 'WARN': return 'sx-badge--amber';
      case 'INFO': return 'sx-badge--blue';
      default: return 'sx-badge--gray';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">System Monitoring</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Real-time telemetry · API logs · Exception tracking</p>
        </div>
        <div className="text-xs text-[var(--text-3)] text-right">
          Auto-refreshing every 5s<br />
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total Events" value={summary?.total || 0} icon="📡" />
        <KpiCard label="Errors (24H)" value={summary?.errors || 0} icon="⚠️" deltaDir={(summary?.errors || 0) > 0 ? 'down' : 'neutral'} />
        <KpiCard label="Warnings" value={summary?.warns || 0} icon="⚡" deltaDir={(summary?.warns || 0) > 0 ? 'down' : 'neutral'} />
        <KpiCard label="Avg Latency" value={`${summary?.avg_latency?.toFixed(1) || 0}ms`} icon="⏱️" />
      </div>

      {/* Filters */}
      <div className="sx-card" style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px 24px', alignItems: 'center' }}>
        <Input 
          type="text" 
          placeholder="Search logs..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sx-input"
          style={{ flex: 1 }}
        />
        <Select 
          value={filterLevel} 
          onChange={(e) => setFilterLevel(e.target.value)}
          className="sx-input sx-select"
          style={{ width: 160 }}
        >
          <option value="">All Levels</option>
          <option value="ERROR">Error Only</option>
          <option value="WARN">Warning</option>
          <option value="INFO">Info</option>
        </Select>
        <Select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className="sx-input sx-select"
          style={{ width: 160 }}
        >
          <option value="">All Modules</option>
          <option value="AUTH">Auth</option>
          <option value="PURCHASING">Purchasing</option>
          <option value="PO">PO Enrich</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="API">Public API</option>
        </Select>
        <button onClick={fetchLogs} className="sx-btn sx-btn--primary" style={{ padding: "10px 16px" }}>Refresh</button>
      </div>

      {/* Logs Table */}
      <div className="sx-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="sx-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Level</th>
              <th>Module</th>
              <th>Message</th>
              <th>Path / Status</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Initializing telemetry...' : 'No logs found for current filters.'}
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td style={{ color: "var(--text-secondary)" }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td>
                  <span className={`sx-badge ${getLevelColorClass(log.level)}`}>
                    {log.level}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '11px', textTransform: "uppercase", letterSpacing: "0.05em" }}>{log.category}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: 2 }}>{log.operation}</div>
                </td>
                <td style={{ maxWidth: '400px' }}>
                  <div style={{ fontWeight: '500', color: "var(--text-primary)" }}>{log.message}</div>
                </td>
                <td>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 12 }}>{log.path}</div>
                  <div style={{ 
                    color: log.status_code >= 400 ? 'var(--red)' : 'var(--green)',
                    fontSize: '12px',
                    marginTop: '4px',
                    fontWeight: 600
                  }}>
                    HTTP {log.status_code}
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>
                  {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemLog;
