import React, { useState, useEffect } from 'react';

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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return '#ef4444';
      case 'WARN': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      default: return '#888';
    }
  };

  return (
    <div className="system-log-page" style={{ 
      padding: '24px', 
      backgroundColor: '#1a0e00', 
      height: '100%', 
      overflowY: 'auto',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>System Monitoring</h1>
        <div style={{ fontSize: '12px', color: '#888' }}>
          Auto-refreshing every 5s • Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Total Events</span>
          <span style={cardValueStyle}>{summary?.total || 0}</span>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #ef4444' }}>
          <span style={cardLabelStyle}>Errors (24h)</span>
          <span style={{ ...cardValueStyle, color: '#ef4444' }}>{summary?.errors || 0}</span>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
          <span style={cardLabelStyle}>Warnings</span>
          <span style={{ ...cardValueStyle, color: '#f59e0b' }}>{summary?.warns || 0}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Avg Latency</span>
          <span style={cardValueStyle}>{summary?.avg_latency?.toFixed(2) || 0}ms</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '16px', 
        padding: '16px', 
        backgroundColor: '#261a0d', 
        borderRadius: '8px',
        border: '1px solid #3d2b1a'
      }}>
        <input 
          type="text" 
          placeholder="Search logs..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        <select 
          value={filterLevel} 
          onChange={(e) => setFilterLevel(e.target.value)}
          style={inputStyle}
        >
          <option value="">All Levels</option>
          <option value="ERROR">Error Only</option>
          <option value="WARN">Warning</option>
          <option value="INFO">Info</option>
        </select>
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          style={inputStyle}
        >
          <option value="">All Modules</option>
          <option value="AUTH">Auth</option>
          <option value="PURCHASING">Purchasing</option>
          <option value="PO">PO Enrich</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="API">Public API</option>
        </select>
        <button onClick={fetchLogs} className="btn" style={{ height: '36px' }}>Refresh</button>
      </div>

      {/* Logs Table */}
      <div style={{ 
        backgroundColor: '#261a0d', 
        borderRadius: '8px', 
        border: '1px solid #3d2b1a',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#1a0e00', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Module</th>
              <th style={thStyle}>Message</th>
              <th style={thStyle}>Path / Status</th>
              <th style={thStyle}>Latency</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                  {loading ? 'Initializing telemetry...' : 'No logs found for current filters.'}
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #3d2b1a', verticalAlign: 'top' }}>
                <td style={tdStyle}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  <span style={{ 
                    color: getLevelColor(log.level), 
                    fontWeight: 'bold',
                    fontSize: '11px',
                    padding: '2px 6px',
                    backgroundColor: `${getLevelColor(log.level)}15`,
                    borderRadius: '4px',
                    border: `1px solid ${getLevelColor(log.level)}30`
                  }}>
                    {log.level}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: '600', color: '#f59e0b', fontSize: '11px' }}>{log.category}</div>
                  <div style={{ color: '#888', fontSize: '10px' }}>{log.operation}</div>
                </td>
                <td style={{ ...tdStyle, maxWidth: '400px' }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{log.message}</div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontFamily: 'monospace', color: '#888' }}>{log.path}</div>
                  <div style={{ 
                    color: log.status_code >= 400 ? '#ef4444' : '#10b981',
                    fontSize: '11px',
                    marginTop: '2px'
                  }}>
                    HTTP {log.status_code}
                  </div>
                </td>
                <td style={tdStyle}>
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

const cardStyle: React.CSSProperties = {
  backgroundColor: '#261a0d',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #3d2b1a',
  display: 'flex',
  flexDirection: 'column'
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888',
  marginBottom: '8px'
};

const cardValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#fff'
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '11px',
  fontWeight: '600'
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: '#ddd',
  lineHeight: '1.5'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1a0e00',
  border: '1px solid #3d2b1a',
  borderRadius: '4px',
  padding: '6px 12px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  minWidth: '150px'
};

export default SystemLog;
