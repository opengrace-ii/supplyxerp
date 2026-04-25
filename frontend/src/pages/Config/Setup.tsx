import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, InlineAlert } from '@/components/ui/Form';
import { SectionTabs } from '@/components/ui/SectionTabs';
import { cn } from '@/lib/cn';

export const Setup: React.FC = () => {
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
    const [pendingProfile, setPendingProfile] = useState<string | null>(null);
    const [showGoLiveModal, setShowGoLiveModal] = useState(false);
    const [goLiveDate, setGoLiveDate] = useState("");

    const fetchData = useCallback(async () => {
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
            if (c.config.go_live_date) setGoLiveDate(c.config.go_live_date);
        } catch (err: any) {
            setError('Failed to fetch configuration');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApplyProfile = async () => {
        if (!pendingProfile) return;
        setLoading(true);
        setError(null);
        try {
            await api.applyProfile(pendingProfile);
            setSuccess(`Profile ${pendingProfile} applied successfully`);
            setPendingProfile(null);
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
        setError(null);
        try {
            const updateField = type === 'GR' ? 'gr_number_format' : type === 'PO' ? 'po_number_format' : type === 'HU' ? 'hu_code_format' : 'so_number_format';
            await api.updateTenantConfig({ ...config, [updateField]: item.format });
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
                formData.append('zone_id', '1');
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
            await api.adminReset(resetConfirm);
            setSuccess('Tenant data reset successfully.');
            setResetConfirm('');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSetGoLive = async () => {
        if (!goLiveDate) return;
        try {
            await api.updateGoLiveDate(goLiveDate);
            setShowGoLiveModal(false);
            fetchData();
        } catch (err) { setError("Failed to update go-live date"); }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 overflow-y-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Technical Setup</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">Tenant configuration · Number sequences · Migration control</p>
                </div>
            </div>

            <SectionTabs
                tabs={[
                    { key: 'profile', label: 'Profiles' },
                    { key: 'sequences', label: 'Sequences' },
                    { key: 'migration', label: 'Migration' },
                    { key: 'system', label: 'System' }
                ]}
                active={activeTab}
                onChange={(key) => setActiveTab(key as any)}
            />

            {error && <InlineAlert type="error" message={error} />}
            {success && <InlineAlert type="success" message={success} />}

            <div className="flex-1">
                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {profiles && Object.entries(profiles).map(([name, traits]: [string, any]) => {
                            const isActive = config?.domain_profile === name;
                            return (
                                <Card key={name} className={cn("cursor-pointer transition-all hover:border-[var(--accent)]/40", isActive ? "border-[var(--accent)]" : "opacity-60")} onClick={() => !isActive && setPendingProfile(name)}>
                                    <CardBody className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <h3 className={cn("text-lg font-black tracking-tight", isActive ? "text-[var(--accent)]" : "text-[var(--text-1)]")}>{name}</h3>
                                            {isActive && <Badge variant="amber">ACTIVE</Badge>}
                                        </div>
                                        <ul className="text-xs text-[var(--text-3)] space-y-2 font-medium">
                                            <li className="flex items-center gap-2">
                                                <span className={traits.has_production ? "text-green-500" : "text-white/10"}>●</span>
                                                Production Capabilities
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className={traits.batch ? "text-green-500" : "text-white/10"}>●</span>
                                                Batch Tracking
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="text-[var(--accent)]">●</span>
                                                Default UOM: {traits.uom}
                                            </li>
                                        </ul>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'sequences' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {['GR', 'PO', 'HU', 'SO'].map(type => {
                            const item = (seqEdit as any)[type];
                            const preview = item.format.replace('{YEAR}', new Date().getFullYear()).replace('{SEQ}', String(item.start).padStart(5, '0'));
                            return (
                                <Card key={type}>
                                    <CardHeader title={`${type} SEQUENCE`} />
                                    <CardBody className="space-y-4">
                                        <Field label="NUMBER FORMAT"><Input value={item.format} onChange={e => setSeqEdit({...seqEdit, [type]: {...item, format: e.target.value}})} /></Field>
                                        <Field label="START FROM"><Input type="number" value={item.start} onChange={e => setSeqEdit({...seqEdit, [type]: {...item, start: parseInt(e.target.value)}})} /></Field>
                                        <div className="p-3 bg-[var(--bg-base)] rounded-lg border border-[var(--border)] font-mono text-[11px] text-green-500 flex justify-between">
                                            <span className="opacity-40">NEXT:</span>
                                            <span className="font-bold">{preview}</span>
                                        </div>
                                        <Button variant="primary" className="w-full h-9 text-[10px]" onClick={() => handleApplySequence(type)}>RESEED SEQUENCE</Button>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'migration' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="lg:col-span-4 space-y-6">
                            <Card>
                                <CardHeader title="Migration Checklist" />
                                <CardBody className="space-y-4">
                                    {[
                                        { label: 'Products Imported', done: migrationStatus?.products_count > 0, val: migrationStatus?.products_count },
                                        { label: 'Opening Balances', done: migrationStatus?.opening_balances_posted > 0, val: migrationStatus?.opening_balances_posted },
                                        { label: 'Go-live Date Set', done: !!config?.go_live_date, val: config?.go_live_date || 'PENDING' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black", item.done ? "bg-green-500 text-black" : "bg-white/5 text-[var(--text-4)]")}>
                                                    {item.done ? "✓" : "○"}
                                                </div>
                                                <span className={cn("text-xs font-bold", item.done ? "text-[var(--text-1)]" : "text-[var(--text-4)]")}>{item.label}</span>
                                            </div>
                                            <span className="text-[10px] font-mono opacity-40">{item.val}</span>
                                        </div>
                                    ))}
                                </CardBody>
                            </Card>
                        </div>

                        <div className="lg:col-span-8 space-y-6">
                            <Card>
                                <CardHeader title="Bulk Data Ingestion" />
                                <CardBody>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="text-[10px] font-black text-[var(--text-4)] uppercase tracking-widest px-1">Material Master</div>
                                            <input  style={{ background:'var(--bg-input)', color:'var(--text-1)', border:'1px solid var(--border-hi)', borderRadius:'6px', padding:'0 10px', height:'36px', width:'100%', fontFamily:'var(--font-sans)', fontSize:'13px', outline:'none' }} type="file" accept=".csv" className="hidden" id="csv-p" onChange={(e) => e.target.files && handleFileUpload('products', e.target.files[0])} />
                                            <label htmlFor="csv-p" className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[var(--border)] rounded-2xl cursor-pointer hover:bg-white/5 hover:border-[var(--accent)]/40 transition-all text-[var(--text-4)] hover:text-[var(--text-2)]">
                                                <span className="text-2xl mb-2">📦</span>
                                                <span className="text-xs font-bold uppercase tracking-widest">Upload Materials CSV</span>
                                            </label>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="text-[10px] font-black text-[var(--text-4)] uppercase tracking-widest px-1">Opening Balances</div>
                                            <input  style={{ background:'var(--bg-input)', color:'var(--text-1)', border:'1px solid var(--border-hi)', borderRadius:'6px', padding:'0 10px', height:'36px', width:'100%', fontFamily:'var(--font-sans)', fontSize:'13px', outline:'none' }} type="file" accept=".csv" className="hidden" id="csv-ob" onChange={(e) => e.target.files && handleFileUpload('ob', e.target.files[0])} />
                                            <label htmlFor="csv-ob" className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[var(--border)] rounded-2xl cursor-pointer hover:bg-white/5 hover:border-[var(--accent)]/40 transition-all text-[var(--text-4)] hover:text-[var(--text-2)]">
                                                <span className="text-2xl mb-2">⚖️</span>
                                                <span className="text-xs font-bold uppercase tracking-widest">Upload Balances CSV</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-[var(--border)] flex justify-end">
                                        <Button variant="primary" onClick={() => setShowGoLiveModal(true)}>CALIBRATE GO-LIVE DATE</Button>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 bg-red-500/[0.03] border border-red-500/20 rounded-2xl text-center space-y-4">
                            <div className="text-4xl">⚠️</div>
                            <h3 className="text-lg font-black text-red-500 uppercase tracking-tighter">Danger Zone</h3>
                            <p className="text-xs text-red-500/60 leading-relaxed font-medium">
                                Executing a reset will permanently delete all operational data for this tenant. 
                                This includes all Transactions, Movements, and Ledger history. This action cannot be undone.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <Field label='TYPE "RESET TENANT" TO CONFIRM'>
                                <Input 
                                    className="text-center font-black uppercase tracking-widest" 
                                    placeholder="..." 
                                    value={resetConfirm}
                                    onChange={e => setResetConfirm(e.target.value)}
                                />
                            </Field>
                            <Button 
                                variant="danger" 
                                className="w-full h-12 font-black tracking-widest" 
                                disabled={resetConfirm !== 'RESET TENANT' || loading}
                                onClick={handleReset}
                            >
                                EXECUTE DESTRUCTIVE RESET
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal open={!!pendingProfile} onClose={() => setPendingProfile(null)} title="Confirm Profile Change" subtitle="Changing the domain profile will alter fundamental operational rules.">
                <div className="space-y-6">
                    <p className="text-sm text-[var(--text-2)]">
                        Are you sure you want to apply the <span className="text-[var(--accent)] font-bold">{pendingProfile}</span> profile? 
                        This will update system-wide defaults for UOMs, batch tracking requirements, and production logic.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handleApplyProfile}>CONFIRM PROFILE CHANGE</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setPendingProfile(null)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>

            <Modal open={showGoLiveModal} onClose={() => setShowGoLiveModal(false)} title="Set Go-Live Boundary" subtitle="Financial and operational start date for the tenant.">
                <div className="space-y-6">
                    <Field label="GO-LIVE DATE (YYYY-MM-DD)">
                        <Input type="date" value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} />
                    </Field>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handleSetGoLive}>APPLY DATE</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowGoLiveModal(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Setup;
