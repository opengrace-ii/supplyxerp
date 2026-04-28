import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionTabs } from "@/components/ui/SectionTabs";

// --- Types ---
interface DispatchRule {
  id: number;
  rule_name: string;
  trigger_event: string;
  channel: string;
  is_active: boolean;
}

interface DispatchLog {
  id: number;
  reference_type: string;
  reference_code: string;
  channel: string;
  status: string;
  sent_at: string | null;
  recipient: string;
  subject: string;
  error_message: string | null;
}

export default function DocumentDispatch() {
  const [rules, setRules] = useState<DispatchRule[]>([]);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dispatch Log");

  const apiFetch = useCallback((url: string, opts: any = {}) => {
    return fetch(url, { ...opts, credentials: "include" });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const lRes = await apiFetch("/api/config/dispatch/logs");
      if (lRes.ok) {
        const text = await lRes.text();
        try {
          const lD = JSON.parse(text);
          setLogs(lD.data ?? []);
        } catch(e) {
          console.error("Failed to parse logs JSON", text);
          setLogs([]);
        }
      }

      const rRes = await apiFetch("/api/config/dispatch/rules");
      if (rRes.ok) {
        const text = await rRes.text();
        try {
          const rD = JSON.parse(text);
          setRules(rD.data ?? []);
        } catch(e) {
          console.error("Failed to parse rules JSON", text);
          setRules([]);
        }
      }
    } catch (err) { 
      console.error("Dispatch data load fail", err); 
    } finally { 
      setLoading(false); 
    }
  }, [apiFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Header */}
      <div className="p-8 border-b border-[var(--border)] bg-white/[0.01]">
        <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Document Dispatch</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Automated supplier communication and notification logs</p>
      </div>

      <SectionTabs
        tabs={[
          { key: "Dispatch Log", label: "Dispatch Log" },
          { key: "Automation Rules", label: "Automation Rules" }
        ]}
        active={activeTab}
        onChange={setActiveTab}
        className="px-8 mt-2"
      />

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === "Dispatch Log" ? (
          <Card>
            <CardBody>
              <DataTable
                loading={loading}
                columns={[
                  { 
                    key: 'sent_at', 
                    header: 'TIMESTAMP', 
                    render: (l) => l.sent_at ? new Date(l.sent_at).toLocaleString() : 'Pending',
                    className: 'text-xs opacity-60'
                  },
                  { 
                    key: 'document', 
                    header: 'DOCUMENT',
                    render: (l) => (
                      <div>
                        <div className="font-bold text-[var(--text-1)]">{l.reference_type}</div>
                        <div className="text-[10px] opacity-40 font-mono">REF: {l.reference_code}</div>
                      </div>
                    )
                  },
                  { 
                    key: 'channel', 
                    header: 'CHANNEL',
                    render: (l) => <Badge variant="blue">{l.channel}</Badge>
                  },
                  { 
                    key: 'recipient', 
                    header: 'RECIPIENT',
                    render: (l) => (
                      <div className="max-w-[200px]">
                        <div className="font-medium text-xs truncate">{l.recipient}</div>
                        <div className="text-[10px] opacity-40 truncate">{l.subject}</div>
                      </div>
                    )
                  },
                  { 
                    key: 'status', 
                    header: 'STATUS',
                    render: (l) => (
                      <div className="flex flex-col gap-1">
                        <Badge variant={l.status === 'SENT' ? 'green' : l.status === 'FAILED' ? 'red' : 'amber'}>
                          {l.status}
                        </Badge>
                        {l.error_message && <div className="text-[9px] text-red-400 max-w-[120px] truncate">{l.error_message}</div>}
                      </div>
                    )
                  }
                ]}
                rows={logs}
              />
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rules.map(r => (
              <Card key={r.id} className="hover:border-[var(--accent)]/30 transition-colors">
                <CardBody className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-1">Rule Name</div>
                      <div className="text-lg font-bold text-[var(--text-1)]">{r.rule_name}</div>
                    </div>
                    <Badge variant={r.is_active ? "green" : "gray"}>
                      {r.is_active ? 'ACTIVE' : 'DISABLED'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Trigger</div>
                      <div className="text-xs font-semibold">{r.trigger_event.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Channel</div>
                      <div className="text-xs font-semibold">
                        <Badge variant="blue" className="px-2 py-0.5">{r.channel}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                    <Button variant="ghost" size="sm">Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-400/10">Delete</Button>
                  </div>
                </CardBody>
              </Card>
            ))}
            
            <div className="h-[200px] border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent)]/30 hover:bg-white/[0.02] transition-all group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">➕</div>
              <div className="text-xs font-bold text-[var(--accent)]">Create Automation Rule</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
