import React, { useState, useEffect, useCallback } from "react";
import { api, apiClient } from "../../api/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "@/components/ui/KpiCard";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Supplier {
  id: number;
  public_id: string;
  name: string;
  category?: string;
  status?: string;
}

interface Scorecard {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  period_start: string;
  period_end: string;
  price_score: number;
  delivery_score: number;
  quality_score: number;
  response_score: number;
  compliance_score: number;
  auto_score: number;
  total_orders: number;
  on_time_count: number;
  late_count: number;
  quality_pass: number;
  quality_fail: number;
  last_calculated: string;
  evaluated_by: string;
  created_at: string;
}

interface ScorecardEvent {
  id: number;
  event_type: string;
  reference_type: string;
  reference_code: string;
  score_impact: number;
  notes: string;
  recorded_at: string;
  recorded_by_name: string;
}

interface ScorecardSummary {
  total_suppliers: number;
  excellent: number;
  good: number;
  needs_improvement: number;
  critical: number;
  avg_score: number;
}

// ─── Components ───────────────────────────────────────────────────────────────

const ScoreGauge = ({ value, label, size = 100 }: { value: number, label: string, size?: number }) => {
  const getColor = (v: number) => {
    if (v >= 80) return "stroke-green-500";
    if (v >= 60) return "stroke-amber-500";
    return "stroke-red-500";
  };
  
  const getTextColor = (v: number) => {
    if (v >= 80) return "text-green-500";
    if (v >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const radius = size * 0.4;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (value / 100) * circum;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size/2} cy={size/2} r={radius} className="stroke-white/5 fill-none" strokeWidth={size/10} />
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            className={cn("fill-none transition-all duration-1000 ease-out", getColor(value))} 
            strokeWidth={size/10}
            strokeDasharray={circum} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className={cn("absolute inset-0 flex items-center justify-center font-black", getTextColor(value))} style={{ fontSize: size/4 }}>
          {Math.round(value)}
        </div>
      </div>
      <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">{label}</div>
    </div>
  );
};

const NoteBox = ({ label, note }: { label: string, note: string }) => (
  <div className="space-y-2">
    <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest">{label}</div>
    <div className="p-4 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-2)] leading-relaxed min-h-[80px]">
      {note || 'No detailed comments recorded for this dimension.'}
    </div>
  </div>
);

export default function VendorScorecard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [summary, setSummary] = useState<ScorecardSummary | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [currentScorecard, setCurrentScorecard] = useState<Scorecard | null>(null);
  const [events, setEvents] = useState<ScorecardEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"RANKING" | "DETAIL">("RANKING");

  const loadInitial = useCallback(async () => {
    try {
      const [sRes, sumRes, scRes] = await Promise.all([
        apiClient.get("/api/suppliers"),
        apiClient.get("/api/com/vendor-scorecards/summary"),
        apiClient.get("/api/com/vendor-scorecards")
      ]);
      setSuppliers(sRes.data.suppliers ?? []);
      setSummary(sumRes.data.data ?? null);
      setScorecards(scRes.data.data ?? []);
    } catch (err) { console.error("Initial load fail", err); }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const selectSupplier = async (s: Supplier) => {
    setSelectedSupplier(s);
    setLoading(true);
    setView("DETAIL");
    setCurrentScorecard(null);
    setEvents([]);
    try {
      const res = await apiClient.get(`/api/com/vendor-scorecards/${s.id}`);
      setCurrentScorecard(res.data.data);
      setEvents(res.data.events ?? []);
    } finally { setLoading(false); }
  };

  const handleRecalculate = async () => {
    if (!selectedSupplier) return;
    setLoading(true);
    try {
      const res = await apiClient.post(`/api/com/vendor-scorecards/${selectedSupplier.id}/recalculate`);
      setCurrentScorecard(res.data.data);
      loadInitial(); // Refresh list and summary
    } catch (err) { console.error("Recalculate fail", err); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-full bg-[var(--bg-base)] overflow-hidden animate-in fade-in duration-500">
      
      {/* ── Left Panel: Supplier List ── */}
      <div className="w-80 border-r border-[var(--border)] flex flex-col bg-[var(--bg-surface)]">
        <div className="p-6 border-b border-[var(--border)] space-y-6">
          <Button variant="ghost" onClick={() => setView("RANKING")} className="w-full text-xs">
            ← BACK TO RANKINGS
          </Button>
          <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest px-2">Suppliers</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {suppliers.map(s => (
            <div 
              key={s.id} 
              onClick={() => selectSupplier(s)}
              className={cn(
                "p-5 cursor-pointer transition-all border-b border-[var(--border)]",
                selectedSupplier?.id === s.id ? "bg-[var(--accent-dim)] border-l-4 border-l-[var(--accent)]" : "hover:bg-white/5 border-l-4 border-l-transparent"
              )}
            >
              <div className={cn("font-bold text-sm", selectedSupplier?.id === s.id ? "text-[var(--accent)]" : "text-[var(--text-1)]")}>{s.name}</div>
              <div className="text-[11px] text-[var(--text-3)] mt-1">{s.public_id.substring(0, 8)}... • {s.category || 'General'}</div>
            </div>
          ))}
        </div>
      </div>

        {/* ── Center Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {view === "RANKING" ? (
            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Vendor Scorecard</h1>
                  <p className="text-sm text-[var(--text-3)] mt-1">Performance leaderboard ranked by automated scoring engine</p>
                </div>
              </div>

              {summary && (
                <div className="grid grid-cols-4 gap-6">
                  <KpiCard label="EXCELLENT (>=90)" value={summary.excellent} />
                  <KpiCard label="GOOD (70-89)" value={summary.good} />
                  <KpiCard label="NEEDS IMPROVEMENT" value={summary.needs_improvement} />
                  <KpiCard label="CRITICAL (<50)" value={summary.critical} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {scorecards.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-[var(--border)]">
                    <div className="text-4xl mb-4 opacity-20">🏆</div>
                    <div className="text-sm font-bold text-[var(--text-3)]">No scorecard records found.</div>
                  </div>
                ) : scorecards.map((s, idx) => (
                  <Card key={s.id} className="hover:border-[var(--accent)]/50 transition-all group cursor-pointer" onClick={() => selectSupplier({ id: s.supplier_id, name: s.supplier_name, public_id: s.supplier_code } as any)}>
                    <CardBody className="flex items-center gap-8 py-6 px-8">
                      <div className={cn("text-3xl font-black w-12", idx < 3 ? "text-[var(--accent)]" : "text-white/10")}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-bold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">{s.supplier_name}</div>
                        <div className="text-[10px] text-[var(--text-3)] uppercase tracking-widest mt-1">Orders: {s.total_orders} • {s.supplier_code.substring(0,8)}...</div>
                      </div>
                      
                      <div className="flex gap-8 px-8 border-x border-[var(--border)]">
                        <div className="text-center w-12">
                          <div className="text-base font-bold text-[var(--text-1)]">{Math.round(s.delivery_score)}</div>
                          <div className="text-[8px] font-bold text-[var(--text-4)] uppercase">Deliv</div>
                        </div>
                        <div className="text-center w-12">
                          <div className="text-base font-bold text-[var(--text-1)]">{Math.round(s.quality_score)}</div>
                          <div className="text-[8px] font-bold text-[var(--text-4)] uppercase">Qual</div>
                        </div>
                        <div className="text-center w-12">
                          <div className="text-base font-bold text-[var(--text-1)]">{Math.round(s.compliance_score)}</div>
                          <div className="text-[8px] font-bold text-[var(--text-4)] uppercase">Comp</div>
                        </div>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Auto Score</div>
                        <div className={cn(
                          "text-2xl font-black",
                          s.auto_score >= 90 ? "text-green-500" : s.auto_score >= 70 ? "text-amber-500" : s.auto_score >= 50 ? "text-blue-500" : "text-red-500"
                        )}>
                          {s.auto_score}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-10 border-b border-[var(--border)] bg-[var(--bg-surface)] flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{selectedSupplier?.name}</h1>
                  <p className="text-sm text-[var(--text-3)] mt-1">Automated Performance Scorecard • {selectedSupplier?.public_id}</p>
                </div>
                <Button variant="primary" onClick={handleRecalculate} disabled={loading}>
                  {loading ? "Calculating..." : "Recalculate Score"}
                </Button>
              </div>

              <div className="flex-1 p-10 overflow-y-auto space-y-12">
                {loading && !currentScorecard ? (
                  <div className="h-full flex items-center justify-center text-[var(--text-4)] animate-pulse text-lg font-bold tracking-widest uppercase">
                    Analyzing raw event data...
                  </div>
                ) : !currentScorecard ? (
                  <div className="text-center py-20 text-[var(--text-4)]">
                    <div className="text-4xl mb-4">📊</div>
                    <div>No evaluation records found for this supplier.</div>
                  </div>
                ) : (
                  <div className="space-y-12 pb-20">
                    <Card className="overflow-hidden border-[var(--border)]">
                      <div className="px-8 py-4 bg-white/5 border-b border-[var(--border)] flex justify-between items-center">
                        <div className="text-[11px] font-black text-[var(--accent)] tracking-widest uppercase">
                          CURRENT RATING (WEIGHTED ALGORITHM)
                        </div>
                        <div className="text-[10px] text-[var(--text-3)] uppercase tracking-widest">
                          Last calculated: {currentScorecard.last_calculated ? new Date(currentScorecard.last_calculated).toLocaleString() : 'Never'}
                        </div>
                      </div>

                      <CardBody className="p-0">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-10 border-b border-[var(--border)] items-center">
                          <div className="lg:col-span-2 flex justify-center lg:border-r lg:border-[var(--border)] pr-10">
                            <ScoreGauge size={160} value={currentScorecard.auto_score} label="AUTOMATED SCORE" />
                          </div>
                          <div className="lg:col-span-3 flex justify-around gap-4">
                            <ScoreGauge size={100} value={currentScorecard.delivery_score} label="DELIVERY (40%)" />
                            <ScoreGauge size={100} value={currentScorecard.quality_score} label="QUALITY (35%)" />
                            <ScoreGauge size={100} value={currentScorecard.compliance_score} label="COMPLIANCE (25%)" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 p-10 bg-white/[0.01] border-b border-[var(--border)]">
                          <div className="text-center">
                            <div className="text-2xl font-black text-white">{currentScorecard.total_orders}</div>
                            <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mt-1">Total Orders</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-green-500">{currentScorecard.on_time_count}</div>
                            <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mt-1">On-Time</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-red-500">{currentScorecard.late_count}</div>
                            <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mt-1">Late</div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    <div className="space-y-4">
                      <div className="text-xs font-bold text-[var(--text-4)] uppercase tracking-widest">Recent Performance Events</div>
                      <DataTable
                        columns={[
                          { key: 'recorded_at', header: 'DATE', render: (e) => new Date(e.recorded_at).toLocaleDateString() },
                          { key: 'event_type', header: 'EVENT', render: (e) => <Badge variant={e.event_type.includes('LATE') || e.event_type.includes('FAIL') || e.event_type.includes('BREACH') ? 'red' : 'green'}>{e.event_type}</Badge> },
                          { key: 'reference_code', header: 'REF', mono: true },
                          { key: 'score_impact', header: 'IMPACT', render: (e) => <span className={e.score_impact < 0 ? "text-red-500" : "text-green-500"}>{e.score_impact > 0 ? `+${e.score_impact}` : e.score_impact}</span> },
                          { key: 'notes', header: 'NOTES' },
                        ]}
                        rows={events}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
