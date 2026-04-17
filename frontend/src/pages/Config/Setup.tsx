import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

const Setup: React.FC = () => {
    const { user } = useAppStore();
    const [activeTab, setActiveTab] = useState<'profile' | 'sequences' | 'migration' | 'system'>('profile');
    const [config, setConfig] = useState<any>(null);
    const [profiles, setProfiles] = useState<any>(null);
    const [migrationStatus, setMigrationStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Sequence editing state
    const [seqEdit, setSeqEdit] = useState({
        GR: { format: '', start: 1 },
        PO: { format: '', start: 1 },
        HU: { format: '', start: 1 },
        SO: { format: '', start: 1 }
    });

    const [resetConfirm, setResetConfirm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [c, p, m] = await Promise.all([
                api.getTenantConfig(),
                api.getProfiles(),
                api.getMigrationStatus()
            ]);
            setConfig(c.config);
            setProfiles(p);
            setMigrationStatus(m);
            setSeqEdit({
                GR: { format: c.config.gr_number_format, start: c.config.gr_sequence_start },
                PO: { format: c.config.po_number_format, start: c.config.po_sequence_start },
                HU: { format: c.config.hu_code_format, start: c.config.hu_sequence_start },
                SO: { format: c.config.so_number_format, start: c.config.so_sequence_start }
            });
        } catch (err: any) {
            setError('Failed to fetch configuration');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleApplyProfile = async (profile: string) => {
        if (!window.confirm(`Apply ${profile} profile? This will update tracking and operational defaults.`)) return;
        setLoading(true);
        try {
            await api.applyProfile(profile);
            setSuccess(`Profile ${profile} applied successfully`);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to apply profile');
        } finally {
            setLoading(false);
        }
    };

    const handleApplySequence = async (type: string) => {
        const item = (seqEdit as any)[type];
        setLoading(true);
        try {
            // Update format first
            const updateField = type === 'GR' ? 'gr_number_format' : type === 'PO' ? 'po_number_format' : type === 'HU' ? 'hu_code_format' : 'so_number_format';
            await api.updateTenantConfig({ ...config, [updateField]: item.format });
            
            // Apply re-seed
            await api.applySequence(type, item.start);
            setSuccess(`${type} sequence updated and re-seeded`);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || `Failed to update ${type} sequence`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (type: 'products' | 'ob', file: File) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (type === 'ob') {
                formData.append('import_date', new Date().toISOString().split('T')[0]);
                formData.append('zone_id', '1'); // Default to first zone
            }
            const res = type === 'products' ? await api.importProducts(formData) : await api.importOpeningBalances(formData);
            setSuccess(`${type === 'products' ? 'Products' : 'Opening balances'} imported: ${res.success} success, ${res.failed} failed`);
            fetchData();
        } catch (err: any) {
            setError('CSV import failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (resetConfirm !== 'RESET TENANT') return;
        setLoading(true);
        try {
            const res = await api.adminReset(resetConfirm);
            setSuccess('Tenant data reset successfully. Snapshot: ' + JSON.stringify(res.snapshot));
            setResetConfirm('');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    const renderProfileTab = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {profiles && Object.entries(profiles).map(([name, traits]: [string, any]) => (
                <div key={name} style={{
                    backgroundColor: 'var(--theme-light)', border: `1px solid ${config?.domain_profile === name ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
                    borderRadius: '12px', padding: '20px', position: 'relative', cursor: 'pointer',
                    transition: 'transform 0.2s', filter: config?.domain_profile === name ? 'none' : 'grayscale(0.5)'
                }} onClick={() => handleApplyProfile(name)}>
                    {config?.domain_profile === name && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', backgroundColor: 'var(--theme-accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>ACTIVE</div>
                    )}
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: config?.domain_profile === name ? 'var(--theme-accent)' : '#fff' }}>{name}</h3>
                    <ul style={{ fontSize: '11px', color: '#888', padding: '10px 0 0 16px', margin: 0 }}>
                        <li>{traits.has_production ? '✓ Production' : '× No Production'}</li>
                        <li>{traits.batch ? '✓ Batch Tracking' : '× No Batches'}</li>
                        <li>Default UOM: {traits.uom}</li>
                    </ul>
                </div>
            ))}
        </div>
    );

    const renderSequenceCard = (type: string, label: string) => {
        const item = (seqEdit as any)[type];
        const preview = item.format.replace('{YEAR}', new Date().getFullYear()).replace('{SEQ}', String(item.start).padStart(5, '0'));
        return (
            <div key={type} style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--theme-accent)', marginBottom: '16px' }}>{label} SEQUENCE</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '10px', color: '#888' }}>NUMBER FORMAT</label>
                        <input className="input-scanner" value={item.format} onChange={e => setSeqEdit({...seqEdit, [type]: {...item, format: e.target.value}})} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '10px', color: '#888' }}>START FROM</label>
                        <input type="number" className="input-scanner" value={item.start} onChange={e => setSeqEdit({...seqEdit, [type]: {...item, start: parseInt(e.target.value)}})} style={{ width: '100%' }} />
                    </div>
                    <div style={{ fontSize: '12px', padding: '10px', backgroundColor: '#000', borderRadius: '6px', border: '1px solid #222', color: '#22c55e', fontFamily: 'monospace' }}>
                        NEXT: {preview}
                    </div>
                    <button className="btn btn-secondary" style={{ width: '100%', height: '36px' }} onClick={() => handleApplySequence(type)} disabled={loading}>
                        Apply & Reseed
                    </button>
                </div>
            </div>
        );
    };

    const renderMigrationTab = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>MIGRATION CHECKLIST</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: migrationStatus?.products_count > 0 ? '#22c55e' : '#666' }}>
                   <span>{migrationStatus?.products_count > 0 ? '✓' : '○'}</span> Products imported ({migrationStatus?.products_count || 0})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: migrationStatus?.opening_balances_posted > 0 ? '#22c55e' : '#666' }}>
                   <span>{migrationStatus?.opening_balances_posted > 0 ? '✓' : '○'}</span> Opening balances posted ({migrationStatus?.opening_balances_posted || 0})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: config?.go_live_date ? '#22c55e' : '#666' }}>
                   <span>{config?.go_live_date ? '✓' : '○'}</span> Go-live date set ({config?.go_live_date || 'Not set'})
                </div>
            </div>

            {/* Uploads */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--theme-accent)', marginBottom: '8px' }}>BULK IMPORTS</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>PRODUCT MASTER DATA</div>
                            <input type="file" accept=".csv" onChange={(e) => e.target.files && handleFileUpload('products', e.target.files[0])}  style={{ display: 'none' }} id="csv-p" />
                            <label htmlFor="csv-p" className="btn btn-secondary" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                Upload Products CSV
                            </label>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>OPENING BALANCES</div>
                            <input type="file" accept=".csv" onChange={(e) => e.target.files && handleFileUpload('ob', e.target.files[0])} style={{ display: 'none' }} id="csv-ob" />
                            <label htmlFor="csv-ob" className="btn btn-secondary" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                Upload Stock CSV
                            </label>
                        </div>
                    </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary" onClick={() => {
                        const date = window.prompt("Enter Go-live date (YYYY-MM-DD):");
                        if (date) api.updateGoLiveDate(date).then(() => fetchData());
                    }}>Set Go-live Date</button>
                </div>
            </div>
        </div>
    );

    const renderSystemTab = () => (
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '10px' }}>⚠️ DANGER ZONE</h3>
                <p style={{ fontSize: '12px', opacity: 0.8 }}>Executing a reset will permanently delete all operational data for this tenant, including Good Receipts, HUs, and Ledger events.</p>
            </div>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '8px' }}>TYPE "RESET TENANT" TO CONFIRM</label>
                <input className="input-scanner" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} style={{ width: '100%', textAlign: 'center' }} placeholder="..." />
            </div>
            
            <button className="btn" style={{ 
                backgroundColor: resetConfirm === 'RESET TENANT' ? '#ef4444' : '#222',
                color: '#fff', width: '100%', height: '48px', fontWeight: '700'
            }} disabled={resetConfirm !== 'RESET TENANT' || loading} onClick={handleReset}>
                EXECUTE TENANT RESET
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--theme-accent)' }}>SETUP COCKPIT</h1>
                    <p style={{ fontSize: '14px', color: '#888' }}>Tenant onboarding and operational configurability</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '30px', borderBottom: '1px solid var(--theme-border)' }}>
                {['profile', 'sequences', 'migration', 'system'].map(tab => (
                    <button key={tab} 
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                            padding: '12px 4px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase',
                            backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                            color: activeTab === tab ? 'var(--theme-accent)' : '#666',
                            borderBottom: activeTab === tab ? '2px solid var(--theme-accent)' : '2px solid transparent'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={{ marginTop: '10px' }}>
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'sequences' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {renderSequenceCard('GR', 'GOODS RECEIPT')}
                        {renderSequenceCard('PO', 'PURCHASE ORDER')}
                        {renderSequenceCard('HU', 'HANDLING UNIT')}
                        {renderSequenceCard('SO', 'SALES ORDER')}
                    </div>
                )}
                {activeTab === 'migration' && renderMigrationTab()}
                {activeTab === 'system' && renderSystemTab()}
            </div>

            {error && <div className="alert-banner error">{error}</div>}
            {success && <div className="alert-banner success">{success}</div>}
        </div>
    );
};

export default Setup;
