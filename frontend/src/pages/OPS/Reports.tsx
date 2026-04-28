import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { SectionTabs } from '@/components/ui/SectionTabs';

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('SOH');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const TABS = [
        { key: 'SOH', label: 'Stock On Hand' },
        { key: 'GR', label: 'Goods Receipts' },
        { key: 'MOV', label: 'Movements' },
        { key: 'AGE', label: 'Ageing' },
        { key: 'REORDER', label: 'Reorder List' }
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'SOH') {
                const res = await api.listStockProducts({ limit: 100 });
                setData(res.products || []);
            } else if (activeTab === 'MOV') {
                const res = await api.listStockMovements({ page: 1 });
                setData(res || []);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error("Failed to fetch report data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const renderTable = () => {
        if (loading) return <div className="p-20 text-center text-[var(--text-4)]">Generating report...</div>;
        if (data.length === 0) return <div className="p-20 text-center text-[var(--text-4)]">No data found for this report.</div>;

        switch (activeTab) {
            case 'SOH':
                return (
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-[var(--text-3)] uppercase tracking-widest">
                                <th className="p-4">Product Code</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Total Qty</th>
                                <th className="p-4">Units</th>
                                <th className="p-4">HU Count</th>
                                <th className="p-4">Last Move</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(p => (
                                <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold text-[var(--accent)]">{p.product_code}</td>
                                    <td className="p-4 text-[var(--text-2)]">{p.product_name}</td>
                                    <td className="p-4 text-[var(--text-1)] font-mono">{p.total_quantity.toLocaleString()}</td>
                                    <td className="p-4 text-[var(--text-3)]">{p.base_unit}</td>
                                    <td className="p-4 text-[var(--text-3)]">{p.total_hu_count}</td>
                                    <td className="p-4 text-[var(--text-4)]">{p.last_movement_at ? new Date(p.last_movement_at).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'MOV':
                return (
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-[var(--text-3)] uppercase tracking-widest">
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">HU</th>
                                <th className="p-4">Event</th>
                                <th className="p-4">Product</th>
                                <th className="p-4">Qty</th>
                                <th className="p-4">Zone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((m, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-[var(--text-4)] font-mono">{new Date(m.created_at).toLocaleString()}</td>
                                    <td className="p-4 text-[var(--text-2)]">{m.hu_code}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            m.event_type === 'GR' ? 'bg-green-500/10 text-green-500' :
                                            m.event_type === 'MOVE' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-white/10 text-[var(--text-3)]'
                                        }`}>
                                            {m.event_type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-[var(--text-2)]">{m.product_code}</td>
                                    <td className="p-4 text-[var(--text-1)] font-mono">{m.quantity}</td>
                                    <td className="p-4 text-[var(--text-3)]">{m.zone_code} ({m.zone_type})</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                <h1 className="text-xl font-bold text-[var(--text-1)] tracking-tight">Operational Intelligence</h1>
                <p className="text-sm text-[var(--text-3)] mt-1">Cross-module reporting and inventory analytics</p>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
                <SectionTabs 
                    tabs={TABS}
                    active={activeTab}
                    onChange={setActiveTab}
                />

                <div className="mt-8 bg-[var(--bg-surface2)] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <h3 className="text-xs font-bold text-[var(--text-1)] uppercase tracking-widest">
                            {TABS.find(t => t.key === activeTab)?.label}
                        </h3>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-[var(--text-3)] hover:text-[var(--text-1)]">CSV</button>
                            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-[var(--text-3)] hover:text-[var(--text-1)]">PDF</button>
                        </div>
                    </div>
                    {renderTable()}
                </div>
            </div>
        </div>
    );
};

export default Reports;
