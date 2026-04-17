import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

type TreeNode = {
    type: 'organisation' | 'site' | 'zone';
    id: number;
    public_id: string;
    name: string;
    code?: string;
    currency?: string;
    zone_type?: string;
    sites?: TreeNode[];
    zones?: TreeNode[];
};

const OrgStructure: React.FC = () => {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [formMode, setFormMode] = useState<'none' | 'org' | 'site' | 'zone'>('none');
    const [formData, setFormData] = useState<any>({});

    const fetchTree = async () => {
        setLoading(true);
        try {
            const res = await api.getOrgTree();
            setTree(res);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load org tree');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTree();
    }, []);

    const handleNodeClick = (node: TreeNode) => {
        setSelectedNode(node);
        setFormMode('none');
    };

    const getZoneColor = (type: string) => {
        switch (type) {
            case 'RECEIVING': return '#3b82f6'; // blue
            case 'STORAGE': return '#9ca3af';   // gray
            case 'PRODUCTION': return '#f59e0b';// amber
            case 'DISPATCH': return '#22c55e';  // green
            case 'QC': return '#ef4444';        // red
            default: return '#fff';
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formMode === 'org') {
                await api.createOrg({
                    name: formData.name,
                    legal_name: formData.legal_name,
                    currency: formData.currency || 'USD',
                    fiscal_year_start: Number(formData.fiscal_year_start || 1)
                });
            } else if (formMode === 'site' && selectedNode?.type === 'organisation') {
                await api.createSite(selectedNode.public_id, {
                    code: formData.code.toUpperCase(),
                    name: formData.name,
                    timezone: formData.timezone || 'UTC'
                });
            } else if (formMode === 'zone' && selectedNode?.type === 'site') {
                await api.createZone(selectedNode.public_id, {
                    code: formData.code.toUpperCase(),
                    name: formData.name,
                    zone_type: formData.zone_type || 'STORAGE'
                });
            }
            // Refresh tree and reset form
            await fetchTree();
            setFormMode('none');
            setFormData({});
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save');
        }
    };

    // Auto-provision status checks
    const currentOrg = tree.length > 0 ? tree[0] : null;
    const currentSite = currentOrg?.sites && currentOrg.sites.length > 0 ? currentOrg.sites[0] : null;
    const currentZones = currentSite?.zones || [];
    const hasReceiving = currentZones.some(z => z.zone_type === 'RECEIVING');
    const hasStorage = currentZones.some(z => z.zone_type === 'STORAGE');
    const hasProduction = currentZones.some(z => z.zone_type === 'PRODUCTION');
    const hasDispatch = currentZones.some(z => z.zone_type === 'DISPATCH');
    const allDefaultsPresent = hasReceiving && hasStorage && hasProduction && hasDispatch;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f472b6' }}>Org Structure</h1>
                <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>Organisation · Sites · Zones · Auto-provisioning</p>
                
                {error && (
                    <div style={{ 
                        marginTop: '16px', 
                        padding: '12px 16px', 
                        backgroundColor: 'rgba(239,68,68,0.1)', 
                        border: '1px solid #ef4444', 
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️</span> {error}
                        </div>
                        <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                {/* Left Panel: Tree View */}
                <div style={{ 
                    flex: '0 0 35%', 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '8px',
                    padding: '16px',
                    overflowY: 'auto'
                }}>
                    <h3 style={{ fontSize: '13px', color: '#aaa', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 600 }}>Hierarchy</h3>
                    
                    {loading && tree.length === 0 ? (
                        <div style={{ color: '#666', fontSize: '13px' }}>Loading...</div>
                    ) : tree.map(org => (
                        <div key={`org-${org.id}`} style={{ marginBottom: '16px' }}>
                            {/* Org Node */}
                            <div 
                                onClick={() => handleNodeClick(org)}
                                style={{ 
                                    padding: '8px', 
                                    cursor: 'pointer', 
                                    backgroundColor: selectedNode?.id === org.id && selectedNode?.type === 'organisation' ? 'rgba(244,114,182,0.1)' : 'transparent',
                                    border: selectedNode?.id === org.id && selectedNode?.type === 'organisation' ? '1px solid #f472b6' : '1px solid transparent',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span style={{ color: '#f472b6' }}>🏢</span> {org.name}
                            </div>
                            
                            {/* Sites */}
                            <div style={{ paddingLeft: '24px', borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '12px', marginTop: '4px' }}>
                                {Array.isArray(org.sites) && org.sites.map(site => (
                                    <div key={`site-${site.id}`}>
                                        <div 
                                            onClick={() => handleNodeClick(site)}
                                            style={{ 
                                                padding: '6px 8px', 
                                                cursor: 'pointer',
                                                backgroundColor: selectedNode?.id === site.id && selectedNode?.type === 'site' ? 'rgba(244,114,182,0.1)' : 'transparent',
                                                border: selectedNode?.id === site.id && selectedNode?.type === 'site' ? '1px solid #f472b6' : '1px solid transparent',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginTop: '4px'
                                            }}
                                        >
                                            <span style={{ color: '#ccc' }}>📍</span> {site.code} — {site.name}
                                        </div>

                                        {/* Zones */}
                                        <div style={{ paddingLeft: '24px', borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '12px', marginTop: '4px' }}>
                                            {Array.isArray(site.zones) && site.zones.map(zone => (
                                                <div 
                                                    key={`zone-${zone.id}`}
                                                    onClick={() => handleNodeClick(zone)}
                                                    style={{ 
                                                        padding: '4px 8px', 
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedNode?.id === zone.id && selectedNode?.type === 'zone' ? 'rgba(244,114,182,0.1)' : 'transparent',
                                                        border: selectedNode?.id === zone.id && selectedNode?.type === 'zone' ? '1px solid #f472b6' : '1px solid transparent',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        marginTop: '2px'
                                                    }}
                                                >
                                                    <span style={{
                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                        backgroundColor: getZoneColor(zone.zone_type || '')
                                                    }}></span>
                                                    {zone.code} — {zone.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => { setSelectedNode(null); setFormMode('org'); setFormData({}); }}
                        style={{ marginTop: '16px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: '#aaa', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', width: '100%' }}
                    >
                        + Add Organisation
                    </button>
                </div>

                {/* Right Panel: Detail / Edit / Auto-provision Status */}
                <div style={{ flex: '1' }}>
                    {!selectedNode && formMode === 'none' && (
                        <div style={{ 
                            backgroundColor: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '8px', 
                            padding: '24px' 
                        }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Auto-provision Status</h2>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ backgroundColor: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.2)', padding: '16px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#f472b6', textTransform: 'uppercase', marginBottom: '4px' }}>Organisations</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{tree.length}</div>
                                </div>
                                <div style={{ backgroundColor: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.2)', padding: '16px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#f472b6', textTransform: 'uppercase', marginBottom: '4px' }}>Sites</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{tree.reduce((acc, o) => acc + (o.sites?.length || 0), 0)}</div>
                                </div>
                                <div style={{ backgroundColor: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.2)', padding: '16px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#f472b6', textTransform: 'uppercase', marginBottom: '4px' }}>Zones</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                                        {tree.reduce((acc, o) => acc + (o.sites?.reduce((acc2, s) => acc2 + (s.zones?.length || 0), 0) || 0), 0)}
                                    </div>
                                </div>
                            </div>
                            
                            {allDefaultsPresent ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '14px', backgroundColor: 'rgba(34,197,94,0.1)', padding: '12px 16px', borderRadius: '6px' }}>
                                    <span>✓</span> All 4 default zones are present. The system is ready for operations.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#f59e0b', fontSize: '14px', backgroundColor: 'rgba(245,158,11,0.1)', padding: '12px 16px', borderRadius: '6px' }}>
                                    <span style={{ flex: 1 }}>⚠ Missing default zones (RECEIVING, STORAGE, PRODUCTION, DISPATCH).</span>
                                    <button 
                                        onClick={async () => {
                                            if (!currentOrg) return;
                                            try {
                                                await api.provisionOrgDefaults(currentOrg.public_id);
                                                fetchTree();
                                            } catch (err: any) {
                                                alert(err.response?.data?.error || 'Provisioning failed');
                                            }
                                        }}
                                        style={{ backgroundColor: '#f59e0b', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Re-provision defaults
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedNode && formMode === 'none' && (
                        <div style={{ 
                            backgroundColor: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '8px', 
                            padding: '24px' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#f472b6', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>{selectedNode.type}</div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '600' }}>
                                        {selectedNode.code ? `${selectedNode.code} — ` : ''}{selectedNode.name}
                                    </h2>
                                </div>
                                
                                {selectedNode.type === 'organisation' && (
                                    <button 
                                        onClick={() => { setFormMode('site'); setFormData({}); }}
                                        style={{ backgroundColor: '#f472b6', color: '#000', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        + Add Site
                                    </button>
                                )}
                                {selectedNode.type === 'site' && (
                                    <button 
                                        onClick={() => { setFormMode('zone'); setFormData({}); }}
                                        style={{ backgroundColor: '#f472b6', color: '#000', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        + Add Zone
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                {selectedNode.currency && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Currency</div>
                                        <div style={{ fontSize: '16px' }}>{selectedNode.currency}</div>
                                    </div>
                                )}
                                {selectedNode.zone_type && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Zone Type</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{
                                                width: '10px', height: '10px', borderRadius: '50%',
                                                backgroundColor: getZoneColor(selectedNode.zone_type)
                                            }}></span>
                                            <span style={{ fontSize: '16px' }}>{selectedNode.zone_type}</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Public ID</div>
                                    <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#aaa', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{selectedNode.public_id}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {formMode !== 'none' && (
                        <div style={{ 
                            backgroundColor: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '8px', 
                            padding: '24px' 
                        }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
                                Add New {formMode === 'org' ? 'Organisation' : formMode === 'site' ? 'Site' : 'Zone'}
                            </h2>
                            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {formMode === 'org' && (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Organisation Name</label>
                                            <input type="text" style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Legal Name</label>
                                            <input type="text" style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.legal_name || ''} onChange={e => setFormData({...formData, legal_name: e.target.value})} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Currency</label>
                                                <select style={{ width: '100%', padding: '8px 12px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.currency || 'USD'} onChange={e => setFormData({...formData, currency: e.target.value})}>
                                                    <option value="USD">USD - US Dollar</option>
                                                    <option value="GBP">GBP - British Pound</option>
                                                    <option value="EUR">EUR - Euro</option>
                                                    <option value="INR">INR - Indian Rupee</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Fiscal Year Start (1-12)</label>
                                                <input type="number" min="1" max="12" style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.fiscal_year_start || 1} onChange={e => setFormData({...formData, fiscal_year_start: e.target.value})} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {formMode === 'site' && (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Site Code</label>
                                            <input type="text" style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} required placeholder="e.g. SITE-UK" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Site Name</label>
                                            <input type="text" style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Manchester Distribution Centre" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Timezone</label>
                                            <select style={{ width: '100%', padding: '8px 12px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.timezone || 'UTC'} onChange={e => setFormData({...formData, timezone: e.target.value})}>
                                                <option value="UTC">UTC</option>
                                                <option value="Europe/London">Europe/London</option>
                                                <option value="America/New_York">America/New_York</option>
                                                <option value="Asia/Dubai">Asia/Dubai</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {formMode === 'zone' && (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Zone Code</label>
                                            <input type="text" style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} required placeholder="e.g. RECV-01" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Zone Name</label>
                                            <input type="text" style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Main Receiving Bay" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Zone Type</label>
                                            <select style={{ width: '100%', padding: '8px 12px', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff' }} value={formData.zone_type || 'STORAGE'} onChange={e => setFormData({...formData, zone_type: e.target.value})}>
                                                <option value="RECEIVING">RECEIVING (Inbound verification)</option>
                                                <option value="STORAGE">STORAGE (Unrestricted stock)</option>
                                                <option value="PRODUCTION">PRODUCTION (Consumption allowed)</option>
                                                <option value="DISPATCH">DISPATCH (Outbound verification)</option>
                                                <option value="QC">QC (Quality Control blocked)</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                    <button type="submit" style={{ backgroundColor: '#f472b6', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
                                        Save {formMode === 'org' ? 'Organisation' : formMode === 'site' ? 'Site' : 'Zone'}
                                    </button>
                                    <button type="button" onClick={() => setFormMode('none')} style={{ backgroundColor: 'transparent', color: '#aaa', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrgStructure;
