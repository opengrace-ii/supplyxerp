import React, { useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select, InlineAlert } from '@/components/ui/Form';
import { cn } from '@/lib/cn';

export const AIStudio: React.FC = () => {
    const [view, setView] = useState<'customisation' | 'agents' | 'automation'>('customisation');

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)]">
            <div className="p-8 border-b border-[var(--border)] bg-[var(--bg-surface2)]">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">AI Studio</h1>
                            <Badge variant="purple">EXPERIMENTAL</Badge>
                        </div>
                        <p className="text-sm text-[var(--text-3)]">No-code field customisation · Agent personality · Workflow automation</p>
                    </div>
                </div>
                
                <div className="flex gap-6 mt-8">
                    {[
                        { id: 'customisation', label: 'Field Customisation', icon: '🛠️' },
                        { id: 'agents', label: 'Agent Personalities', icon: '🧠' },
                        { id: 'automation', label: 'Workflow Rules', icon: '⚡' }
                    ].map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => setView(t.id as any)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg transition-all border",
                                view === t.id 
                                    ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--text-1)]" 
                                    : "bg-transparent border-transparent text-[var(--text-4)] hover:bg-[var(--bg-surface3)] hover:text-[var(--text-2)]"
                            )}
                        >
                            <span>{t.icon}</span>
                            <span className="text-xs font-bold uppercase tracking-widest">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
                {view === 'customisation' && <FieldCustomisation />}
                {view !== 'customisation' && (
                    <div className="flex flex-col items-center justify-center h-[400px] text-[var(--text-4)]">
                        <span className="text-4xl mb-4 opacity-20">🚧</span>
                        <p className="text-sm font-medium">This AI Studio capability is currently being provisioned.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const FieldCustomisation: React.FC = () => {
    const [selectedTable, setSelectedTable] = useState('products');
    
    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-1)]">Schema Expansion</h2>
                    <p className="text-xs text-[var(--text-4)] mt-1">Add custom fields to any master data entity using natural language.</p>
                </div>
                <Button variant="primary">+ Create Custom Field</Button>
            </div>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-4 space-y-2">
                    {['products', 'suppliers', 'purchase_orders', 'customers'].map(t => (
                        <div 
                            key={t}
                            onClick={() => setSelectedTable(t)}
                            className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all",
                                selectedTable === t 
                                    ? "bg-[var(--bg-surface3)] border-[var(--accent)]" 
                                    : "bg-transparent border-[var(--border)] hover:border-[var(--text-4)]"
                            )}
                        >
                            <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-1">Entity</div>
                            <div className="text-xs font-bold text-[var(--text-1)] uppercase">{t.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>

                <div className="col-span-8 space-y-6">
                    <Card>
                        <CardBody className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-[var(--accent)] uppercase tracking-tighter">AI Field Generator</h3>
                                <Badge variant="green">CONNECTED</Badge>
                            </div>

                            <div className="p-6 bg-[var(--bg-input)] rounded-2xl border border-[var(--border)] space-y-4">
                                <p className="text-xs text-[var(--text-3)] leading-relaxed italic">
                                    "I need to track 'Sustainability Rating' for all products. It should be a dropdown with 'A', 'B', 'C' options and affect the Supplier Scorecard."
                                </p>
                                <div className="h-px bg-[var(--border)]" />
                                <div className="flex gap-3">
                                    <Input placeholder="Describe the field you want to add..." className="flex-1" />
                                    <Button variant="primary">Generate Schema</Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest">Active Custom Fields</h4>
                                <div className="p-4 bg-[var(--bg-surface3)] rounded-xl border border-[var(--border)] flex justify-between items-center opacity-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[var(--accent-dim)] rounded-lg flex items-center justify-center text-[var(--accent)] font-bold">#</div>
                                        <div>
                                            <div className="text-xs font-bold text-[var(--text-1)]">CO2_FOOTPRINT</div>
                                            <div className="text-[10px] text-[var(--text-4)]">NUMERIC · Created 2 days ago</div>
                                        </div>
                                    </div>
                                    <Badge variant="amber">DEPROVISIONING</Badge>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AIStudio;
