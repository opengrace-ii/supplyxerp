import React, { useState, useEffect } from 'react';
import { api, apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

interface RFQManagementProps {
    products: any[];
    suppliers: any[];
    onViewDoc: (doc: any) => void;
}

export function RFQManagement({ products, suppliers, onViewDoc }: RFQManagementProps) {
    const { clearTraceSteps } = useAppStore();
    const [rfqs, setRFQs] = useState<any[]>([]);
    const [subTab, setSubTab] = useState<'LIST' | 'CREATE' | 'DETAIL'>('LIST');
    const [selectedRFQ, setSelectedRFQ] = useState<any>(null);
    const [rfqLines, setRFQLines] = useState<any[]>([]);
    const [rfqVendors, setRFQVendors] = useState<any[]>([]);
    const [rfqQuotations, setRFQQuotations] = useState<any[]>([]);
    const [comparison, setComparison] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Config Data
    const [rfqTypes, setRFQTypes] = useState<any[]>([]);
    const [orderReasons, setOrderReasons] = useState<any[]>([]);
    const [procUnits, setProcUnits] = useState<any[]>([]);
    const [procTeams, setProcTeams] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);

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

    const fetchConfig = async () => {
        try {
            const types = await api.getRFQTypes();
            const reasons = await api.getOrderReasons();
            setRFQTypes(types || []);
            setOrderReasons(reasons || []);
            // Load org master dropdowns
            const [puRes, ptRes, siteRes] = await Promise.allSettled([
                apiClient.get('/api/org/procurement-units'),
                apiClient.get('/api/org/procurement-teams'),
                apiClient.get('/api/org/sites'),
            ]);
            if (puRes.status === 'fulfilled') setProcUnits((puRes.value as any).data?.procurement_units || []);
            if (ptRes.status === 'fulfilled') setProcTeams((ptRes.value as any).data?.procurement_teams || []);
            if (siteRes.status === 'fulfilled') setSites((siteRes.value as any).data?.sites || []);
        } catch (err) { console.error(err); }
    };

    const fetchRFQs = async (status?: string, collNo?: string) => {
        setLoading(true);
        try {
            const data = await api.listRFQs(status, collNo);
            setRFQs(data.rfqs || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchRFQs(); 
        fetchConfig();
    }, []);

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
            
            // Setup quote form lines based on RFQ lines
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

            // Fetch quotations too
            const qData = await api.getRFQQuotations(rfq.id);
            setRFQQuotations(qData || []);
        } catch (err) { console.error(err); }
    };

    const handleCreateRFQ = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createRFQ(newRFQ);
            setSubTab('LIST');
            fetchRFQs();
        } catch (err: any) { 
            alert(err.response?.data?.error || "Failed to create RFQ"); 
        }
    };

    const handleInviteVendor = async (vendorId: number) => {
        if (!selectedRFQ) return;
        try {
            await api.inviteRFQVendors(selectedRFQ.id, [vendorId]);
            const data = await api.getRFQ(selectedRFQ.id);
            setRFQVendors(data.vendors || []);
        } catch (err) { alert("Invitation failed"); }
    };

    const handleEnterQuotation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRFQ) return;
        try {
            await api.enterRFQQuotation(selectedRFQ.id, quoteForm);
            alert("Quotation entered successfully");
            const qData = await api.getRFQQuotations(selectedRFQ.id);
            setRFQQuotations(qData || []);
        } catch (err: any) { 
            alert(err.response?.data?.error || "Quotation submission failed"); 
        }
    };

    const handleCompare = async (basis: string = 'MIN') => {
        if (!selectedRFQ) return;
        try {
            const data = await api.compareRFQQuotations(selectedRFQ.id, basis);
            setComparison(data);
        } catch (err) { console.error(err); }
    };

    const handleFinalise = async (qid: number) => {
        if (!selectedRFQ) return;
        if (!window.confirm("Confirm winner selection. This will finalize the RFQ and automatically create Purchase Orders based on the winning quotation.")) return;
        try {
            await api.finaliseRFQ(selectedRFQ.id, qid);
            alert("RFQ Finalised. PO(s) generated.");
            setSubTab('LIST');
            fetchRFQs();
        } catch (err) { alert("Finalisation failed"); }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--theme-border)', paddingBottom: '10px' }}>
                <button onClick={() => setSubTab('LIST')} style={{ background: 'none', border: 'none', color: subTab === 'LIST' ? '#f59e0b' : '#666', borderBottom: subTab === 'LIST' ? '2px solid #f59e0b' : 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', padding: '10px 0' }}>All RFQs</button>
                <button onClick={() => setSubTab('CREATE')} style={{ background: 'none', border: 'none', color: subTab === 'CREATE' ? '#f59e0b' : '#666', borderBottom: subTab === 'CREATE' ? '2px solid #f59e0b' : 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', padding: '10px 0' }}>+ Create RFQ</button>
                {selectedRFQ && <button style={{ background: 'none', border: 'none', color: subTab === 'DETAIL' ? '#f59e0b' : '#666', borderBottom: subTab === 'DETAIL' ? '2px solid #f59e0b' : 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', padding: '10px 0' }}>Current: {selectedRFQ.rfq_number}</button>}
            </div>

            {subTab === 'LIST' && (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px', display: 'flex', gap: '12px', borderBottom: '1px solid var(--theme-border)' }}>
                        <input className="input-scanner" placeholder="Filter by Collective Number..." style={{ maxWidth: '250px' }} onChange={e => fetchRFQs(undefined, e.target.value)} />
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>RFQ NUMBER</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>TYPE</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>COLL. NO</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>STATUS</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>DEADLINE</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>PURCH. ORG/GRP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rfqs.map(r => (
                                <tr key={r.id} onClick={() => handleSelectRFQ(r)} style={{ borderBottom: '1px solid var(--theme-border)', cursor: 'pointer' }}>
                                    <td style={{ padding: '14px', color: '#f59e0b', fontWeight: '700' }}>{r.rfq_number}</td>
                                    <td style={{ padding: '14px', color: '#fff', fontSize: '12px' }}>{r.rfq_type}</td>
                                    <td style={{ padding: '14px', color: '#888', fontSize: '12px' }}>{r.collective_number?.String || '-'}</td>
                                    <td style={{ padding: '14px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{r.status}</span>
                                    </td>
                                    <td style={{ padding: '14px', color: '#fff', fontSize: '12px' }}>{r.deadline_date?.Valid ? new Date(r.deadline_date.Time).toLocaleDateString() : 'N/A'}</td>
                                    <td style={{ padding: '14px', color: '#666', fontSize: '12px' }}>{r.purchasing_org_code?.String}/{r.purchasing_group_code?.String}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === 'CREATE' && (
                <div style={{ maxWidth: '1000px' }}>
                    <div className="card" style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '32px' }}>New Request for Quotation</h2>
                        <form onSubmit={handleCreateRFQ} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {/* Header Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>RFQ TYPE</label>
                                    <select className="input-scanner" value={newRFQ.rfq_type} onChange={e => setNewRFQ({...newRFQ, rfq_type: e.target.value})}>
                                        {rfqTypes.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>COLLECTIVE NUMBER</label>
                                    <input className="input-scanner" value={newRFQ.collective_number} onChange={e => setNewRFQ({...newRFQ, collective_number: e.target.value.toUpperCase()})} placeholder="e.g., SEASONAL-2024" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>PROCUREMENT UNIT</label>
                                    <select className="input-scanner" value={newRFQ.procurement_unit_id} onChange={e => setNewRFQ({...newRFQ, procurement_unit_id: Number(e.target.value)})}>
                                        <option value={0}>— Select —</option>
                                        {procUnits.map((u: any) => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>PROCUREMENT TEAM</label>
                                    <select className="input-scanner" value={newRFQ.procurement_team_id} onChange={e => setNewRFQ({...newRFQ, procurement_team_id: Number(e.target.value)})}>
                                        <option value={0}>— Select —</option>
                                        {procTeams.map((t: any) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>SUBMISSION DEADLINE</label>
                                    <input type="date" className="input-scanner" value={newRFQ.deadline_date} onChange={e => setNewRFQ({...newRFQ, deadline_date: e.target.value})} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>VALIDITY START</label>
                                    <input type="date" className="input-scanner" value={newRFQ.validity_start} onChange={e => setNewRFQ({...newRFQ, validity_start: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>VALIDITY END</label>
                                    <input type="date" className="input-scanner" value={newRFQ.validity_end} onChange={e => setNewRFQ({...newRFQ, validity_end: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>BINDING DAYS</label>
                                    <input type="number" className="input-scanner" value={newRFQ.binding_days} onChange={e => setNewRFQ({...newRFQ, binding_days: parseInt(e.target.value)})} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>YOUR REFERENCE</label>
                                    <input className="input-scanner" value={newRFQ.your_reference} onChange={e => setNewRFQ({...newRFQ, your_reference: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>OUR REFERENCE</label>
                                    <input className="input-scanner" value={newRFQ.our_reference} onChange={e => setNewRFQ({...newRFQ, our_reference: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>RFQ NOTES (HEADER TEXT)</label>
                                <textarea className="input-scanner" style={{ height: '80px', paddingTop: '12px' }} value={newRFQ.notes} onChange={e => setNewRFQ({...newRFQ, notes: e.target.value})} placeholder="General request instructions for vendors..." />
                            </div>

                            <div style={{ borderTop: '1px solid var(--theme-border)', paddingTop: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <label style={{ fontSize: '11px', color: '#666', fontWeight: '800' }}>LINE ITEMS (SupplyX COMPLIANT)</label>
                                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: '11px' }} onClick={addLine}>+ Add Line</button>
                                </div>
                                {newRFQ.lines.map((l, i) => (
                                    <div key={i} style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--theme-border)', marginBottom: '16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <select className="input-scanner" value={l.product_id} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].product_id = parseInt(e.target.value);
                                                setNewRFQ({ ...newRFQ, lines });
                                            }}>
                                                <option value={0}>Select Product...</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                                            </select>
                                            <input type="number" className="input-scanner" placeholder="Qty" value={l.quantity} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].quantity = parseFloat(e.target.value);
                                                setNewRFQ({ ...newRFQ, lines });
                                            }} />
                                            <select className="input-scanner" value={l.unit} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].unit = e.target.value;
                                                setNewRFQ({ ...newRFQ, lines });
                                            }}>
                                                {['KG', 'IMP', 'QTY', 'LTR', 'MTR', 'PCS'].map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                            <input type="date" className="input-scanner" value={l.required_by_date} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].required_by_date = e.target.value;
                                                setNewRFQ({ ...newRFQ, lines });
                                            }} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                            <input className="input-scanner" placeholder="Item Category (L/B)" value={l.item_category} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].item_category = e.target.value;
                                                setNewRFQ({ ...newRFQ, lines });
                                            }} />
                                            <input className="input-scanner" placeholder="SLoc" value={l.storage_location} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].storage_location = e.target.value;
                                                setNewRFQ({ ...newRFQ, lines });
                                            }} />
                                            <select className="input-scanner" value={l.reason_for_order} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].reason_for_order = e.target.value;
                                                setNewRFQ({ ...newRFQ, lines });
                                            }}>
                                                <option value="">Order Reason...</option>
                                                {orderReasons.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                                            </select>
                                            <input className="input-scanner" placeholder="Tracking No" value={l.req_tracking_no} onChange={e => {
                                                const lines = [...newRFQ.lines];
                                                lines[i].req_tracking_no = e.target.value;
                                                setNewRFQ({ ...newRFQ, lines });
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSubTab('LIST')}>Discard Draft</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Export & Publish RFQ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {subTab === 'DETAIL' && selectedRFQ && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Summary Card */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>{selectedRFQ.rfq_number}</h3>
                                    <div style={{ fontSize: '11px', color: '#666' }}>TYPE: {selectedRFQ.rfq_type} · COLL. NO: {selectedRFQ.collective_number?.String || 'N/A'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '800' }}>CURRENT STATE</div>
                                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#f59e0b' }}>{selectedRFQ.status}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '700' }}>PURCH. ORG</div>
                                    <div style={{ fontSize: '13px', color: '#fff' }}>{selectedRFQ.purchasing_org_code?.String}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '700' }}>PURCH. GRP</div>
                                    <div style={{ fontSize: '13px', color: '#fff' }}>{selectedRFQ.purchasing_group_code?.String}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '700' }}>DEADLINE</div>
                                    <div style={{ fontSize: '13px', color: '#fff' }}>{selectedRFQ.deadline_date?.Valid ? new Date(selectedRFQ.deadline_date.Time).toLocaleDateString() : '-'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '700' }}>BINDING DAYS</div>
                                    <div style={{ fontSize: '13px', color: '#fff' }}>{selectedRFQ.binding_days?.Int32}</div>
                                </div>
                            </div>
                        </div>

                        {/* Comparison Matrix */}
                        <div className="card" style={{ padding: '24px', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>SupplyX Comparison Engine</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['MIN', 'MEAN', 'MAX', 'REF'].map(b => (
                                        <button key={b} className="btn" style={{ fontSize: '10px', padding: '4px 8px', backgroundColor: comparison?.basis === b ? '#f59e0b' : 'transparent', color: comparison?.basis === b ? '#000' : '#666' }} onClick={() => handleCompare(b)}>{b}</button>
                                    ))}
                                </div>
                            </div>

                            {comparison ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#666' }}>ITEM / MATERIAL</th>
                                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '10px', color: '#666' }}>MASTER PRICE</th>
                                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '10px', color: '#666' }}>BASELINE</th>
                                                {rfqQuotations.map((q: any) => (
                                                    <th key={q.id} style={{ padding: '12px', textAlign: 'right', fontSize: '10px', color: '#f59e0b' }}>
                                                        {q.vendor_name}
                                                        <br />
                                                        <span style={{ color: '#666', fontWeight: 'normal' }}>{q.currency}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comparison.comparisons?.map((item: any) => (
                                                <tr key={item.line_id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                                                    <td style={{ padding: '16px 12px' }}>
                                                        <div style={{ fontSize: '11px', color: '#f59e0b' }}>Line {item.line_number}</div>
                                                        <div style={{ fontSize: '13px', color: '#fff', fontWeight: '700' }}>{item.short_text}</div>
                                                    </td>
                                                    <td style={{ padding: '16px 12px', textAlign: 'right', color: '#888', fontSize: '12px' }}>{(item.master_price ?? 0).toFixed(2)}</td>
                                                    <td style={{ padding: '16px 12px', textAlign: 'right', color: '#fff', fontSize: '12px', fontWeight: '600' }}>{(item.baseline ?? 0).toFixed(2)}</td>
                                                    {rfqQuotations.map((q: any) => {
                                                        const offer = item.offers?.find((o: any) => o.quotation_id === q.id);
                                                        const dev = offer ? ((offer.effective_price - item.baseline) / item.baseline) * 100 : 0;
                                                        return (
                                                            <td key={q.id} style={{ padding: '16px 12px', textAlign: 'right' }}>
                                                                {offer ? (
                                                                    <>
                                                                        <div style={{ color: '#fff', fontWeight: '800' }}>{(offer.effective_price ?? 0).toFixed(2)}</div>
                                                                        <div style={{ fontSize: '9px', fontWeight: '900', color: dev > 0 ? '#ef4444' : '#22c55e' }}>{dev > 0 ? '+' : ''}{dev.toFixed(1)}%</div>
                                                                    </>
                                                                ) : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                            <tr style={{ backgroundColor: 'rgba(245,158,11,0.05)' }}>
                                                <td colSpan={3} style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>TOTAL QUOTED VALUE</td>
                                                {rfqQuotations.map((q: any) => (
                                                    <td key={q.id} style={{ padding: '16px 12px', textAlign: 'right' }}>
                                                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#f59e0b' }}>{(q.total_value ?? 0).toFixed(2)}</div>
                                                        <button 
                                                            className="btn btn-primary" 
                                                            style={{ padding: '4px 8px', fontSize: '10px', marginTop: '8px', opacity: selectedRFQ.status === 'CLOSED' ? 0.5 : 1 }} 
                                                            onClick={() => handleFinalise(q.id)} 
                                                            disabled={selectedRFQ.status === 'CLOSED'}
                                                        >
                                                            Finalise PO
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: '60px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚖️</div>
                                    <div style={{ color: '#444', fontSize: '13px', fontWeight: '600' }}>Initialize Comparison Matrix to analyze vendor bids.</div>
                                    <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => handleCompare()}>Run Engine</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Rail */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', marginBottom: '16px' }}>VENDOR INVITATIONS</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                {rfqVendors.map(v => (
                                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{v.supplier_name}</div>
                                            <div style={{ fontSize: '10px', color: v.has_quoted ? '#22c55e' : '#888' }}>{v.status}</div>
                                        </div>
                                        {!v.has_quoted && (
                                            <button className="btn" style={{ borderColor: 'transparent', color: '#ef4444', fontSize: '10px' }} onClick={() => api.uninviteRFQVendor(selectedRFQ.id, v.supplier_id).then(() => handleSelectRFQ(selectedRFQ))}>Remove</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <select className="input-scanner" onChange={e => handleInviteVendor(parseInt(e.target.value))} value={0}>
                                <option value={0}>+ Invite Supplier...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                            </select>
                        </div>

                        <div className="card" style={{ padding: '24px', backgroundColor: 'rgba(34,197,94,0.02)', border: '1px solid rgba(34,197,94,0.1)' }}>
                            <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '800', marginBottom: '16px' }}>MAINTAIN QUOTATION (ME47)</div>
                            <form onSubmit={handleEnterQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', fontWeight: '700' }}>VENDOR</label>
                                    <select className="input-scanner" value={quoteForm.vendor_id} onChange={e => {
                                        const v = rfqVendors.find(vend => vend.supplier_id === parseInt(e.target.value));
                                        setQuoteForm({...quoteForm, vendor_id: parseInt(e.target.value), currency: v?.currency || 'GBP'});
                                    }}>
                                        <option value={0}>Select invited vendor...</option>
                                        {rfqVendors.map(v => <option key={v.id} value={v.supplier_id}>{v.supplier_name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '9px', color: '#666', fontWeight: '700' }}>DOC DATE</label>
                                        <input type="date" className="input-scanner" value={quoteForm.document_date} onChange={e => setQuoteForm({...quoteForm, document_date: e.target.value})} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '9px', color: '#666', fontWeight: '700' }}>VALID TO</label>
                                        <input type="date" className="input-scanner" value={quoteForm.valid_to} onChange={e => setQuoteForm({...quoteForm, valid_to: e.target.value})} />
                                    </div>
                                </div>
                                
                                <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginTop: '12px', borderBottom: '1px solid var(--theme-border)', paddingBottom: '4px' }}>PRICING CONDITIONS</div>
                                {quoteForm.lines.map((ql, i) => (
                                    <div key={i} style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>{rfqLines[i]?.short_text || 'Item '+ (i+1)}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <div>
                                                    <label style={{ fontSize: '9px', color: '#f59e0b', fontWeight: '700' }}>GROSS PRICE (PB00)</label>
                                                    <input type="number" step="0.01" className="input-scanner" value={ql.gross_price} onChange={e => {
                                                        const lines = [...quoteForm.lines];
                                                        lines[i].gross_price = parseFloat(e.target.value);
                                                        setQuoteForm({...quoteForm, lines});
                                                    }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '9px', color: '#f59e0b', fontWeight: '700' }}>DISCOUNT % (RA00)</label>
                                                    <input type="number" step="0.1" className="input-scanner" value={ql.discount_pct} onChange={e => {
                                                        const lines = [...quoteForm.lines];
                                                        lines[i].discount_pct = parseFloat(e.target.value);
                                                        setQuoteForm({...quoteForm, lines});
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <div>
                                                    <label style={{ fontSize: '9px', color: '#f59e0b', fontWeight: '700' }}>FREIGHT (FRB1)</label>
                                                    <input type="number" step="0.01" className="input-scanner" value={ql.freight_value} onChange={e => {
                                                        const lines = [...quoteForm.lines];
                                                        lines[i].freight_value = parseFloat(e.target.value);
                                                        setQuoteForm({...quoteForm, lines});
                                                    }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '9px', color: '#666', fontWeight: '700' }}>DELIV. DATE</label>
                                                    <input type="date" className="input-scanner" value={ql.delivery_date_offered} onChange={e => {
                                                        const lines = [...quoteForm.lines];
                                                        lines[i].delivery_date_offered = e.target.value;
                                                        setQuoteForm({...quoteForm, lines});
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#22c55e', border: 'none', height: '44px', fontWeight: '900' }} disabled={!quoteForm.vendor_id}>Post Quotation</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


export default RFQManagement;
