import React, { useState, useEffect, useCallback } from 'react';
import { api, apiClient } from '../../api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, InlineAlert } from '@/components/ui/Form';
import { cn } from '@/lib/cn';

export const DeliveryConfirmation: React.FC = () => {
    const [dcs, setDCs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDCId, setSelectedDCId] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [pos, setPOs] = useState<any[]>([]);
    const [formData, setFormData] = useState({ po_id: 0 });
    const [error, setError] = useState<string | null>(null);

    const fetchDCs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/delivery-confirmations');
            setDCs(res.data?.delivery_confirmations || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    const fetchPOs = useCallback(async () => {
        try {
            const data = await api.listPOs();
            setPOs(data.purchase_orders || []);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        fetchDCs();
        fetchPOs();
    }, [fetchDCs, fetchPOs]);

    const handleCreateDC = async () => {
        if (formData.po_id === 0) return;
        setError(null);
        try {
            const res = await apiClient.post('/api/delivery-confirmations', {
                po_id: formData.po_id,
                delivery_date: new Date().toISOString().split("T")[0]
            });
            setShowCreateModal(false);
            setSelectedDCId(res.data.id);
            fetchDCs();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create Goods Receipt");
        }
    };

    if (selectedDCId) {
        return <DCDetail id={selectedDCId} onBack={() => { setSelectedDCId(null); fetchDCs(); }} />;
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 animate-in fade-in duration-500 overflow-y-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Goods Receipt (DC)</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">Inventory intake · Quality gate · Vendor performance tracking</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>+ New Goods Receipt</Button>
            </div>

            <Card>
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'dc_number', header: 'GR/DC NUMBER', mono: true, className: 'text-[var(--accent)] font-bold' },
                            { key: 'po_number', header: 'PO NUMBER', mono: true, className: 'opacity-60' },
                            { key: 'supplier_name', header: 'SUPPLIER', render: (v) => v.supplier_name || '-' },
                            { key: 'delivery_date', header: 'DATE', className: 'opacity-40 text-xs' },
                            { 
                                key: 'status', 
                                header: 'STATUS', 
                                render: (v) => (
                                    <Badge variant={v.status === 'POSTED' ? 'green' : v.status === 'REVERSED' ? 'red' : 'amber'}>
                                        {v.status}
                                    </Badge>
                                ) 
                            },
                            {
                                key: 'actions',
                                header: '',
                                className: 'text-right',
                                render: (v) => <Button variant="ghost" size="sm" onClick={() => setSelectedDCId(v.id)}>👁️ Process</Button>
                            }
                        ]}
                        rows={dcs}
                        loading={loading}
                    />
                </CardBody>
            </Card>

            <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Goods Receipt" subtitle="Receive materials against an open purchase order">
                <div className="space-y-6">
                    {error && <InlineAlert type="error" message={error} />}
                    <Field label="SELECT PURCHASE ORDER">
                        <Select value={formData.po_id} onChange={e => setFormData({ po_id: Number(e.target.value) })}>
                            <option value={0}>-- Select PO --</option>
                            {pos.map(p => <option key={p.id} value={p.id}>{p.po_number} - {p.supplier_name}</option>)}
                        </Select>
                    </Field>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handleCreateDC} disabled={formData.po_id === 0}>INITIALIZE RECEIPT</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowCreateModal(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const DCDetail: React.FC<{ id: number, onBack: () => void }> = ({ id, onBack }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [lines, setLines] = useState<any[]>([]);
    const [showPostModal, setShowPostModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/api/delivery-confirmations/${id}`);
            setData(res.data);
            if (res.data.lines) {
                setLines(res.data.lines.map((l: any) => ({
                    ...l, 
                    delivered_qty: l.delivered_qty || 0,
                    accepted_qty: l.accepted_qty ?? l.delivered_qty,
                    rejected_qty: l.rejected_qty || 0
                })));
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveLines = async () => {
        setError(null);
        setSaveSuccess(false);
        try {
            await apiClient.put(`/api/delivery-confirmations/${id}/lines`, { lines });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to save lines");
        }
    };

    const handlePost = async () => {
        setError(null);
        try {
            await apiClient.post(`/api/delivery-confirmations/${id}/post`);
            setShowPostModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data || "Posting failed");
        }
    };

    if (loading || !data) return <div className="h-full flex items-center justify-center text-[var(--text-4)] animate-pulse">Syncing logistics data...</div>;

    const dc = data.delivery_confirmation;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">{dc.dc_number}</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">{dc.supplier_name} · PO {dc.po_number}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onBack}>BACK</Button>
                    {dc.status === 'DRAFT' && (
                        <>
                            <Button variant="ghost" onClick={handleSaveLines}>SAVE DRAFT</Button>
                            <Button variant="primary" className="bg-green-600 border-green-600/30 text-white" onClick={() => setShowPostModal(true)}>POST TO INVENTORY</Button>
                        </>
                    )}
                </div>
            </div>

            {error && <InlineAlert type="error" message={typeof error === 'string' ? error : 'Internal Server Error'} />}
            {saveSuccess && <InlineAlert type="success" message="Draft saved successfully." />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard label="PO SOURCE" value={dc.po_number} icon="📄" />
                <KpiCard label="SUPPLIER" value={dc.supplier_name || "-"} icon="🏢" />
                <KpiCard label="DELIVERY DATE" value={dc.delivery_date} icon="📅" />
            </div>

            <Card>
                <CardHeader title="Incoming Goods Breakdown" subtitle="Verify quantities against purchase order commitments" />
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'po_line_no', header: 'LINE', width: '60px' },
                            { key: 'material_name', header: 'MATERIAL', className: 'font-semibold' },
                            { key: 'ordered_qty', header: 'ORDERED', render: (l) => <span className="opacity-40">{l.ordered_qty} {l.unit_of_measure}</span> },
                            { 
                                key: 'delivered_qty', 
                                header: 'DELIVERED', 
                                render: (l, i) => (
                                    <Input 
                                        type="number" 
                                        value={l.delivered_qty} 
                                        disabled={dc.status !== 'DRAFT'} 
                                        className="w-24 h-8 text-center"
                                        onChange={e => setLines(ls => ls.map((x, idx) => idx === i ? {...x, delivered_qty: Number(e.target.value)} : x))}
                                    />
                                ) 
                            },
                            { 
                                key: 'accepted_qty', 
                                header: 'ACCEPTED', 
                                render: (l, i) => (
                                    <Input 
                                        type="number" 
                                        value={l.accepted_qty} 
                                        disabled={dc.status !== 'DRAFT'} 
                                        className="w-24 h-8 text-center border-green-500/20 text-green-500"
                                        onChange={e => setLines(ls => ls.map((x, idx) => idx === i ? {...x, accepted_qty: Number(e.target.value)} : x))}
                                    />
                                ) 
                            },
                            { 
                                key: 'rejected_qty', 
                                header: 'REJECTED', 
                                render: (l, i) => (
                                    <Input 
                                        type="number" 
                                        value={l.rejected_qty} 
                                        disabled={dc.status !== 'DRAFT'} 
                                        className={cn("w-24 h-8 text-center", l.rejected_qty > 0 ? "border-red-500/20 text-red-500" : "")}
                                        onChange={e => setLines(ls => ls.map((x, idx) => idx === i ? {...x, rejected_qty: Number(e.target.value)} : x))}
                                    />
                                ) 
                            }
                        ]}
                        rows={lines}
                    />
                </CardBody>
            </Card>

            <Modal open={showPostModal} onClose={() => setShowPostModal(false)} title="Post Goods Receipt" subtitle="Finalize inventory intake and update warehouse balances">
                <div className="space-y-6">
                    <p className="text-sm text-[var(--text-2)]">
                        Posting delivery confirmation <span className="text-white font-bold">{dc.dc_number}</span> will immediately update inventory levels for <span className="text-white font-bold">{lines.length}</span> line items. 
                        This action is irreversible and will trigger financial postings.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1 bg-green-600" onClick={handlePost}>CONFIRM & POST</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowPostModal(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DeliveryConfirmation;
