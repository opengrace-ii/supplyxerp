import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useAppStore, Mode } from '../../store/useAppStore';

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
    const [grForm, setGRForm] = useState({ product_id: 0, quantity: 0, unit: '', zone_id: 0, supplier_ref: '', batch_ref: '', notes: '' });
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
            const [s, p, t] = await Promise.all([api.getGRStats(), api.getProducts(), api.listPutawayTasks()]);
            setGRStats(s);
            setProducts(p.products || []);
            setPutawayTasks(t || []);
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
            const res = await api.scan(scannedBarcode);
            if (res.type === 'HU') {
                setCurrentHU(res.data);
                setCurrentTask(res.open_task || null);
                setCurrentProduct(null);
            } else if (res.type === 'PRODUCT') {
                setCurrentProduct(res.data);
                setCurrentHU(null);
                setCurrentTask(null);
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
                setGRForm({ product_id: 0, quantity: 0, unit: '', zone_id: 0, supplier_ref: '', batch_ref: '', notes: '' });
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
            if (action === 'Move' && targetLocation) {
                const res = await api.moveHU(currentHU.public_id, targetLocation);
                if (res.success) {
                    setCurrentHU(null);
                    setTargetLocation('');
                    fetchStats();
                } else {
                    setError(res.error?.message || 'Move failed');
                }
            } else {
                // Placeholder for other actions
                console.log(`Action ${action} requested on ${currentHU.public_id}`);
                // Clear HU after dummy action
                setCurrentHU(null);
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const renderActionButtons = () => {
        switch (currentMode) {
            case 'Receiving':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading || !scannedBarcode}>Scan</button>
                        <button type="button" className="btn btn-secondary" title="Phase 2" disabled>Create HU</button>
                    </div>
                );
            case 'Production':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading || !scannedBarcode}>Scan</button>
                        <button type="button" className="btn btn-secondary" disabled={!currentHU || loading} onClick={() => handleAction('Consume')}>Consume</button>
                        <button type="button" className="btn btn-secondary" disabled={!currentHU || loading} onClick={() => handleAction('Split')}>Split</button>
                    </div>
                );
            case 'Putaway':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading || (!scannedBarcode && !targetLocation)}>Scan</button>
                        {currentHU && (
                            <select 
                                className="input-scanner"
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
                            </select>
                        )}
                        <button type="button" className="btn btn-secondary" disabled={!targetLocation || !currentHU || loading} onClick={() => handleAction('Move')}>Move</button>
                    </div>
                );
            case 'Dispatch':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading || !scannedBarcode}>Scan</button>
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
                <form onSubmit={handlePostGR} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--theme-border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--theme-accent)', marginBottom: '8px' }}>POST GOODS RECEIPT</h3>
                    
                    <div className="form-group">
                        <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Product</label>
                        <select 
                            className="input-scanner" 
                            style={{ width: '100%' }}
                            value={grForm.product_id}
                            onChange={e => {
                                const p = products.find(p => p.id === parseInt(e.target.value));
                                setGRForm({ ...grForm, product_id: p?.id || 0, unit: p?.base_unit || '' });
                            }}
                        >
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Quantity</label>
                            <input 
                                type="number" 
                                className="input-scanner" 
                                style={{ width: '100%' }}
                                value={grForm.quantity}
                                onChange={e => setGRForm({ ...grForm, quantity: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Unit</label>
                            <input type="text" className="input-scanner" style={{ width: '100%' }} value={grForm.unit} readOnly />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Receiving Zone</label>
                        <select 
                            className="input-scanner" 
                            style={{ width: '100%' }}
                            value={grForm.zone_id}
                            onChange={e => setGRForm({ ...grForm, zone_id: parseInt(e.target.value) })}
                        >
                            <option value="">Select Zone...</option>
                            {receivingZones.map((z: any) => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Supplier Ref</label>
                            <input type="text" className="input-scanner" style={{ width: '100%' }} value={grForm.supplier_ref} onChange={e => setGRForm({ ...grForm, supplier_ref: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Batch Ref</label>
                            <input type="text" className="input-scanner" style={{ width: '100%' }} value={grForm.batch_ref} onChange={e => setGRForm({ ...grForm, batch_ref: e.target.value })} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', height: '40px' }} disabled={loading || !grForm.product_id || !grForm.zone_id || !grForm.quantity}>
                        Post Goods Receipt
                    </button>
                </form>

                <div style={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: loading ? '#22c55e' : '#444', boxShadow: loading ? '0 0 10px #22c55e' : 'none' }}></div>
                        <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>GR AGENT PIPELINE</h3>
                    </div>
                    {traceSteps && traceSteps.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {traceSteps.map((step, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', flexDirection: 'column', gap: '4px',
                                    borderLeft: `2px solid ${step.status === 'SUCCESS' ? '#22c55e' : '#ef4444'}`,
                                    paddingLeft: '12px', py: '4px',
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
                        <div style={{ color: '#444', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>Ready for inbound processing...</div>
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
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #222', color: '#666' }}>
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
                            <tr key={task.id} style={{ borderBottom: '1px solid #111' }}>
                                <td style={{ padding: '12px 8px', color: 'var(--theme-accent)', fontWeight: '600' }}>PUTAWAY</td>
                                <td style={{ padding: '12px 8px', color: '#fff' }}>{task.hu_code || `HU-${task.hu_id}`}</td>
                                <td style={{ padding: '12px 8px', color: '#aaa' }}>{task.from_zone_code || 'RECV-01'}</td>
                                <td style={{ padding: '12px 8px' }}>
                                    <select 
                                        className="input-scanner" 
                                        style={{ fontSize: '11px', padding: '2px 4px' }}
                                        onChange={(e) => {
                                            if (e.target.value) handleCompletePutaway(task.id, parseInt(e.target.value));
                                        }}
                                    >
                                        <option value="">Select Zone...</option>
                                        {storageZones.map((z: any) => (
                                            <option key={z.id} value={z.id}>[{z.zone_type}] {z.code}</option>
                                        ))}
                                    </select>
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
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#444' }}>No pending putaway tasks</td>
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--theme-accent)' }}>StockFlow Core</h1>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginBottom: '20px' }}>Real-time warehouse scanning operations</p>
            </div>

            {/* Mode Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {MODES.map(mode => (
                    <button
                        key={mode}
                        onClick={() => setMode(mode)}
                        style={{
                            padding: '4px 12px', fontSize: '12px', fontWeight: '600',
                            borderRadius: '99px', border: 'none', cursor: 'pointer', outline: 'none',
                            backgroundColor: currentMode === mode ? '#fff' : 'rgba(255,255,255,0.05)',
                            color: currentMode === mode ? '#000' : '#666',
                            transition: 'all 0.2s'
                        }}
                    >
                        {mode}
                    </button>
                ))}
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {currentMode === 'Goods Receipt' ? (
                    <>
                        <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', padding: '12px 14px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '4px' }}>GR Docs Today</div>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>{grStats?.today_count || 0}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', padding: '12px 14px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '4px' }}>Units Received</div>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>{grStats?.today_units?.toLocaleString() || 0}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', padding: '12px 14px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '4px' }}>Open Putaway</div>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>{grStats?.open_putaway_tasks || 0}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', padding: '12px 14px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '4px' }}>Last GR</div>
                            <div style={{ fontSize: '12px', fontWeight: '400', color: '#fff', marginTop: '8px' }}>{grStats?.last_gr_at ? new Date(grStats.last_gr_at).toLocaleTimeString() : 'N/A'}</div>
                        </div>
                    </>
                ) : (
                    [
                        { label: 'Scans Today', value: stats.scans_today },
                        { label: 'Units Handled', value: stats.units_handled.toLocaleString() },
                        { label: 'Active Tasks', value: stats.active_tasks },
                        { label: 'Exceptions', value: stats.exceptions }
                    ].map((stat, i) => (
                        <div key={i} style={{ 
                            backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', 
                            padding: '12px 14px', borderRadius: '8px' 
                        }}>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '4px' }}>
                                {stat.label}
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>
                                {stat.value}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* View Switcher */}
            {currentMode === 'Goods Receipt' && renderGRForm()}
            {currentMode === 'Putaway' && renderPutawayList()}

            {isScannerMode && (
                <form onSubmit={handleScan} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        className="input-scanner"
                        placeholder={`Scan in ${currentMode} mode...`}
                        value={scannedBarcode}
                        onChange={e => setScannedBarcode(e.target.value)}
                        disabled={loading}
                        style={{ flex: 1 }}
                    />
                    {renderActionButtons()}
                </form>
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
                            <div style={{ fontSize: '11px', color: '#888' }}>This HU is currently in a receiving zone. Resolve the putaway task to move it to storage.</div>
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
                            <span style={{ color: 'var(--theme-accent)', fontWeight: '600', fontSize: '11px' }}>{step.agent || 'SYSTEM'}</span>
                            <span style={{ color: '#888', fontSize: '11px', flex: 1 }}>{step.action}</span>
                            {renderTraceStepStatus(step.status)}
                            <span style={{ fontSize: '10px', color: '#666' }}>{step.timestamp || new Date().toLocaleTimeString()}</span>
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
                            <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{currentProduct.code}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Name</div>
                            <div style={{ color: '#fff', fontWeight: '500', fontSize: '14px' }}>{currentProduct.name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Base Unit</div>
                            <div style={{ color: '#fff', fontWeight: '500', fontSize: '13px' }}>1 {currentProduct.base_unit}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Stock Info</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#888' }}>Checking live ledger...</span>
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(245,158,11,0.1)', pt: '10px', marginTop: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>REGISTERED BARCODES</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{currentProduct.code}</span>
                                {(currentProduct.barcodes || []).map((b: any) => (
                                    <span key={b.code} style={{ fontSize: '11px', fontFamily: 'monospace', color: '#aaa', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{b.code}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HU Context Card */}
            {currentHU && (
                <div style={{ 
                    border: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-light)', 
                    borderRadius: '8px', padding: '14px', marginTop: '16px' 
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>HU Code</div>
                            <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>{currentHU.public_id || currentHU.code}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Material</div>
                            <div style={{ color: '#fff', fontWeight: '500', fontSize: '13px' }}>{currentHU.product_name || currentHU.product_code || 'Generic Product'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Quantity</div>
                            <div style={{ color: '#fff', fontWeight: '500', fontSize: '13px' }}>{currentHU.quantity} {currentHU.unit || currentHU.base_unit}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--theme-accent)', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Status</div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-accent)',
                                    fontSize: '11px', borderRadius: '12px', padding: '2px 8px', fontWeight: '600'
                                }}>
                                    {currentHU.status || 'AVAILABLE'}
                                </span>
                            </div>
                        </div>
                        {targetLocation && (
                            <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--theme-border)', paddingTop: '10px', marginTop: '4px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--theme-accent)', marginBottom: '2px' }}>TARGET DESTINATION</div>
                                <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{targetLocation}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockFlowPanel;
