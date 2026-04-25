import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, InlineAlert } from '@/components/ui/Form';
import { cn } from '@/lib/cn';

export const Tenants: React.FC = () => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', slug: '' });
    const [error, setError] = useState<string | null>(null);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/tenants');
            setTenants(res.data || []);
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
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setFormData({ name, slug });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await apiClient.post('/api/tenants', formData);
            setFormData({ name: '', slug: '' });
            setShowForm(false);
            fetchTenants();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create tenant");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 overflow-y-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Tenants</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">Manage organizational units and instances</p>
                </div>
                <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'CANCEL' : '+ ADD TENANT'}
                </Button>
            </div>

            {showForm && (
                <Card className="border-[var(--accent)]/20 animate-in slide-in-from-top-4 duration-300">
                    <CardHeader title="Create New Tenant" subtitle="Provision a new dedicated instance" />
                    <CardBody>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field label="TENANT NAME">
                                    <Input 
                                        placeholder="e.g. TechLogix Germany" 
                                        value={formData.name}
                                        onChange={handleNameChange}
                                        required
                                    />
                                </Field>
                                <Field label="SLUG (PERMANENT)">
                                    <Input 
                                        value={formData.slug}
                                        readOnly
                                        className="opacity-50 font-mono"
                                    />
                                </Field>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                                <Button type="submit" variant="primary" className="px-8">PROVISION TENANT</Button>
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>CANCEL</Button>
                            </div>
                        </form>
                        {error && <InlineAlert type="error" message={error} className="mt-4" />}
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'name', header: 'NAME', className: 'font-bold text-[var(--text-1)]' },
                            { key: 'slug', header: 'SLUG', mono: true, className: 'text-[var(--accent)]' },
                            { key: 'created_at', header: 'CREATED', render: (v) => new Date(v.created_at).toLocaleDateString(), className: 'opacity-50' },
                            { 
                                key: 'status', 
                                header: 'STATUS', 
                                render: () => <Badge variant="green">ACTIVE</Badge>
                            }
                        ]}
                        rows={tenants}
                        loading={loading}
                    />
                </CardBody>
            </Card>
        </div>
    );
};

export default Tenants;
