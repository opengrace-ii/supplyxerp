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
  period_start: string;
  period_end: string;
  price_score: number;
  delivery_score: number;
  quality_score: number;
  response_score: number;
  overall_score: number;
  price_notes: string;
  delivery_notes: string;
  quality_notes: string;
  response_notes: string;
  evaluated_by: string;
  auto_calculated: boolean;
  created_at: string;
}

interface Ranking {
  rank: number;
  supplier_name: string;
  overall_score: number;
  price_score: number;
  delivery_score: number;
  quality_score: number;
  response_score: number;
  period: string;
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
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"RANKING" | "DETAIL">("RANKING");

  const loadInitial = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        apiClient.get("/api/suppliers"),
        apiClient.get("/api/vendors/scorecard-summary")
      ]);
      setSuppliers(sRes.data.suppliers ?? []);
      setRankings(rRes.data.rankings ?? []);
    } catch (err) { console.error("Initial load fail", err); }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const selectSupplier = async (s: Supplier) => {
    setSelectedSupplier(s);
    setLoading(true);
    setView("DETAIL");
    setScorecards([]);
    try {
      const res = await apiClient.get(`/api/vendors/${s.id}/scorecard`);
      setScorecards(res.data.scorecards ?? []);
    } finally { setLoading(false); }
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
                <p className="text-sm text-[var(--text-3)] mt-1">Performance leaderboard ranked by weighted algorithm</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {rankings.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-[var(--border)]">
                  <div className="text-4xl mb-4 opacity-20">🏆</div>
                  <div className="text-sm font-bold text-[var(--text-3)]">No scorecards recorded yet.</div>
                </div>
              ) : rankings.map(r => (
                <Card key={r.rank} className="hover:border-[var(--accent)]/50 transition-all group">
                  <CardBody className="flex items-center gap-8 py-6 px-8">
                    <div className={cn("text-3xl font-black w-12", r.rank <= 3 ? "text-[var(--accent)]" : "text-white/10")}>
                      #{r.rank}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-[var(--text-1)]">{r.supplier_name}</div>
                      <div className="text-[10px] text-[var(--text-3)] uppercase tracking-widest mt-1">Period: {r.period}</div>
                    </div>
                    
                    <div className="flex gap-8 px-8 border-x border-[var(--border)]">
                      <div className="text-center w-12">
                        <div className="text-base font-bold text-[var(--text-1)]">{Math.round(r.price_score)}</div>
                        <div className="text-[8px] font-bold text-[var(--text-4)] uppercase">Price</div>
                      </div>
                      <div className="text-center w-12">
                        <div className="text-base font-bold text-[var(--text-1)]">{Math.round(r.delivery_score)}</div>
                        <div className="text-[8px] font-bold text-[var(--text-4)] uppercase">Deliv</div>
                      </div>
                      <div className="text-center w-12">
                        <div className="text-base font-bold text-[var(--text-1)]">{Math.round(r.quality_score)}</div>
                        <div className="text-[8px] font-bold text-[var(--text-4)] uppercase">Qual</div>
                      </div>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Overall</div>
                      <div className={cn(
                        "text-2xl font-black",
                        r.overall_score >= 80 ? "text-green-500" : r.overall_score >= 60 ? "text-amber-500" : "text-red-500"
                      )}>
                        {r.overall_score}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-10 border-b border-[var(--border)] bg-[var(--bg-surface)]">
              <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{selectedSupplier?.name}</h1>
              <p className="text-sm text-[var(--text-3)] mt-1">Performance History • {selectedSupplier?.public_id}</p>
            </div>

            <div className="flex-1 p-10 overflow-y-auto space-y-12">
              {loading ? (
                <div className="h-full flex items-center justify-center text-[var(--text-4)] animate-pulse">Analyzing performance data...</div>
              ) : scorecards.length === 0 ? (
                <div className="text-center py-20 text-[var(--text-4)]">
                  <div className="text-4xl mb-4">📊</div>
                  <div>No evaluation records found for this supplier.</div>
                </div>
              ) : (
                <div className="space-y-12">
                  {scorecards.map(s => (
                    <Card key={s.id} className="overflow-hidden border-[var(--border)]">
                      <div className="px-8 py-4 bg-white/5 border-b border-[var(--border)] flex justify-between items-center">
                        <div className="text-[11px] font-black text-[var(--accent)] tracking-widest uppercase">
                          PERIOD: {new Date(s.period_start).toLocaleDateString()} — {new Date(s.period_end).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-[var(--text-3)]">
                          Evaluated by {s.evaluated_by} on {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <CardBody className="p-0">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-10 border-b border-[var(--border)] items-center">
                          <div className="lg:col-span-2 flex justify-center lg:border-r lg:border-[var(--border)] pr-10">
                            <ScoreGauge size={160} value={s.overall_score} label="OVERALL SCORE" />
                          </div>
                          <div className="lg:col-span-3 flex justify-around gap-4">
                            <ScoreGauge size={100} value={s.price_score} label="PRICE" />
                            <ScoreGauge size={100} value={s.delivery_score} label="DELIVERY" />
                            <ScoreGauge size={100} value={s.quality_score} label="QUALITY" />
                            <ScoreGauge size={100} value={s.response_score} label="RESPONSE" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-white/[0.01]">
                          <NoteBox label="Price Analysis" note={s.price_notes} />
                          <NoteBox label="Delivery Performance" note={s.delivery_notes} />
                          <NoteBox label="Quality Assurance" note={s.quality_notes} />
                          <NoteBox label="Responsiveness" note={s.response_notes} />
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
