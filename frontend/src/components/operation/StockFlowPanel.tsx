import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useAppStore, Mode } from '../../store/useAppStore';
import { KpiCard } from '@/components/ui/KpiCard';
import { SectionTabs } from '@/components/ui/SectionTabs';
import { ScanInput } from '@/components/ui/ScanInput';
import { Input, Select } from '@/components/ui/Form';

const StockFlowPanel: React.FC = () => {
    const { currentHU, setCurrentHU, currentTask, setCurrentTask, currentMode, setMode, traceSteps } = useAppStore();
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [targetLocation, setTargetLocation] = useState('');
    const [currentProduct, setCurrentProduct] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orgTree, setOrgTree] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [grStats, setGRStats] = useState<any>(null);
    const [putawayTasks, setPutawayTasks] = useState<any[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [grForm, setGRForm] = useState({ 
        product_id: 0, quantity: 0, unit: '', zone_id: 0, 
        supplier_ref: '', batch_ref: '', notes: '',
        po_id: 0, po_line_id: 0 
    });
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitQty, setSplitQty] = useState(0);
    const [huLineage, setHuLineage] = useState<any[]>([]);
    const [consumeNotes, setConsumeNotes] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const MODES: Mode[] = ['Goods Receipt', 'Putaway', 'Receiving', 'Production', 'Dispatch'];

    const [stats, setStats] = useState({ scans_today: 0, units_handled: 0, active_tasks: 0, exceptions: 0 });

    const fetchStats = async () => {
        try {
            const res = await api.getStockFlowStats();
            setStats(res);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const fetchOrgTree = async () => {
        try {
            const res = await api.getOrgTree();
            setOrgTree(res);
        } catch (err) {
            console.error("Failed to fetch org tree", err);
        }
    };

    const fetchGRData = async () => {
        try {
            const [s, p, t, o] = await Promise.all([
                api.getGRStats(), 
                api.getProducts(), 
                api.listPutawayTasks(),
                api.listPOs('APPROVED')
            ]);
            setGRStats(s);
            setProducts(p.products || []);
            setPutawayTasks(t || []);
            setPurchaseOrders(o.purchase_orders || []);
        } catch (err) {
            console.error("Failed to fetch GR data", err);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchOrgTree();
        fetchGRData();
        
        const handleUpdate = () => {
            fetchStats();
            fetchGRData();
        };
        window.addEventListener('inventory_update', handleUpdate);
        return () => window.removeEventListener('inventory_update', handleUpdate);
    }, []);

    useEffect(() => {
        inputRef.current?.focus();
        setCurrentProduct(null);
    }, [currentMode]);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scannedBarcode) return;

        setLoading(true);
        setError(null);
        try {
            const res = await api.scan({ barcode: scannedBarcode });
            if (res.type === 'HU') {
                setCurrentHU(res.data);
                setCurrentTask(res.open_task || null);
                setCurrentProduct(null);
                setConsumeNotes('');

                // If in production mode, fetch lineage automatically
                if (currentMode === 'Production') {
                    const lineage = await api.lineage(res.data.public_id || res.data.code);
                    setHuLineage(lineage);
                }
            } else if (res.type === 'PRODUCT') {
                setCurrentProduct(res.data);
                setCurrentHU(null);
                setCurrentTask(null);
                setHuLineage([]);
            } else if (res.type === 'LOCATION') {
                if (currentHU && (currentMode === 'Putaway' || currentMode === 'Production')) {
                    setTargetLocation(res.data.code);
                } else if (!currentHU) {
                    setError('Scan an HU first before a location');
                }
            }
            setScannedBarcode('');
            fetchStats();
        } catch (err: any) {
            setError(err.response?.data?.error || 'System error during scan');
        } finally {
            setLoading(false);
        }
    };

    const handlePostGR = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.postGR(grForm);
            if (res.success) {
                setGRForm({ 
                    product_id: 0, quantity: 0, unit: '', zone_id: 0, 
                    supplier_ref: '', batch_ref: '', notes: '',
                    po_id: 0, po_line_id: 0
                });
                fetchGRData();
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to post GR');
        } finally {
            setLoading(false);
        }
    };

    const handleCompletePutaway = async (taskId: number, toZoneId: number) => {
        setLoading(true);
        setError(null);
        try {
            await api.completePutaway(taskId, toZoneId);
            fetchGRData();
            fetchStats();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to complete putaway');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string) => {
        if (!currentHU) return;
        setLoading(true);
        setError(null);
        try {
            const huCode = currentHU.public_id || currentHU.code;

            if (action === 'Move' && targetLocation) {
                const res = await api.move({ barcode: huCode, target_location: targetLocation });
                if (res.success) {
                    setCurrentHU(null);
                    setTargetLocation('');
                    fetchStats();
                } else {
                    setError(res.error?.message || 'Move failed');
                }
            } else if (action === 'Split') {
                const res = await api.consume({ 
                    barcode: huCode, 
                    quantity: splitQty,
                    mode: 'split'
                });
                if (res.success) {
                    setShowSplitModal(false);
                    setSplitQty(0);
                    // Reload the parent HU to see updated quantity
                    const scanRes = await api.scan(huCode);
                    setCurrentHU(scanRes.data);
                    const lineage = await api.lineage(huCode);
                    setHuLineage(lineage);
                }
            } else if (action === 'Consume') {
                const res = await api.consume({ 
                    barcode: huCode, 
                    quantity: currentHU.quantity, // Full consumption from button
                    mode: 'consume' 
                });
                if (res.success) {
                    setCurrentHU(null);
                    setHuLineage([]);
                    fetchStats();
                }
            } else if (action === 'PartialConsume') {
                const res = await api.consume({ 
                    barcode: huCode, 
                    quantity: splitQty, 
                    mode: 'consume' 
                });
                if (res.success) {
                    setShowSplitModal(false);
                    setSplitQty(0);
                    setConsumeNotes('');
                    // Reprocess parent
                    const scanRes = await api.scan(huCode);
                    setCurrentHU(scanRes.data);
                    const lineage = await api.lineage(huCode);
                    setHuLineage(lineage);
                }
            } else {
                console.log(`Action ${action} requested on ${huCode}`);
                setCurrentHU(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Connection error');
        } finally {
            setLoading(false);
        }
    };

    const renderActionButtons = () => {
        switch (currentMode) {
            case 'Receiving':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn btn-secondary" title="Phase 2" disabled>Create HU</button>
                    </div>
                );
            case 'Production':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {currentHU && (
                            <>
                                <button type="button" className="btn" style={{ backgroundColor: '#22c55e', color: '#000', fontWeight: '700' }} disabled={loading} onClick={() => handleAction('Consume')}>Full Consume</button>
                                <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => { setSplitQty(0); setShowSplitModal(true); }}>Partial Use</button>
                                <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => { setSplitQty(0); setShowSplitModal(true); }}>Manual Split</button>
                            </>
                        )}
                    </div>
                );
            case 'Putaway':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {currentHU && (
                            <Select 
                                className="sx-select"
                                value={targetLocation}
                                onChange={e => setTargetLocation(e.target.value)}
                                style={{ width: '150px' }}
                            >
                                <option value="">Select Zone...</option>
                                {orgTree.length > 0 && orgTree[0].sites?.map((site: any) => (
                                    <optgroup key={site.id} label={site.name}>
                                        {site.zones?.map((zone: any) => (
                                            <option key={zone.id} value={zone.code}>
                                                [{zone.zone_type}] {zone.code} — {zone.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </Select>
                        )}
                        <button type="button" className="btn btn-secondary" disabled={!targetLocation || !currentHU || loading} onClick={() => handleAction('Move')}>Move</button>
                    </div>
                );
            case 'Dispatch':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn btn-secondary" title="Phase 2" disabled>Pick</button>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderGRForm = () => {
        const receivingZones = orgTree.flatMap(o => o.sites || []).flatMap((s: any) => s.zones || []).filter((z: any) => z.zone_type === 'RECEIVING');

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <form onSubmit={handlePostGR} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)', marginBottom: '8px' }}>POST GOODS RECEIPT</h3>
                    
                    <div className="form-group">
                        <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Purchase Order (PO)</label>
                        <Select 
                            className="sx-select" 
                            style={{ width: '100%' }}
                            value={grForm.po_id}
                            onChange={e => {
                                const poID = parseInt(e.target.value);
                                const po = purchaseOrders.find(p => p.id === poID);
                                setGRForm({ ...grForm, po_id: poID, po_line_id: 0, supplier_ref: po?.po_number || '' });
                            }}
                        >
                            <option value="0">Manual (No PO)</option>
                            {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.po_number} - {po.supplier_name}</option>)}
                        </Select>
                    </div>

                    {grForm.po_id !== 0 && (
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>PO Line Item</label>
                            <Select 
                                className="sx-select" 
                                style={{ width: '100%' }}
                                value={grForm.po_line_id}
                                onChange={e => {
                                    const lineID = parseInt(e.target.value);
                                    const po = purchaseOrders.find(p => p.id === grForm.po_id);
                                    const line = po?.lines?.find((l: any) => l.id === lineID);
                                    if (line) {
                                        setGRForm({ 
                                            ...grForm, 
                                            po_line_id: lineID, 
                                            product_id: line.product_id, 
                                            quantity: line.qty_ordered - line.qty_received,
                                            unit: line.unit 
                                        });
                                    }
                                }}
                            >
                                <option value="0">Select line...</option>
                                {purchaseOrders.find(p => p.id === grForm.po_id)?.lines?.map((l: any) => (
                                    <option key={l.id} value={l.id}>[{l.product_code}] {l.qty_ordered} {l.unit} (Left: {l.qty_ordered - l.qty_received})</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div className="form-group">
                        <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Product</label>
                        <Select 
                            className="sx-select" 
                            style={{ width: '100%' }}
                            value={grForm.product_id}
                            disabled={grForm.po_line_id !== 0}
                            onChange={e => {
                                const p = products.find(p => p.id === parseInt(e.target.value));
                                setGRForm({ ...grForm, product_id: p?.id || 0, unit: p?.base_unit || '' });
                            }}
                        >
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                        </Select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Quantity</label>
                            <Input 
                                type="number" 
                                className="sx-input" 
                                style={{ width: '100%' }}
                                value={grForm.quantity}
                                onChange={e => setGRForm({ ...grForm, quantity: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Unit</label>
                            <Input type="text" className="sx-input" style={{ width: '100%' }} value={grForm.unit} readOnly />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Receiving Zone</label>
                        <Select 
                            className="sx-select" 
                            style={{ width: '100%' }}
                            value={grForm.zone_id}
                            onChange={e => setGRForm({ ...grForm, zone_id: parseInt(e.target.value) })}
                        >
                            <option value="">Select Zone...</option>
                            {receivingZones.map((z: any) => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
                        </Select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Supplier Ref</label>
                            <Input type="text" className="sx-input" style={{ width: '100%' }} value={grForm.supplier_ref} onChange={e => setGRForm({ ...grForm, supplier_ref: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Batch Ref</label>
                            <Input type="text" className="sx-input" style={{ width: '100%' }} value={grForm.batch_ref} onChange={e => setGRForm({ ...grForm, batch_ref: e.target.value })} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', height: '40px' }} disabled={loading || !grForm.product_id || !grForm.zone_id || !grForm.quantity}>
                        Post Goods Receipt
                    </button>
                </form>

                <div style={{ backgroundColor: 'var(--bg-surface2)', borderRadius: '12px', border: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: loading ? '#22c55e' : '#444', boxShadow: loading ? '0 0 10px #22c55e' : 'none' }}></div>
                        <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-1)' }}>GR AGENT PIPELINE</h3>
                    </div>
                    {traceSteps && traceSteps.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {traceSteps.map((step, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', flexDirection: 'column', gap: '4px',
                                    borderLeft: `2px solid ${step.status === 'SUCCESS' ? '#22c55e' : '#ef4444'}`,
                                    paddingLeft: '12px', paddingTop: '4px', paddingBottom: '4px',
                                    backgroundColor: step.status === 'SUCCESS' ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '10px' }}>[{step.agent}]</span>
                                        {renderTraceStepStatus(step.status)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#ddd' }}>{step.action}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-4)', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>Ready for inbound processing...</div>
                    )}
                </div>
            </div>
        );
    };

    const renderPutawayList = () => {
        const storageZones = orgTree.flatMap(o => o.sites || []).flatMap((s: any) => s.zones || []).filter((z: any) => z.zone_type !== 'RECEIVING');

        return (
            <div style={{ marginTop: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                            <th style={{ padding: '12px 8px' }}>TASK</th>
                            <th style={{ padding: '12px 8px' }}>HU CODE</th>
                            <th style={{ padding: '12px 8px' }}>FROM</th>
                            <th style={{ padding: '12px 8px' }}>DESTINATION</th>
                            <th style={{ padding: '12px 8px' }}>PRIORITY</th>
                            <th style={{ padding: '12px 8px' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {putawayTasks.map(task => (
                            <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '12px 8px', color: 'var(--accent)', fontWeight: '600' }}>PUTAWAY</td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-1)' }}>{task.hu_code || `HU-${task.hu_id}`}</td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-3)' }}>{task.from_zone_code || 'RECV-01'}</td>
                                <td style={{ padding: '12px 8px' }}>
                                    <Select 
                                        className="sx-select" 
                                        style={{ fontSize: '11px', padding: '2px 4px' }}
                                        onChange={(e) => {
                                            if (e.target.value) handleCompletePutaway(task.id, parseInt(e.target.value));
                                        }}
                                    >
                                        <option value="">Select Zone...</option>
                                        {storageZones.map((z: any) => (
                                            <option key={z.id} value={z.id}>[{z.zone_type}] {z.code}</option>
                                        ))}
                                    </Select>
                                </td>
                                <td style={{ padding: '12px 8px' }}>
                                    <span style={{ color: task.priority > 2 ? '#ef4444' : '#22c55e' }}>●</span> {task.priority}
                                </td>
                                <td style={{ padding: '12px 8px' }}>
                                    <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '4px 8px' }} disabled>View HU</button>
                                </td>
                            </tr>
                        ))}
                        {putawayTasks.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-4)' }}>No pending putaway tasks</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTraceStepStatus = (status: string) => {
        let bg, color, docc;
        if (status === 'SUCCESS') {
            bg = 'rgba(22,163,74,0.1)'; color = '#22c55e'; docc = '#22c55e40';
        } else if (status === 'BLOCKED') {
            bg = 'rgba(245,158,11,0.1)'; color = '#f59e0b'; docc = '#f59e0b40';
        } else {
            bg = 'rgba(239,68,68,0.1)'; color = '#ef4444'; docc = '#ef444440';
        }
        return (
            <span style={{
                fontSize: '10px', fontWeight: '700', borderRadius: '4px', padding: '2px 6px',
                border: `1px solid ${docc}`, backgroundColor: bg, color: color
            }}>
                {status}
            </span>
        );
    };

    const isScannerMode = ['Receiving', 'Production', 'Dispatch'].includes(currentMode);

    const TABS = MODES.map(m => ({ key: m, label: m }));

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] overflow-y-auto">
            {/* Module Header */}
            <div className="p-8 border-b border-[var(--border)] bg-white/[0.01]">
                <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">StockFlow Core</h1>
                <p className="text-sm text-[var(--text-3)] mt-1">Real-time warehouse scanning operations</p>
            </div>

            <div className="flex-1 p-8 space-y-8">

            {/* Mode Tabs */}
            <SectionTabs
                tabs={TABS}
                active={currentMode}
                onChange={(key) => setMode(key as Mode)}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-3">
                {currentMode === 'Goods Receipt' ? (
                    <>
                        <KpiCard label="GR Docs Today"   value={grStats?.today_count ?? 0} />
                        <KpiCard label="Units Received"  value={grStats?.today_units?.toLocaleString() ?? 0} />
                        <KpiCard label="Open Putaway"    value={grStats?.open_putaway_tasks ?? 0} />
                        <KpiCard label="Last GR"         value={grStats?.last_gr_at ? new Date(grStats.last_gr_at).toLocaleTimeString() : 'N/A'} />
                    </>
                ) : (
                    <>
                        <KpiCard label="Scans Today"   value={stats.scans_today} />
                        <KpiCard label="Units Handled" value={stats.units_handled.toLocaleString()} />
                        <KpiCard label="Active Tasks"  value={stats.active_tasks} />
                        <KpiCard
                            label="Exceptions"
                            value={stats.exceptions}
                            deltaDir={stats.exceptions > 0 ? 'down' : 'neutral'}
                        />
                    </>
                )}
            </div>

            {/* View Switcher */}
            {currentMode === 'Goods Receipt' && renderGRForm()}
            {currentMode === 'Putaway' && renderPutawayList()}

            {isScannerMode && (
                <div>
                    <ScanInput
                        mode={currentMode}
                        onScan={async (val) => {
                            setLoading(true);
                            setError(null);
                            try {
                                const res = await api.scan({ barcode: val });
                                if (res.type === 'HU') {
                                    setCurrentHU(res.data);
                                    setCurrentTask(res.open_task || null);
                                    setCurrentProduct(null);
                                    setConsumeNotes('');
                                    if (currentMode === 'Production') {
                                        const lineage = await api.lineage(res.data.public_id || res.data.code);
                                        setHuLineage(lineage);
                                    }
                                } else if (res.type === 'PRODUCT') {
                                    setCurrentProduct(res.data);
                                    setCurrentHU(null);
                                    setCurrentTask(null);
                                    setHuLineage([]);
                                } else if (res.type === 'LOCATION') {
                                    if (currentHU && (currentMode === 'Putaway' || currentMode === 'Production')) {
                                        setTargetLocation(res.data.code);
                                    } else if (!currentHU) {
                                        setError('Scan an HU first before a location');
                                    }
                                }
                                fetchStats();
                            } catch (err: any) {
                                setError(err.response?.data?.error || 'System error during scan');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                    />
                    {renderActionButtons()}
                </div>
            )}

            {error && (
                <div style={{ fontSize: '13px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                    {error}
                </div>
            )}

            {/* Putaway Banner */}
            {currentTask && currentTask.task_type === 'PUTAWAY' && currentMode !== 'Putaway' && (
                <div style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '8px', 
                    backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>⚠️</span>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b' }}>PUTAWAY REQUIRED</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>This HU is currently in a receiving zone. Resolve the putaway task to move it to storage.</div>
                        </div>
                    </div>
                    <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '10px', padding: '4px 10px', borderColor: '#f59e0b', color: '#f59e0b' }}
                        onClick={() => setMode('Putaway')}
                    >
                        Go to Putaway
                    </button>
                </div>
            )}

            {/* Agent Trace */}
            {traceSteps && traceSteps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {traceSteps.map((step, idx) => (
                        <div key={idx} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            backgroundColor: step.status === 'SUCCESS' ? 'rgba(22,163,74,0.05)' : step.status === 'BLOCKED' ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)',
                            borderRadius: '6px', padding: '5px 8px'
                        }}>
                            <span style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '11px' }}>{step.agent || 'SYSTEM'}</span>
                            <span style={{ color: 'var(--text-3)', fontSize: '11px', flex: 1 }}>{step.action}</span>
                            {renderTraceStepStatus(step.status)}
                            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{step.timestamp || new Date().toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Product Context Card */}
            {currentProduct && (
                <div style={{ 
                    border: '1px solid rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.03)', 
                    borderRadius: '8px', padding: '14px', marginTop: '16px' 
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Product Code</div>
                            <div style={{ color: 'var(--text-1)', fontWeight: '600', fontSize: '14px' }}>{currentProduct.code}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Name</div>
                            <div style={{ color: 'var(--text-1)', fontWeight: '500', fontSize: '14px' }}>{currentProduct.name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Base Unit</div>
                            <div style={{ color: 'var(--text-1)', fontWeight: '500', fontSize: '13px' }}>1 {currentProduct.base_unit}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Stock Info</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Checking live ledger...</span>
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(245,158,11,0.1)', paddingTop: '10px', marginTop: '4px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '6px' }}>REGISTERED BARCODES</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{currentProduct.code}</span>
                                {(currentProduct.barcodes || []).map((b: any) => (
                                    <span key={b.code} style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-3)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{b.code}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HU Context Card */}
            {currentHU && (
                <div style={{ 
                    border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface2)', 
                    borderRadius: '8px', padding: '14px', marginTop: '16px' 
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>HU Code</div>
                            <div style={{ color: 'var(--text-1)', fontWeight: '600', fontSize: '13px' }}>{currentHU.public_id || currentHU.code}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Material</div>
                            <div style={{ color: 'var(--text-1)', fontWeight: '500', fontSize: '13px' }}>{currentHU.product_name || currentHU.product_code || 'Generic Product'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Quantity</div>
                            <div style={{ color: 'var(--text-1)', fontWeight: '500', fontSize: '13px' }}>{currentHU.quantity} {currentHU.unit || currentHU.base_unit}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Status</div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--accent)',
                                    fontSize: '11px', borderRadius: '12px', padding: '2px 8px', fontWeight: '600'
                                }}>
                                    {currentHU.status || 'AVAILABLE'}
                                </span>
                            </div>
                        </div>
                        {targetLocation && (
                            <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--accent)', marginBottom: '2px' }}>TARGET DESTINATION</div>
                                <div style={{ color: 'var(--text-1)', fontWeight: '700', fontSize: '14px' }}>{targetLocation}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Split / Partial Consume Modal */}
            {showSplitModal && currentHU && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-surface2)', border: '1px solid var(--border)',
                        padding: '30px', borderRadius: '12px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px'
                    }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-1)' }}>Partial Consumption / Split</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Parent HU: {currentHU.public_id || currentHU.code} ({currentHU.quantity} {currentHU.unit})</p>
                        </div>

                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase' }}>Quantity to Extract</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <Input 
                                    type="number" className="sx-input" style={{ flex: 1 }} 
                                    max={currentHU.quantity} min={0.0001} step={0.0001}
                                    value={splitQty} onChange={e => setSplitQty(parseFloat(e.target.value))}
                                />
                                <span style={{ fontSize: '14px', color: 'var(--text-1)' }}>{currentHU.unit}</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase' }}>Notes / Reason</label>
                            <Input 
                                type="text" className="sx-input" placeholder="e.g. Production use, Lab sample..."
                                value={consumeNotes} onChange={e => setConsumeNotes(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button className="btn" style={{ flex: 1, backgroundColor: '#22c55e', color: '#000', fontWeight: '700' }} onClick={() => handleAction('PartialConsume')}>Consume</button>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleAction('Split')}>Split to New HU</button>
                        </div>
                        <button className="btn btn-secondary" style={{ opacity: 0.5, fontSize: '11px' }} onClick={() => setShowSplitModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Lineage Tree Viewer */}
            {currentMode === 'Production' && huLineage.length > 0 && (
                <div style={{ 
                    marginTop: '20px', backgroundColor: 'var(--bg-input)', 
                    border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' 
                }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span style={{ color: 'var(--text-1)' }}>IDENTITY LINEAGE</span>
                         <span style={{ fontSize: '10px', fontWeight: '400', opacity: 0.5 }}>Real-time Trace</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {huLineage.map((node, i) => (
                            <div key={node.id} style={{ display: 'flex', position: 'relative' }}>
                                {/* Tree Line */}
                                <div style={{
                                    width: '2px', backgroundColor: node.status === 'VOIDED' ? '#ef444440' : '#22c55e40',
                                    marginLeft: `${node.depth * 24}px`, position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute', top: '16px', left: '-4px', width: '10px', height: '10px',
                                        borderRadius: '50%', border: '2px solid #18181b',
                                        backgroundColor: node.status === 'VOIDED' ? '#ef4444' : '#22c55e'
                                    }} />
                                    {i < huLineage.length - 1 && huLineage[i+1].depth > node.depth && (
                                        <div style={{ position: 'absolute', top: '26px', left: '0', width: '2px', height: '100%', backgroundColor: '#333' }} />
                                    )}
                                </div>
                                
                                <div style={{
                                    flex: 1, padding: '10px 16px', marginBottom: '8px',
                                    marginLeft: '12px', borderRadius: '8px',
                                    backgroundColor: (currentHU?.public_id === node.hu_code || currentHU?.code === node.hu_code) ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
                                    border: (currentHU?.public_id === node.hu_code || currentHU?.code === node.hu_code) ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: node.status === 'VOIDED' ? '#666' : '#fff' }}>{node.hu_code}</span>
                                            {node.status === 'VOIDED' && <span style={{ fontSize: '9px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1px 4px', borderRadius: '4px' }}>CONSUMED</span>}
                                            {node.depth === 0 && <span style={{ fontSize: '9px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '1px 4px', borderRadius: '4px' }}>PARENT</span>}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>
                                            {node.product_code} · {node.quantity} {node.base_unit} · {node.zone_code}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-4)' }}>
                                        {new Date(node.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default StockFlowPanel;
