import React, { useState, useEffect, useCallback } from 'react';
import { api, apiClient } from '../../api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea, InlineAlert } from '@/components/ui/Form';
import { SectionTabs } from '@/components/ui/SectionTabs';
import { cn } from '@/lib/cn';

interface RFQManagementProps {
    products: any[];
    suppliers: any[];
    onViewDoc: (doc: any) => void;
}

export function RFQManagement({ products: propProducts = [], suppliers: propSuppliers = [], onViewDoc = () => {} }: Partial<RFQManagementProps>) {
    const [rfqs, setRFQs] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>(propProducts);
    const [suppliers, setSuppliers] = useState<any[]>(propSuppliers);
    const [subTab, setSubTab] = useState<'LIST' | 'CREATE' | 'DETAIL'>('LIST');
    const [selectedRFQ, setSelectedRFQ] = useState<any>(null);
    const [rfqLines, setRFQLines] = useState<any[]>([]);
    const [rfqVendors, setRFQVendors] = useState<any[]>([]);
    const [rfqQuotations, setRFQQuotations] = useState<any[]>([]);
    const [comparison, setComparison] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Config Data
    const [rfqTypes, setRFQTypes] = useState<any[]>([]);
    const [orderReasons, setOrderReasons] = useState<any[]>([]);
    const [procUnits, setProcUnits] = useState<any[]>([]);
    const [procTeams, setProcTeams] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);

    // Modals
    const [showFinaliseModal, setShowFinaliseModal] = useState<number | null>(null);

    const [newRFQ, setNewRFQ] = useState({
        rfq_type: 'AN',
        collective_number: '',
        procurement_unit_id: 0,
        procurement_team_id: 0,
        requesting_site_id: 0,
        deadline_date: '',
        validity_start: '',
        validity_end: '',
        apply_by_date: '',
        binding_days: 30,
        your_reference: '',
        our_reference: '',
        salesperson: '',
        telephone: '',
        notes: '',
        lines: [{ 
            product_id: 0, 
            quantity: 0, 
            unit: 'KG', 
            short_text: '', 
            required_by_date: '',
            item_category: '',
            storage_location: '',
            material_group: '',
            req_tracking_no: '',
            planned_deliv_days: 0,
            reason_for_order: '',
            delivery_schedule: [] as any[]
        }]
    });

    const [quoteForm, setQuoteForm] = useState({
        vendor_id: 0,
        document_date: new Date().toISOString().split('T')[0],
        valid_to: '',
        binding_until: '',
        currency: 'GBP',
        your_reference: '',
        warranty_terms: '',
        lines: [] as any[]
    });

    const fetchConfig = useCallback(async () => {
        try {
            const [types, reasons] = await Promise.all([
                api.getRFQTypes(),
                api.getOrderReasons()
            ]);
            setRFQTypes(types || []);
            setOrderReasons(reasons || []);
            
            if (products.length === 0) {
                const pData = await api.getProducts(200, 0);
                setProducts(pData.products || []);
            }
            
            if (suppliers.length === 0) {
                const sData = await api.listSuppliers();
                setSuppliers(sData.suppliers || []);
            }

            const [puRes, ptRes, siteRes] = await Promise.allSettled([
                apiClient.get('/api/org/procurement-units'),
                apiClient.get('/api/org/procurement-teams'),
                apiClient.get('/api/org/sites'),
            ]);
            if (puRes.status === 'fulfilled') setProcUnits((puRes.value as any).data?.procurement_units || []);
            if (ptRes.status === 'fulfilled') setProcTeams((ptRes.value as any).data?.procurement_teams || []);
            if (siteRes.status === 'fulfilled') setSites((siteRes.value as any).data?.sites || []);
        } catch (err) { console.error(err); }
    }, [products.length, suppliers.length]);

    const fetchRFQs = useCallback(async (status?: string, collNo?: string) => {
        setLoading(true);
        try {
            const data = await api.listRFQs({ status, collNo });
            setRFQs(data.rfqs || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { 
        fetchRFQs(); 
        fetchConfig();
    }, [fetchRFQs, fetchConfig]);

    const handleSelectRFQ = async (rfq: any) => {
        setSelectedRFQ(rfq);
        setSubTab('DETAIL');
        setComparison(null);
        setRFQLines([]);
        setRFQVendors([]);
        setRFQQuotations([]);
        try {
            const data = await api.getRFQ(rfq.id);
            setRFQLines(data.lines || []);
            setRFQVendors(data.vendors || []);
            
            setQuoteForm(prev => ({
                ...prev,
                lines: (data.lines || []).map((l: any) => ({
                    rfq_line_id: l.id,
                    quantity_offered: l.quantity,
                    gross_price: 0,
                    discount_pct: 0,
                    freight_value: 0,
                    tax_code: 'V1',
                    delivery_date_offered: l.required_by_date?.Valid ? new Date(l.required_by_date.Time).toISOString().split('T')[0] : '',
                    notes: ''
                }))
            }));

            const qData = await api.getRFQQuotations(rfq.id);
            setRFQQuotations(qData || []);
        } catch (err) { console.error(err); }
    };

    const handleCreateRFQ = async () => {
        setError(null);
        try {
            await api.createRFQ(newRFQ);
            setSubTab('LIST');
            fetchRFQs();
        } catch (err: any) { 
            setError(err.response?.data?.error || "Failed to create RFQ"); 
        }
    };

    const handleInviteVendor = async (vendorId: number) => {
        if (!selectedRFQ || vendorId === 0) return;
        try {
            await api.inviteRFQVendors(selectedRFQ.id, [vendorId]);
            const data = await api.getRFQ(selectedRFQ.id);
            setRFQVendors(data.vendors || []);
        } catch (err) { setError("Invitation failed"); }
    };

    const handleEnterQuotation = async () => {
        if (!selectedRFQ) return;
        setError(null);
        try {
            await api.enterRFQQuotation(selectedRFQ.id, quoteForm);
            const qData = await api.getRFQQuotations(selectedRFQ.id);
            setRFQQuotations(qData || []);
        } catch (err: any) { 
            setError(err.response?.data?.error || "Quotation submission failed"); 
        }
    };

    const handleCompare = async (basis: string = 'MIN') => {
        if (!selectedRFQ) return;
        try {
            const data = await api.compareRFQQuotations(selectedRFQ.id, basis);
            setComparison(data);
        } catch (err) { console.error(err); }
    };

    const handleFinalise = async () => {
        if (!selectedRFQ || !showFinaliseModal) return;
        try {
            await api.finaliseRFQ(selectedRFQ.id, showFinaliseModal);
            setShowFinaliseModal(null);
            setSubTab('LIST');
            fetchRFQs();
        } catch (err) { setError("Finalisation failed"); }
    };

    const addLine = () => {
        setNewRFQ({ 
            ...newRFQ, 
            lines: [...newRFQ.lines, { 
                product_id: 0, quantity: 1, unit: 'KG', short_text: '', required_by_date: '',
                item_category: '', storage_location: '', material_group: '', req_tracking_no: '',
                planned_deliv_days: 0, reason_for_order: '', delivery_schedule: []
            }] 
        });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-6 overflow-y-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">RFQ Management</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">Sourcing pipeline · Vendor quotations · Comparison engine</p>
                </div>
            </div>

            <SectionTabs
                tabs={[
                    { key: 'LIST', label: 'All RFQs' },
                    { key: 'CREATE', label: '+ Create RFQ' },
                    ...(selectedRFQ ? [{ key: 'DETAIL', label: `Current: ${selectedRFQ.rfq_number}` }] : [])
                ]}
                active={subTab}
                onChange={(key) => setSubTab(key as any)}
            />

            {error && <InlineAlert type="error" message={error} className="mb-6" />}

            {subTab === 'LIST' && (
                <Card>
                    <CardHeader title="Sourcing Pipeline">
                         <Input 
                            placeholder="Filter by Collective Number..." 
                            className="max-w-xs"
                            onChange={e => fetchRFQs(undefined, e.target.value)}
                         />
                    </CardHeader>
                    <CardBody>
                        <DataTable
                            columns={[
                                { key: 'rfq_number', header: 'RFQ NUMBER', mono: true, className: 'text-[var(--accent)] font-bold' },
                                { key: 'rfq_type', header: 'TYPE', width: '80px' },
                                { key: 'collective_number', header: 'COLL. NO', render: (r) => r.collective_number?.String || '-', className: 'opacity-50' },
                                { 
                                    key: 'status', 
                                    header: 'STATUS', 
                                    render: (r) => <Badge variant="amber">{r.status}</Badge> 
                                },
                                { key: 'deadline_date', header: 'DEADLINE', render: (r) => r.deadline_date?.Valid ? new Date(r.deadline_date.Time).toLocaleDateString() : 'N/A' },
                                {
                                    key: 'actions',
                                    header: '',
                                    className: 'text-right',
                                    render: (r) => <Button variant="ghost" size="sm" onClick={() => handleSelectRFQ(r)}>👁️ Details</Button>
                                }
                            ]}
                            rows={rfqs}
                            loading={loading}
                        />
                    </CardBody>
                </Card>
            )}

            {subTab === 'CREATE' && (
                <div className="max-w-4xl mx-auto">
                    <Card>
                        <CardHeader title="New Request for Quotation" />
                        <CardBody className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Field label="RFQ TYPE">
                                    <Select value={newRFQ.rfq_type} onChange={e => setNewRFQ({...newRFQ, rfq_type: e.target.value})}>
                                        {rfqTypes?.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
                                    </Select>
                                </Field>
                                <Field label="COLLECTIVE #">
                                    <Input value={newRFQ.collective_number} onChange={e => setNewRFQ({...newRFQ, collective_number: e.target.value.toUpperCase()})} placeholder="SEASONAL-2024" />
                                </Field>
                                <Field label="PROC. UNIT">
                                    <Select value={newRFQ.procurement_unit_id} onChange={e => setNewRFQ({...newRFQ, procurement_unit_id: Number(e.target.value)})}>
                                        <option value={0}>— Select —</option>
                                        {procUnits?.map((u: any) => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                                    </Select>
                                </Field>
                                <Field label="PROC. TEAM">
                                    <Select value={newRFQ.procurement_team_id} onChange={e => setNewRFQ({...newRFQ, procurement_team_id: Number(e.target.value)})}>
                                        <option value={0}>— Select —</option>
                                        {procTeams?.map((t: any) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                                    </Select>
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Field label="DEADLINE"><Input type="date" value={newRFQ.deadline_date} onChange={e => setNewRFQ({...newRFQ, deadline_date: e.target.value})} /></Field>
                                <Field label="START"><Input type="date" value={newRFQ.validity_start} onChange={e => setNewRFQ({...newRFQ, validity_start: e.target.value})} /></Field>
                                <Field label="END"><Input type="date" value={newRFQ.validity_end} onChange={e => setNewRFQ({...newRFQ, validity_end: e.target.value})} /></Field>
                                <Field label="BINDING DAYS"><Input type="number" value={newRFQ.binding_days} onChange={e => setNewRFQ({...newRFQ, binding_days: parseInt(e.target.value)})} /></Field>
                            </div>

                            <Field label="RFQ NOTES"><Textarea value={newRFQ.notes} onChange={e => setNewRFQ({...newRFQ, notes: e.target.value})} className="h-24" /></Field>

                            <div className="space-y-4 pt-6 border-t border-[var(--border)]">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">Line Items</h4>
                                    <Button variant="ghost" size="sm" onClick={addLine}>+ Add Line</Button>
                                </div>
                                {newRFQ.lines.map((l, i) => (
                                    <div key={i} className="p-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border)] space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Select value={l.product_id} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].product_id = parseInt(e.target.value);
                                                setNewRFQ({ ...newRFQ, lines });
                                            }}>
                                                <option value={0}>Select Product...</option>
                                                {products?.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                                            </Select>
                                            <Input type="number" placeholder="Quantity" value={l.quantity} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].quantity = parseFloat(e.target.value);
                                                setNewRFQ({ ...newRFQ, lines });
                                            }} />
                                            <Input type="date" value={l.required_by_date} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].required_by_date = e.target.value;
                                                setNewRFQ({ ...newRFQ, lines });
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-6">
                                <Button variant="primary" className="flex-1" onClick={handleCreateRFQ}>PUBLISH RFQ</Button>
                                <Button variant="ghost" className="flex-1" onClick={() => setSubTab('LIST')}>CANCEL</Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {subTab === 'DETAIL' && selectedRFQ && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        <Card>
                            <CardBody className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black text-[var(--text-1)]">{selectedRFQ.rfq_number}</h3>
                                        <div className="text-[11px] text-[var(--text-3)] mt-1 uppercase tracking-widest font-bold">
                                            {selectedRFQ.rfq_type} · COLL: {selectedRFQ.collective_number?.String || 'N/A'}
                                        </div>
                                    </div>
                                    <Badge variant="amber" className="text-sm px-4 py-1">{selectedRFQ.status}</Badge>
                                </div>

                                <div className="grid grid-cols-4 gap-4 pt-6 border-t border-[var(--border)]">
                                    <div>
                                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Purch. Org</div>
                                        <div className="text-sm font-bold text-[var(--text-1)]">{selectedRFQ.purchasing_org_code?.String || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Purch. Group</div>
                                        <div className="text-sm font-bold text-[var(--text-1)]">{selectedRFQ.purchasing_group_code?.String || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Deadline</div>
                                        <div className="text-sm font-bold text-[var(--text-1)]">{selectedRFQ.deadline_date?.Valid ? new Date(selectedRFQ.deadline_date.Time).toLocaleDateString() : '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-1">Binding</div>
                                        <div className="text-sm font-bold text-[var(--text-1)]">{selectedRFQ.binding_days?.Int32} Days</div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Comparison Matrix */}
                        <Card className="border-[var(--accent)]/20">
                            <CardHeader title="SupplyX Comparison Engine">
                                <div className="flex gap-1 bg-[var(--bg-input)] p-1 rounded-lg">
                                    {['MIN', 'MEAN', 'MAX'].map(b => (
                                        <button 
                                            key={b} 
                                            onClick={() => handleCompare(b)}
                                            className={cn(
                                                "px-3 py-1 text-[9px] font-black rounded-md transition-all",
                                                comparison?.basis === b ? "bg-[var(--accent)] text-black" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                                            )}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardBody>
                                {comparison ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border)] text-[10px] text-[var(--text-4)] uppercase font-bold tracking-widest">
                                                    <th className="py-4 px-2">Item</th>
                                                    <th className="py-4 px-2 text-right">Master</th>
                                                    <th className="py-4 px-2 text-right">Baseline</th>
                                                    {rfqQuotations.map(q => (
                                                        <th key={q.id} className="py-4 px-2 text-right text-[var(--accent)]">{q.vendor_name}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {comparison.comparisons?.map((item: any) => (
                                                    <tr key={item.line_id} className="border-b border-[var(--border)]">
                                                        <td className="py-4 px-2">
                                                            <div className="text-[10px] font-bold text-[var(--accent)] mb-1">Line {item.line_number}</div>
                                                            <div className="text-sm font-bold text-[var(--text-1)]">{item.short_text}</div>
                                                        </td>
                                                        <td className="py-4 px-2 text-right text-[var(--text-3)] text-xs">{(item.master_price ?? 0).toFixed(2)}</td>
                                                        <td className="py-4 px-2 text-right text-[var(--text-1)] font-bold text-sm">{(item.baseline ?? 0).toFixed(2)}</td>
                                                        {rfqQuotations.map(q => {
                                                            const offer = item.offers?.find((o: any) => o.quotation_id === q.id);
                                                            const dev = offer ? ((offer.effective_price - item.baseline) / item.baseline) * 100 : 0;
                                                            return (
                                                                <td key={q.id} className="py-4 px-2 text-right">
                                                                    {offer ? (
                                                                        <>
                                                                            <div className="text-sm font-black text-white/95">{(offer.effective_price ?? 0).toFixed(2)}</div>
                                                                            <div className={cn("text-[9px] font-black", dev > 0 ? "text-red-500" : "text-green-500")}>
                                                                                {dev > 0 ? '+' : ''}{dev.toFixed(1)}%
                                                                            </div>
                                                                        </>
                                                                    ) : <span className="text-white/10">-</span>}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                                <tr className="bg-[var(--accent-dim)]">
                                                    <td colSpan={3} className="py-6 px-4 text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Total Value</td>
                                                    {rfqQuotations.map(q => (
                                                        <td key={q.id} className="py-6 px-4 text-right">
                                                            <div className="text-lg font-black text-white/95">{(q.total_value ?? 0).toFixed(2)}</div>
                                                            <Button 
                                                                variant="primary" 
                                                                size="sm" 
                                                                className="mt-2 text-[10px] h-7 px-4" 
                                                                disabled={selectedRFQ.status === 'CLOSED'}
                                                                onClick={() => setShowFinaliseModal(q.id)}
                                                            >
                                                                Finalise PO
                                                            </Button>
                                                        </td>
                                                    ))}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                        <span className="text-4xl opacity-20">⚖️</span>
                                        <p className="text-sm text-[var(--text-3)] font-medium">Initialize the comparison engine to evaluate vendor responses.</p>
                                        <Button variant="primary" onClick={() => handleCompare()}>RUN ENGINE</Button>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card>
                            <CardHeader title="Vendor Invitations" />
                            <CardBody className="space-y-4">
                                <div className="space-y-2">
                                    {rfqVendors.map(v => (
                                        <div key={v.id} className="flex justify-between items-center p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border)]">
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text-1)]">{v.supplier_name}</div>
                                                <div className={cn("text-[9px] font-black uppercase tracking-tighter", v.has_quoted ? "text-green-500" : "text-[var(--text-4)]")}>
                                                    {v.status}
                                                </div>
                                            </div>
                                            {!v.has_quoted && (
                                                <button className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors" onClick={() => api.uninviteRFQVendor(selectedRFQ.id, v.supplier_id).then(() => handleSelectRFQ(selectedRFQ))}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Select value={0} onChange={e => handleInviteVendor(parseInt(e.target.value))}>
                                    <option value={0}>+ Invite Supplier...</option>
                                    {suppliers?.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                </Select>
                            </CardBody>
                        </Card>

                        <Card className="border-green-500/20 bg-green-500/[0.02]">
                            <CardHeader title="Maintain Quotation (ME47)" />
                            <CardBody className="space-y-6">
                                <Field label="VENDOR">
                                    <Select value={quoteForm.vendor_id} onChange={e => {
                                        const v = rfqVendors.find(vend => vend.supplier_id === parseInt(e.target.value));
                                        setQuoteForm({...quoteForm, vendor_id: parseInt(e.target.value), currency: v?.currency || 'GBP'});
                                    }}>
                                        <option value={0}>Select invited vendor...</option>
                                        {rfqVendors.map(v => <option key={v.id} value={v.supplier_id}>{v.supplier_name}</option>)}
                                    </Select>
                                </Field>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="DOC DATE"><Input type="date" value={quoteForm.document_date} onChange={e => setQuoteForm({...quoteForm, document_date: e.target.value})} /></Field>
                                    <Field label="VALID TO"><Input type="date" value={quoteForm.valid_to} onChange={e => setQuoteForm({...quoteForm, valid_to: e.target.value})} /></Field>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest border-b border-[var(--border)] pb-2">Pricing Conditions</h4>
                                    {quoteForm.lines.map((ql, i) => (
                                        <div key={i} className="p-4 bg-[var(--bg-base)]/40 rounded-xl border border-[var(--border)] space-y-4">
                                            <div className="text-xs font-bold text-[var(--text-1)]">{rfqLines[i]?.short_text || 'Item '+ (i+1)}</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Gross Price"><Input type="number" step="0.01" value={ql.gross_price} onChange={e => {
                                                    const lines = [...quoteForm.lines];
                                                    lines[i].gross_price = parseFloat(e.target.value);
                                                    setQuoteForm({...quoteForm, lines});
                                                }} /></Field>
                                                <Field label="Discount %"><Input type="number" step="0.1" value={ql.discount_pct} onChange={e => {
                                                    const lines = [...quoteForm.lines];
                                                    lines[i].discount_pct = parseFloat(e.target.value);
                                                    setQuoteForm({...quoteForm, lines});
                                                }} /></Field>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button variant="primary" className="w-full bg-green-600 hover:bg-green-500 text-white font-black" onClick={handleEnterQuotation} disabled={!quoteForm.vendor_id}>POST QUOTATION</Button>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            )}

            {/* Finalise Modal */}
            <Modal
                open={!!showFinaliseModal}
                onClose={() => setShowFinaliseModal(null)}
                title="Confirm Winner Selection"
                subtitle="This will finalize the RFQ and generate Purchase Orders for the winning quotation."
            >
                <div className="space-y-6">
                    <p className="text-sm text-[var(--text-2)]">
                        Are you sure you want to select this quotation as the winner? This action will transition the RFQ to CLOSED and initiate the PO lifecycle.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handleFinalise}>CONFIRM & GENERATE PO</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowFinaliseModal(null)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default RFQManagement;
