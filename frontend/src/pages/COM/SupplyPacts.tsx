import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea, InlineAlert } from "@/components/ui/Form";
import { KpiCard } from "@/components/ui/KpiCard";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplyPact {
  id: number;
  pact_number: string;
  pact_type: string;
  supplier_id: number;
  supplier_name: string;
  status: string;
  validity_start: string;
  validity_end: string;
  currency: string;
  target_value: number | null;
  target_qty: number | null;
  target_unit: string | null;
  released_value: number;
  released_qty: number;
  created_at: string;
}

interface PactLine {
  id: number;
  line_no: number;
  material_id: number;
  material_code: string;
  material_name: string;
  description: string;
  target_qty: number;
  unit_of_measure: string;
  agreed_price: number;
  currency: string;
  released_qty: number;
  open_qty: number;
}

interface PactRelease {
  id: number;
  pact_line_no: number;
  po_id: number;
  po_number: string;
  released_qty: number;
  released_value: number;
  release_date: string;
  created_by: string;
}

export default function SupplyPacts() {
  const [pacts, setPacts] = useState<SupplyPact[]>([]);
  const [selectedPact, setSelectedPact] = useState<SupplyPact | null>(null);
  const [lines, setLines] = useState<PactLine[]>([]);
  const [releases, setReleases] = useState<PactRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("LINES"); // LINES, RELEASES, SCHEDULE

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: "",
    pact_type: "SCHEDULE",
    validity_start: "",
    validity_end: "",
    currency: "USD",
    target_qty: "",
    target_value: "",
    target_unit: "",
    payment_terms: "",
    notes: ""
  });

  const apiFetch = useCallback((url: string, opts: any = {}) => {
    return fetch(url, { ...opts, credentials: "include" });
  }, []);

  const loadPacts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/supply-pacts");
      const d = await res.json();
      setPacts(d.supply_pacts ?? []);
    } catch (err) { console.error("Pacts load fail", err); }
  }, [apiFetch]);

  useEffect(() => { loadPacts(); }, [loadPacts]);

  const selectPact = async (p: SupplyPact) => {
    setSelectedPact(p);
    setLoading(true);
    setLines([]);
    setReleases([]);
    try {
      const res = await apiFetch(`/api/supply-pacts/${p.id}`);
      const d = await res.json();
      setLines(d.lines ?? []);
      
      const relRes = await apiFetch(`/api/supply-pacts/${p.id}/releases`);
      const relD = await relRes.json();
      setReleases(relD.releases ?? []);
    } finally { setLoading(false); }
  };

  const openModal = async () => {
    setShowModal(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/api/suppliers");
      const d = await res.json();
      setSuppliers(d.suppliers ?? []);
    } catch (err) {
      setErrorMsg("Failed to load suppliers.");
    }
  };

  const handleCreatePact = async () => {
    try {
      setErrorMsg(null);
      const payload = {
        supplier_id: parseInt(formData.supplier_id),
        pact_type: formData.pact_type,
        validity_start: formData.validity_start,
        validity_end: formData.validity_end,
        currency: formData.currency,
        target_qty: formData.pact_type === "VOLUME" ? parseFloat(formData.target_qty) : null,
        target_value: formData.pact_type === "SPEND_CAP" ? parseFloat(formData.target_value) : null,
        target_unit: (formData.pact_type === "VOLUME" || formData.pact_type === "SCHEDULE") ? formData.target_unit : null,
        payment_terms: formData.payment_terms,
        notes: formData.notes
      };

      const res = await apiFetch("/api/supply-pacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create supply pact");
      }
      
      setShowModal(false);
      loadPacts();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const getBadgeVariant = (s: string): "green" | "amber" | "red" | "blue" | "gray" => {
    switch (s) {
      case "ACTIVE": return "green";
      case "DRAFT": return "gray";
      case "FULFILLED": return "blue";
      case "CANCELLED": return "red";
      default: return "gray";
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      
      {/* ── Left Panel: Pact List ── */}
      <div className="w-[320px] border-r border-[var(--border)] flex flex-col bg-white/[0.01]">
        <div className="p-4 space-y-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--accent)] tracking-tight">Supply Pacts</h2>
            <div className="text-sm text-[var(--text-3)] mt-0.5">Long-term Supplier Agreements</div>
          </div>
          <Button variant="primary" className="w-full" onClick={openModal}>
            + New Supply Pact
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {pacts.length === 0 ? (
            <div className="p-10 text-center text-xs text-[var(--text-3)]">
              No supply pacts found.
            </div>
          ) : pacts.map(p => (
            <button 
              key={p.id} 
              className={cn(
                "w-full text-left p-4 border-b border-[var(--border)] transition-colors",
                selectedPact?.id === p.id ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.02]"
              )}
              onClick={() => selectPact(p)}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-sm text-[var(--accent)]">{p.pact_number}</span>
                <Badge variant={getBadgeVariant(p.status)}>{p.status}</Badge>
              </div>
              <div className="text-sm font-semibold text-[var(--text-1)]">{p.supplier_name}</div>
              <div className="text-[11px] text-[var(--text-3)] mt-1.5 flex gap-2 items-center">
                <span>{p.pact_type}</span>
                <span className="opacity-30">•</span>
                <span>Ends {new Date(p.validity_end).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Center Panel: Pact Detail ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-base)]">
        {!selectedPact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-4)]">
            <div className="text-5xl mb-6 opacity-40">🤝</div>
            <h2 className="text-xl font-bold text-[var(--accent)] tracking-tight">Supply Pact Management</h2>
            <p className="text-sm mt-2">Select a pact from the list to view details</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-8 border-b border-[var(--border)] bg-white/[0.02]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--accent)]">{selectedPact.pact_number}</h1>
                    <Badge variant="blue" className="px-3 py-1 text-xs">{selectedPact.pact_type}</Badge>
                    <Badge variant={getBadgeVariant(selectedPact.status)} className="px-3 py-1 text-xs">{selectedPact.status}</Badge>
                  </div>
                  <div className="text-lg font-medium text-[var(--text-2)]">{selectedPact.supplier_name}</div>
                </div>
                <div className="flex gap-2">
                  {selectedPact.status === 'DRAFT' && (
                    <Button variant="primary" onClick={async () => {
                      await apiFetch(`/api/supply-pacts/${selectedPact.id}/activate`, { method: 'PUT' });
                      loadPacts();
                      selectPact(selectedPact);
                    }}>Activate Pact</Button>
                  )}
                  <Button variant="ghost">Print PDF</Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-8">
                <KpiCard label="VALIDITY PERIOD" value={`${new Date(selectedPact.validity_start).toLocaleDateString()}`} delta={`until ${new Date(selectedPact.validity_end).toLocaleDateString()}`} />
                <KpiCard label="CURRENCY" value={selectedPact.currency} />
                <KpiCard label="TARGET" value={selectedPact.pact_type === 'VOLUME' ? `${selectedPact.target_qty} ${selectedPact.target_unit}` : selectedPact.pact_type === 'SPEND_CAP' ? `${selectedPact.currency} ${selectedPact.target_value}` : 'Schedule'} />
                <KpiCard label="FULFILLMENT" value={`${((selectedPact.pact_type === 'VOLUME' ? (selectedPact.released_qty / (selectedPact.target_qty || 1)) : (selectedPact.released_value / (selectedPact.target_value || 1))) * 100).toFixed(1)}%`} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] px-8">
              {[
                { key: 'LINES', label: 'AGREED LINES' },
                { key: 'RELEASES', label: 'DEAL RELEASES' },
                ...(selectedPact.pact_type === 'SCHEDULE' ? [{ key: 'SCHEDULE', label: 'DELIVERY SCHEDULE' }] : [])
              ].map(tab => (
                <button
                  key={tab.key}
                  className={cn(
                    "px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all relative top-px",
                    activeTab === tab.key ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                  )}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === "LINES" && (
                <Card>
                  <CardBody>
                    <DataTable
                      columns={[
                        { key: 'line_no', header: 'LINE', width: '60px' },
                        { key: 'material_code', header: 'MATERIAL', mono: true },
                        { key: 'description', header: 'DESCRIPTION' },
                        { key: 'agreed_price', header: 'AGREED PRICE', render: (l) => `${l.currency} ${l.agreed_price}` },
                        { key: 'target_qty', header: 'TARGET', render: (l) => `${l.target_qty} ${l.unit_of_measure}` },
                        { key: 'released_qty', header: 'RELEASED' },
                        { key: 'open_qty', header: 'OPEN' },
                      ]}
                      rows={lines}
                    />
                  </CardBody>
                </Card>
              )}

              {activeTab === "RELEASES" && (
                <Card>
                  <CardBody>
                    <DataTable
                      columns={[
                        { key: 'release_date', header: 'DATE', render: (r) => new Date(r.release_date).toLocaleDateString() },
                        { key: 'po_number', header: 'PO NUMBER', mono: true },
                        { key: 'pact_line_no', header: 'LINE', render: (r) => `Line ${r.pact_line_no}` },
                        { key: 'released_qty', header: 'QTY' },
                        { key: 'released_value', header: 'VALUE', render: (r) => `${selectedPact.currency} ${r.released_value}` },
                        { key: 'created_by', header: 'BY' },
                      ]}
                      rows={releases}
                    />
                  </CardBody>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        title="New Supply Pact" 
        subtitle="Create a long-term agreement with a supplier"
      >
        <div className="space-y-4">
          {errorMsg && <InlineAlert type="error" message={errorMsg} />}
          
          <Field label="Supplier">
            <Select value={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}>
              <option value="">Select Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Pact Type">
              <Select value={formData.pact_type} onChange={e => setFormData({ ...formData, pact_type: e.target.value })}>
                <option value="SCHEDULE">Schedule</option>
                <option value="VOLUME">Volume Deal</option>
                <option value="SPEND_CAP">Spend Cap Deal</option>
              </Select>
            </Field>
            <Field label="Currency">
              <Input value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Validity Start">
              <Input type="date" value={formData.validity_start} onChange={e => setFormData({ ...formData, validity_start: e.target.value })} />
            </Field>
            <Field label="Validity End">
              <Input type="date" value={formData.validity_end} onChange={e => setFormData({ ...formData, validity_end: e.target.value })} />
            </Field>
          </div>

          {formData.pact_type === "VOLUME" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Qty">
                <Input type="number" value={formData.target_qty} onChange={e => setFormData({ ...formData, target_qty: e.target.value })} />
              </Field>
              <Field label="Unit">
                <Input type="text" value={formData.target_unit} onChange={e => setFormData({ ...formData, target_unit: e.target.value })} />
              </Field>
            </div>
          )}

          {formData.pact_type === "SPEND_CAP" && (
            <Field label="Target Value">
              <Input type="number" value={formData.target_value} onChange={e => setFormData({ ...formData, target_value: e.target.value })} />
            </Field>
          )}

          {formData.pact_type === "SCHEDULE" && (
            <Field label="Unit">
              <Input type="text" value={formData.target_unit} onChange={e => setFormData({ ...formData, target_unit: e.target.value })} />
            </Field>
          )}

          <Field label="Payment Terms">
            <Input type="text" value={formData.payment_terms} onChange={e => setFormData({ ...formData, payment_terms: e.target.value })} />
          </Field>

          <Field label="Notes">
            <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          </Field>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreatePact}>Create Supply Pact</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
