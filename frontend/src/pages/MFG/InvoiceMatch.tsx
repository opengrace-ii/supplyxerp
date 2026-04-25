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

export const InvoiceMatch: React.FC = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [formData, setFormData] = useState({ supplier_id: 0 });
    const [error, setError] = useState<string | null>(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/supplier-invoices');
            setInvoices(res.data?.supplier_invoices || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    const fetchSuppliers = useCallback(async () => {
        try {
            const data = await api.listSuppliers();
            setSuppliers(data.suppliers || []);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        fetchInvoices();
        fetchSuppliers();
    }, [fetchInvoices, fetchSuppliers]);

    const handleCreateInvoice = async () => {
        if (formData.supplier_id === 0) return;
        setError(null);
        try {
            const res = await apiClient.post('/api/supplier-invoices', {
                supplier_id: formData.supplier_id,
                invoice_date: new Date().toISOString().split("T")[0]
            });
            setShowCreateModal(false);
            setSelectedInvoiceId(res.data.id);
            fetchInvoices();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create Invoice");
        }
    };

    if (selectedInvoiceId) {
        return <InvoiceDetail id={selectedInvoiceId} onBack={() => { setSelectedInvoiceId(null); fetchInvoices(); }} />;
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 animate-in fade-in duration-500 overflow-y-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Invoice Match</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">Financial reconciliation · 3-Way matching · Exception management</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>+ Enter Invoice</Button>
            </div>

            <Card>
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'invoice_number', header: 'INVOICE #', mono: true, className: 'text-[var(--accent)] font-bold' },
                            { key: 'supplier_name', header: 'SUPPLIER', render: (v) => v.supplier_name || '-' },
                            { key: 'po_number', header: 'PO #', mono: true, render: (v) => v.po_number || '-', className: 'opacity-50' },
                            { key: 'amount', header: 'AMOUNT', render: (v) => <span className="font-bold text-[var(--text-1)]">{v.total_amount} {v.currency}</span> },
                            { 
                                key: 'status', 
                                header: 'STATUS', 
                                render: (v) => (
                                    <Badge variant={v.status === 'APPROVED' ? 'green' : v.status === 'REJECTED' ? 'red' : 'amber'}>
                                        {v.status}
                                    </Badge>
                                ) 
                            },
                            { 
                                key: 'match_status', 
                                header: 'MATCHING', 
                                render: (v) => (
                                    <Badge variant={v.match_status === 'MATCHED' ? 'green' : v.match_status === 'EXCEPTION' ? 'red' : 'amber'}>
                                        {v.match_status}
                                    </Badge>
                                ) 
                            },
                            {
                                key: 'actions',
                                header: '',
                                className: 'text-right',
                                render: (v) => <Button variant="ghost" size="sm" onClick={() => setSelectedInvoiceId(v.id)}>👁️ View</Button>
                            }
                        ]}
                        rows={invoices}
                        loading={loading}
                    />
                </CardBody>
            </Card>

            <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Enter Supplier Invoice" subtitle="Initialize a new invoice record for matching">
                <div className="space-y-6">
                    {error && <InlineAlert type="error" message={error} />}
                    <Field label="SELECT VENDOR">
                        <Select value={formData.supplier_id} onChange={e => setFormData({ supplier_id: Number(e.target.value) })}>
                            <option value={0}>-- Select Supplier --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                        </Select>
                    </Field>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handleCreateInvoice} disabled={formData.supplier_id === 0}>CREATE INVOICE</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowCreateModal(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const InvoiceDetail: React.FC<{ id: number, onBack: () => void }> = ({ id, onBack }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/api/supplier-invoices/${id}/match-report`);
            setData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApprove = async () => {
        setError(null);
        try {
            await apiClient.post(`/api/supplier-invoices/${id}/approve`);
            setShowApproveModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to approve");
        }
    };

    const handleReject = async () => {
        if (!rejectionReason) return;
        setError(null);
        try {
            await apiClient.post(`/api/supplier-invoices/${id}/reject`, { reason: rejectionReason });
            setShowRejectModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to reject");
        }
    };

    if (loading || !data) return <div className="h-full flex items-center justify-center text-[var(--text-4)] animate-pulse">Consulting Ledger...</div>;

    const { invoice: inv, match_lines: lines, summary } = data;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--accent)] tracking-tight">{inv.invoice_number}</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">{inv.supplier_name} · {new Date(inv.invoice_date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onBack}>BACK</Button>
                    {inv.status === 'PENDING' && (
                        <>
                            <Button variant="danger" onClick={() => setShowRejectModal(true)}>REJECT</Button>
                            <Button variant="primary" className="bg-green-600 border-green-600/30" onClick={() => setShowApproveModal(true)}>APPROVE FOR PAYMENT</Button>
                        </>
                    )}
                </div>
            </div>

            {error && <InlineAlert type="error" message={error} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard label="INVOICE VALUE" value={`${summary.total_invoice_value} ${inv.currency}`} icon="💰" />
                <KpiCard 
                    label="MATCH RESULT" 
                    value={inv.match_result || inv.match_status} 
                    icon={inv.match_status === 'MATCHED' ? "✅" : "⚠️"}
                    className={cn(inv.match_status === 'MATCHED' ? "border-green-500/20" : "border-amber-500/20")}
                />
                <KpiCard 
                    label="TOTAL VARIANCE" 
                    value={`${summary.total_variance} ${inv.currency}`} 
                    icon="📊" 
                    className={cn(summary.total_variance === 0 ? "border-green-500/20" : "border-red-500/20")}
                />
            </div>

            <Card>
                <CardHeader title="3-Way Match Analysis" subtitle="Line-by-line comparison: PO vs GR vs Invoice" />
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'line_no', header: 'LINE', mono: true, width: '60px' },
                            { key: 'description', header: 'DESCRIPTION', className: 'font-semibold' },
                            { key: 'po_price', header: 'PO PRICE', render: (l) => <span className="text-[var(--text-3)]">{l.po_price}</span> },
                            { key: 'invoice_price', header: 'INV PRICE', render: (l) => <span className="font-bold text-[var(--accent)]">{l.invoice_price}</span> },
                            { key: 'delivered_qty', header: 'GR QTY', className: 'text-center' },
                            { key: 'invoice_qty', header: 'INV QTY', className: 'text-center font-bold' },
                            { 
                                key: 'variance', 
                                header: 'VARIANCE', 
                                render: (l) => (
                                    <span className={cn("font-black", l.variance === 0 ? "text-green-500" : "text-red-500")}>
                                        {l.variance}
                                    </span>
                                ) 
                            },
                            { 
                                key: 'status', 
                                header: 'STATUS', 
                                render: (l) => <Badge variant={l.status === 'MATCHED' ? 'green' : 'red'}>{l.status}</Badge> 
                            }
                        ]}
                        rows={lines}
                    />
                </CardBody>
            </Card>

            <Modal open={showApproveModal} onClose={() => setShowApproveModal(false)} title="Confirm Approval" subtitle="Authorize this invoice for payment settlement">
                <div className="space-y-4">
                    <p className="text-sm text-[var(--text-2)]">
                        You are about to approve invoice <span className="text-white font-bold">{inv.invoice_number}</span> for payment. 
                        The system will mark this invoice as CLOSED and update the purchase order commitment.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1 bg-green-600" onClick={handleApprove}>CONFIRM APPROVAL</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowApproveModal(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>

            <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Invoice" subtitle="Return invoice to supplier or internal reviewer">
                <div className="space-y-4">
                    <Field label="REASON FOR REJECTION">
                        <Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="e.g. Quantity mismatch on line 2..." />
                    </Field>
                    <div className="flex gap-3 pt-4">
                        <Button variant="danger" className="flex-1" onClick={handleReject} disabled={!rejectionReason}>REJECT INVOICE</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowRejectModal(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default InvoiceMatch;
