import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "@/components/ui/KpiCard";
import { Field, Input, InlineAlert } from "@/components/ui/Form";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Formula {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
}

interface PriceRule {
  id: number;
  sequence: number;
  rule_name: string;
  rule_type: string;
  calc_method: string;
  sign: string;
  is_mandatory: boolean;
  is_statistical: boolean;
  from_step: number | null;
}

export default function PriceFormulas() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const apiFetch = useCallback((url: string, opts: any = {}) => {
    return fetch(url, { ...opts, credentials: "include" });
  }, []);

  const loadFormulas = useCallback(async () => {
    try {
      const res = await apiFetch("/api/price-formulas");
      const d = await res.json();
      setFormulas(d ?? []);
    } catch (err) { console.error("Formulas load fail", err); }
  }, [apiFetch]);

  useEffect(() => { loadFormulas(); }, [loadFormulas]);

  const selectFormula = async (f: Formula) => {
    setSelectedFormula(f);
    setLoading(true);
    setRules([]);
    setSaveStatus(null);
    try {
      const res = await apiFetch(`/api/price-formulas/${f.id}`);
      const d = await res.json();
      setRules(d.rules ?? []);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selectedFormula) return;
    try {
      const res = await apiFetch(`/api/price-formulas/${selectedFormula.id}/rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules })
      });
      if (res.ok) {
        setSaveStatus({ type: 'success', message: 'Formula rules updated successfully' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({ type: 'error', message: 'Failed to update formula rules' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Failed to update formula rules' });
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      
      {/* ── Left Panel: Formula List ── */}
      <div className="w-[300px] border-r border-[var(--border)] flex flex-col bg-white/[0.01]">
        <div className="p-4 border-b border-[var(--border)] space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-1)]">Price Formulas</h2>
          <div className="text-xs text-[var(--text-3)]">Define calculation procedures</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {formulas.map(f => (
            <button 
              key={f.id} 
              className={cn(
                "w-full text-left p-4 border-b border-[var(--border)] transition-colors",
                selectedFormula?.id === f.id ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.02]"
              )}
              onClick={() => selectFormula(f)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={cn(
                  "font-bold text-sm",
                  selectedFormula?.id === f.id ? "text-[var(--accent)]" : "text-[var(--text-1)]"
                )}>{f.name}</span>
                {f.is_default && <Badge variant="green">DEFAULT</Badge>}
              </div>
              <div className="text-[11px] text-[var(--text-3)] line-clamp-2">{f.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Center Panel: Formula Rules ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-base)]">
        {!selectedFormula ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-4)]">
            <div className="text-5xl mb-6 opacity-40">🏷️</div>
            <h2 className="text-xl font-bold text-[var(--text-3)]">Price Formula Configuration</h2>
            <p className="text-sm mt-2">Select a formula to define calculation steps</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight text-white/95">{selectedFormula.name}</h1>
                  {selectedFormula.is_default && <Badge variant="blue">SYSTEM DEFAULT</Badge>}
                </div>
                <p className="text-sm text-[var(--text-2)]">{selectedFormula.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="primary" onClick={handleSave}>Save Procedure</Button>
              </div>
            </div>

            {saveStatus && <InlineAlert type={saveStatus.type} message={saveStatus.message} />}

            <Card className="mt-6">
              <CardBody>
                <DataTable
                  columns={[
                    { key: 'sequence', header: 'STEP', width: '60px' },
                    { key: 'rule_name', header: 'RULE NAME' },
                    { 
                      key: 'rule_type', 
                      header: 'TYPE',
                      render: (r) => (
                        <span className={cn(
                          "text-[10px] font-bold tracking-widest uppercase",
                          r.rule_type === 'BASE' ? "text-[var(--accent)]" : "text-[var(--text-3)]"
                        )}>{r.rule_type}</span>
                      )
                    },
                    { 
                      key: 'calc_method', 
                      header: 'METHOD',
                      render: (r) => r.calc_method === 'PCT' ? 'Percentage' : r.calc_method === 'FIXED' ? 'Fixed Amount' : 'Per Unit'
                    },
                    { 
                      key: 'sign', 
                      header: 'SIGN',
                      render: (r) => (
                        <span className={cn(
                          "text-lg font-bold",
                          r.sign === '+' ? "text-green-400" : "text-red-400"
                        )}>{r.sign}</span>
                      )
                    },
                    { key: 'from_step', header: 'FROM', render: (r) => r.from_step || '—' },
                    { 
                      key: 'props', 
                      header: 'PROPERTIES',
                      render: (r) => (
                        <div className="flex gap-2">
                          {r.is_mandatory && <Badge variant="red">REQ</Badge>}
                          {r.is_statistical && <Badge variant="gray">STAT</Badge>}
                        </div>
                      )
                    },
                  ]}
                  rows={rules}
                />
                
                <div className="mt-6 flex justify-center">
                  <Button variant="ghost" className="w-full border-dashed border-[var(--border)] hover:border-[var(--accent)] text-[var(--accent)]">
                    + Insert New Step
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Simulation Console */}
            <div className="mt-12 space-y-4">
              <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--text-3)]">Simulation Console</h3>
              <Card>
                <CardBody className="grid grid-cols-3 gap-6 items-end">
                  <Field label="BASE PRICE">
                    <Input type="number" defaultValue="100.00" />
                  </Field>
                  <Field label="QUANTITY">
                    <Input type="number" defaultValue="1" />
                  </Field>
                  <Button variant="secondary" className="w-full h-9">Run Calculation Test</Button>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
