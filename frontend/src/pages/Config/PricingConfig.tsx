import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

const PricingConfig: React.FC = () => {
    const { user } = useAppStore();
    const [config, setConfig] = useState<any>(null);
    const [infoRecords, setInfoRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [seedResult, setSeedResult] = useState<string | null>(null);

    const [editConfig, setEditConfig] = useState({
        approval_mode: 'FLAT',
        flat_pr_threshold: 500,
        flat_po_threshold: 5000,
        default_tolerance_pct: 5,
        default_currency: 'GBP'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [c, ir] = await Promise.all([
                api.getPricingConfig(),
                api.getAllInfoRecords()
            ]);
            const configData = c.success ? c.data : c;
            setConfig(configData);
            setInfoRecords(ir);
            setEditConfig({
                approval_mode: configData.approval_mode,
                flat_pr_threshold: parseFloat(configData.flat_pr_threshold),
                flat_po_threshold: parseFloat(configData.flat_po_threshold),
                default_tolerance_pct: parseFloat(configData.default_tolerance_pct),
                default_currency: configData.default_currency
            });
        } catch (err: any) {
            setError('Failed to fetch pricing configuration');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleUpdateConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.updatePricingConfig(editConfig);
            setSuccess('Pricing configuration updated successfully');
            const data = res.success ? res.data : res;
            setConfig(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSeedDefaults = async () => {
        setSeeding(true);
        setSeedResult(null);
        try {
            const result = await api.seedPricingDefaults();
            if (result.success) {
                const count = result.data?.condition_types?.length || 7;
                const msg = result.data?.already_seeded
                    ? `Already seeded — ${count} condition types active`
                    : `Seeded successfully — ${result.data?.condition_types_created} condition types created`;
                setSeedResult(msg);
                await fetchData();
            } else {
                setSeedResult(`Error: ${result.error || 'Unknown error'}`);
            }
        } catch (err: any) {
            setSeedResult(`Failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#f472b6' }}>PRICING ENGINE CONFIG</h1>
                    <p style={{ fontSize: '14px', color: '#888' }}>Global procurement rules and pricing master settings</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {!config?.condition_types_seeded && (
                        <button 
                            className="btn" 
                            style={{ backgroundColor: '#f472b6', color: '#000', fontWeight: '800', padding: '10px 20px' }}
                            onClick={handleSeedDefaults}
                            disabled={seeding}
                        >
                            {seeding ? 'SEEDING...' : 'SEED DEFAULT PRICING'}
                        </button>
                    )}
                    {seedResult && (
                        <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>{seedResult}</div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Approval Logic Section */}
                <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f472b6' }}></div>
                        <h2 style={{ fontSize: '16px', fontWeight: '800' }}>APPROVAL ENGINE LOGIC</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Approval Mode</label>
                            <select 
                                className="input-scanner" 
                                style={{ width: '100%', backgroundColor: '#000', border: '1px solid #333' }}
                                value={editConfig.approval_mode}
                                onChange={e => setEditConfig({...editConfig, approval_mode: e.target.value})}
                            >
                                <option value="FLAT">Flat Threshold (Global)</option>
                                <option value="MRP_BASED">MRP Based (Consumption Velocity)</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>PR Threshold ({editConfig.default_currency})</label>
                                <input 
                                    type="number"
                                    className="input-scanner" 
                                    style={{ width: '100%' }}
                                    value={editConfig.flat_pr_threshold}
                                    onChange={e => setEditConfig({...editConfig, flat_pr_threshold: parseFloat(e.target.value)})}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>PO Threshold ({editConfig.default_currency})</label>
                                <input 
                                    type="number"
                                    className="input-scanner" 
                                    style={{ width: '100%' }}
                                    value={editConfig.flat_po_threshold}
                                    onChange={e => setEditConfig({...editConfig, flat_po_threshold: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Auto-Approve Tolerance %</label>
                                <input 
                                    type="number"
                                    className="input-scanner" 
                                    style={{ width: '100%' }}
                                    value={editConfig.default_tolerance_pct}
                                    onChange={e => setEditConfig({...editConfig, default_tolerance_pct: parseFloat(e.target.value)})}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>System Currency</label>
                                <input 
                                    className="input-scanner" 
                                    style={{ width: '100%' }}
                                    value={editConfig.default_currency}
                                    onChange={e => setEditConfig({...editConfig, default_currency: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            className="btn btn-secondary" 
                            style={{ height: '40px', fontWeight: '700', marginTop: '10px' }}
                            onClick={handleUpdateConfig}
                            disabled={loading}
                        >
                            Save Configuration
                        </button>
                    </div>
                </div>

                {/* Pricing Rules Overview */}
                <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f472b6' }}></div>
                        <h2 style={{ fontSize: '16px', fontWeight: '800' }}>ACTIVE PRICING SCHEMA</h2>
                    </div>

                    {!config?.condition_types_seeded ? (
                         <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>Pricing rules have not been initialized for this tenant.</p>
                            <button className="btn btn-secondary" onClick={handleSeedDefaults} disabled={seeding}>
                                {seeding ? 'Initializing...' : 'Initialize Rule Table'}
                            </button>
                         </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#000', borderRadius: '8px', border: '1px solid #222' }}>
                                <div style={{ fontSize: '10px', color: '#f472b6', fontWeight: '900', marginBottom: '4px' }}>SCHEMA CODE</div>
                                <div style={{ fontSize: '16px', fontWeight: '800' }}>SXMM01</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>Standard SupplyX Purchasing Procedure</div>
                            </div>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #222' }}>
                                        <th style={{ padding: '8px' }}>STP</th>
                                        <th style={{ padding: '8px' }}>CTYP</th>
                                        <th style={{ padding: '8px' }}>CONDITION</th>
                                        <th style={{ padding: '8px' }}>CALC</th>
                                        <th style={{ padding: '8px' }}>BASE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(config?.condition_types || []).map((ct: any) => (
                                        <tr key={ct.step_number} style={{ borderBottom: '1px solid #111' }}>
                                            <td style={{ padding: '8px', color: '#888' }}>{ct.step_number}</td>
                                            <td style={{ padding: '8px', color: '#f472b6', fontWeight: '700' }}>{ct.code}</td>
                                            <td style={{ padding: '8px' }}>{ct.name}</td>
                                            <td style={{ padding: '8px', fontSize: '10px' }}>
                                                <span style={{ backgroundColor: '#222', padding: '2px 4px', borderRadius: '3px' }}>{ct.calculation_type}</span>
                                            </td>
                                            <td style={{ padding: '8px', color: '#888' }}>{ct.base_step ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Info Records Oversight */}
            <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '24px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f472b6' }}></div>
                    <h2 style={{ fontSize: '16px', fontWeight: '800' }}>SYSTEM-WIDE INFO RECORDS</h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #222' }}>
                                <th style={{ padding: '12px' }}>RECORD #</th>
                                <th style={{ padding: '12px' }}>SUPPLIER</th>
                                <th style={{ padding: '12px' }}>PRODUCT</th>
                                <th style={{ padding: '12px' }}>NEGOTIATED PRICE</th>
                                <th style={{ padding: '12px' }}>VALID TO</th>
                                <th style={{ padding: '12px' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {infoRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No active agreements found in system</td>
                                </tr>
                            ) : infoRecords.map(ir => (
                                <tr key={ir.id} style={{ borderBottom: '1px solid #111' }}>
                                    <td style={{ padding: '12px', fontWeight: '700', color: '#f472b6' }}>{ir.info_record_number}</td>
                                    <td style={{ padding: '12px' }}>{ir.supplier_name}</td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: '600' }}>{ir.product_code}</div>
                                        <div style={{ fontSize: '10px', color: '#888' }}>{ir.product_name}</div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700' }}>
                                            {ir.currency?.String} {parseFloat(ir.net_price?.Int || 0) / 10000}
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#666', marginLeft: '4px' }}>per {parseFloat(ir.per_quantity?.Int || 1) / 10000} {ir.per_unit?.String}</span>
                                    </td>
                                    <td style={{ padding: '12px' }}>{ir.valid_to?.Valid ? new Date(ir.valid_to.Time).toLocaleDateString() : 'INDETERMINATE'}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ backgroundColor: '#064e3b', color: '#34d399', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>ACTIVE</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {error && <div className="alert-banner error">{error}</div>}
            {success && <div className="alert-banner success">{success}</div>}
        </div>
    );
};

export default PricingConfig;
