import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, InlineAlert } from '@/components/ui/Form';
import { cn } from '@/lib/cn';

interface PO {
  id: number;
  po_number: string;
}

interface POLine {
  item_no: number;
  short_text: string;
  quantity: number;
  unit?: string;
}

interface Assignment {
  sequence_no: number;
  acct_assgt_cat: string;
  distribution: string; // '1'=qty, '2'=%
  gl_account: string;
  cost_center: string;
  project_wbs: string;
  quantity?: number;
  percentage?: number;
}

export const POAccountAssignment: React.FC = () => {
  const [pos, setPos] = useState<PO[]>([]);
  const [selectedPO, setSelectedPO] = useState<number | null>(null);
  const [lines, setLines] = useState<POLine[]>([]);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load PO list on mount
  useEffect(() => {
    apiClient.get("/api/purchase-orders?limit=100")
      .then(res => setPos(res.data.purchase_orders || []))
      .catch(console.error);
  }, []);

  // Load lines for selected PO
  useEffect(() => {
    if (!selectedPO) {
      setLines([]);
      setSelectedItem(null);
      return;
    }
    apiClient.get(`/api/purchase-orders/${selectedPO}`)
      .then(res => {
        setLines(res.data.lines || []);
        if (res.data.lines?.length > 0) setSelectedItem(res.data.lines[0].item_no);
      })
      .catch(console.error);
  }, [selectedPO]);

  // Load assignments for selected item
  const loadAssignments = useCallback(async () => {
    if (!selectedPO || !selectedItem) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/po/${selectedPO}/items/${selectedItem}/account-assignments`);
      if (res.data.assignments?.length > 0) {
        setAssignments(res.data.assignments);
      } else {
        setAssignments([{
          sequence_no: 1,
          acct_assgt_cat: 'K',
          distribution: '2',
          gl_account: '',
          cost_center: '',
          project_wbs: '',
          percentage: 100
        }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedPO, selectedItem]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const updateLine = (idx: number, patch: Partial<Assignment>) => {
    setAssignments(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };

  const addLine = () => {
    const nextSeq = (assignments[assignments.length - 1]?.sequence_no || 0) + 1;
    setAssignments([...assignments, {
      sequence_no: nextSeq,
      acct_assgt_cat: 'K',
      distribution: assignments[0]?.distribution || '2',
      gl_account: '',
      cost_center: '',
      project_wbs: '',
      percentage: 0
    }]);
  };

  const removeLine = (idx: number) => {
    if (assignments.length === 1) return;
    setAssignments(assignments.filter((_, i) => i !== idx));
  };

  const totalPct = useMemo(() => assignments.reduce((s, a) => s + (a.percentage || 0), 0), [assignments]);
  const distribution = assignments[0]?.distribution || '2';

  const handleSave = async () => {
    if (!selectedPO || !selectedItem) return;
    setError(null);
    setSaveSuccess(false);

    if (distribution === '2' && totalPct > 100.01) {
      setError(`Invalid distribution: Total percentage (${totalPct}%) exceeds 100%.`);
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(`/api/po/${selectedPO}/items/${selectedItem}/account-assignments`, { assignments });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Account Assignment</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Financial allocation · G/L mapping · Cost center distribution</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={loadAssignments}>RELOAD</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="PURCHASE ORDER">
          <Select value={selectedPO || ""} onChange={e => setSelectedPO(Number(e.target.value))}>
            <option value="">Select PO...</option>
            {pos.map(po => <option key={po.id} value={po.id}>{po.po_number}</option>)}
          </Select>
        </Field>
        <Field label="LINE ITEM">
          <Select 
            value={selectedItem || ""} 
            onChange={e => setSelectedItem(Number(e.target.value))}
            disabled={!selectedPO}
          >
            {lines.map(l => <option key={l.item_no} value={l.item_no}>{l.item_no} — {l.short_text}</option>)}
          </Select>
        </Field>
      </div>

      {error && <InlineAlert type="error" message={error} />}
      {saveSuccess && <InlineAlert type="success" message="Account assignments updated successfully." />}

      <Card>
        <CardHeader title="Account Distribution">
          <div className="flex justify-between items-center w-full">
            <div className="flex bg-white/5 p-1 rounded-lg">
                {[
                  { id: '1', label: 'BY QTY' },
                  { id: '2', label: 'BY %' }
                ].map(mode => (
                  <button 
                    key={mode.id}
                    onClick={() => setAssignments(prev => prev.map(a => ({ ...a, distribution: mode.id })))}
                    className={cn(
                      "px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                      distribution === mode.id ? "bg-[var(--accent)] text-black shadow-lg" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
            </div>
            {distribution === '2' && (
              <div className={cn("text-xs font-black px-4 py-1.5 rounded-full bg-white/5 border border-[var(--border)]", totalPct > 100 ? "text-red-500" : (totalPct === 100 ? "text-green-500" : "text-amber-500"))}>
                TOTAL: {totalPct.toFixed(1)}%
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={[
              { 
                key: 'cat', 
                header: 'CAT', 
                width: '120px',
                render: (a, i) => (
                  <Select 
                    value={a.acct_assgt_cat} 
                    onChange={e => updateLine(i!, { acct_assgt_cat: e.target.value })}
                    className="h-9 text-xs"
                  >
                    <option value="K">K (Cost Center)</option>
                    <option value="C">C (Sales Order)</option>
                    <option value="F">F (Order)</option>
                    <option value="P">P (Project)</option>
                    <option value="A">A (Asset)</option>
                  </Select>
                )
              },
              { 
                key: 'gl', 
                header: 'G/L ACCOUNT', 
                render: (a, i) => (
                  <Input 
                    value={a.gl_account} 
                    onChange={e => updateLine(i!, { gl_account: e.target.value })} 
                    placeholder="400000" 
                    className="h-9 text-xs font-mono"
                  />
                )
              },
              { 
                key: 'cc', 
                header: 'COST CENTER', 
                render: (a, i) => (
                  <Input 
                    value={a.cost_center} 
                    onChange={e => updateLine(i!, { cost_center: e.target.value })} 
                    placeholder="1000" 
                    className="h-9 text-xs font-mono"
                  />
                )
              },
              { 
                key: 'wbs', 
                header: 'WBS ELEMENT', 
                render: (a, i) => (
                  <Input 
                    value={a.project_wbs} 
                    onChange={e => updateLine(i!, { project_wbs: e.target.value })} 
                    placeholder="PRJ-001" 
                    className="h-9 text-xs font-mono"
                  />
                )
              },
              { 
                key: 'val', 
                header: distribution === '2' ? 'PERCENT' : 'QUANTITY', 
                width: '100px',
                render: (a, i) => (
                  <Input 
                    type="number"
                    value={distribution === '2' ? a.percentage : a.quantity} 
                    onChange={e => updateLine(i!, distribution === '2' ? { percentage: Number(e.target.value) } : { quantity: Number(e.target.value) })}
                    className="h-9 text-xs font-bold text-right"
                  />
                )
              },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (a, i) => (
                  <button onClick={() => removeLine(i!)} className="text-[var(--text-4)] hover:text-red-500 transition-colors text-lg px-2">
                    &times;
                  </button>
                )
              }
            ]}
            rows={assignments}
            loading={loading}
          />

          <div className="flex gap-3 pt-8 border-t border-[var(--border)] mt-8">
            <Button variant="ghost" onClick={addLine}>+ ADD ASSIGNMENT</Button>
            <Button variant="primary" className="px-8" onClick={handleSave} disabled={saving || !selectedItem}>
              {saving ? "SAVING..." : "SAVE ASSIGNMENTS"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="p-6 bg-[var(--accent-dim)] rounded-2xl border border-[var(--accent)]/10 space-y-3">
        <h4 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Allocation Rules</h4>
        <ul className="text-xs text-[var(--text-3)] space-y-1 list-disc pl-4">
          <li><span className="text-[var(--text-2)] font-bold">Percentage:</span> Sum must equal exactly 100%.</li>
          <li><span className="text-[var(--text-2)] font-bold">Quantity:</span> Sum must equal total PO item quantity.</li>
          <li><span className="text-[var(--text-2)] font-bold">G/L Account:</span> Required for all non-inventory financial postings.</li>
        </ul>
      </div>
    </div>
  );
};

export default POAccountAssignment;
