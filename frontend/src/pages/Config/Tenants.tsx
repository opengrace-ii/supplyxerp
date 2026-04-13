import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

export const Tenants: React.FC = () => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', slug: '' });
    const [error, setError] = useState<string | null>(null);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const data = await api.getTenants();
            setTenants(data);
        } catch (err) {
            console.error("Failed to fetch tenants", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        const slug = name.toLowerCase().replace(/[^a-z0-p]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setFormData({ name, slug });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await api.createTenant(formData);
            setFormData({ name: '', slug: '' });
            setShowForm(false);
            fetchTenants();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create tenant");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--theme-accent)' }}>Tenants</h1>
                    <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Manage organizational units and instances</p>
                </div>
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? 'Cancel' : '+ Add Tenant'}
                </button>
            </div>

            {/* Table */}
            <div style={{ 
                backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--theme-border)', 
                borderRadius: '8px', overflow: 'hidden' 
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Name</th>
                            <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Slug</th>
                            <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Created</th>
                            <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--theme-border)', color: '#ccc' }}>
                                <td style={{ padding: '12px', color: '#fff', fontWeight: '500' }}>{t.name}</td>
                                <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--theme-accent)' }}>{t.slug}</td>
                                <td style={{ padding: '12px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ 
                                        backgroundColor: '#16a34a33', color: '#22c55e', 
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' 
                                    }}>ACTIVE</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Form */}
            {showForm && (
                <div style={{ 
                    marginTop: '10px', padding: '20px', backgroundColor: 'var(--theme-light)', 
                    border: '1px solid var(--theme-border)', borderRadius: '8px' 
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>New Tenant</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Tenant Name</label>
                            <input 
                                type="text" 
                                className="input-scanner" 
                                placeholder="e.g. TechLogix Germany" 
                                value={formData.name}
                                onChange={handleNameChange}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Slug (Permanent)</label>
                            <input 
                                type="text" 
                                className="input-scanner" 
                                value={formData.slug}
                                readOnly
                                style={{ width: '100%', opacity: 0.6 }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button type="submit" className="btn btn-primary">Save Tenant</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                    {error && (
                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#ef4444' }}>{error}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Tenants;
