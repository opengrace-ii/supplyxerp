import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { KpiCard } from '@/components/ui/KpiCard';

const StockOverview: React.FC = () => {
    const [overview, setOverview] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [fastMovers, setFastMovers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ov, al, pr] = await Promise.all([
                api.getStockOverview(),
                api.getStockAlerts(),
                api.listStockProducts({ limit: 10 })
            ]);
            setOverview(ov);
            setAlerts(al || []);
            setFastMovers(pr.products || []);
        } catch (err) {
            console.error("Failed to fetch stock overview", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const renderSeverityColor = (severity: string) => {
        switch (severity) {
            case 'red': return '#ef4444';
            case 'amber': return '#f59e0b';
            case 'blue': return '#3b82f6';
            default: return 'var(--text-3)';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] overflow-y-auto p-8 space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-1)] tracking-tight">Stock Intelligence</h1>
                    <p className="text-sm text-[var(--text-3)] mt-1">Management dashboard for inventory health & visibility</p>
                </div>
                <button 
                    onClick={fetchData} 
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-[var(--text-2)] hover:bg-white/10 transition-all"
                >
                    REFRESH DATA
                </button>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-4 gap-4">
                <KpiCard 
                    label="Total Products" 
                    value={overview?.total_products_with_stock || 0} 
                    delta="+2%" 
                    deltaDir="up"
                />
                <KpiCard 
                    label="Handling Units (HUs)" 
                    value={overview?.total_hu_count || 0} 
                />
                <KpiCard 
                    label="Occupied Zones" 
                    value={overview?.total_zones_occupied || 0} 
                />
                <KpiCard 
                    label="Health Score" 
                    value="94%" 
                    deltaDir="neutral"
                />
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left: Health Alerts */}
                <div className="col-span-2 space-y-4">
                    <div className="bg-[var(--bg-surface2)] rounded-2xl border border-white/5 p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase tracking-widest">Inventory Alerts</h3>
                            <span className="text-[10px] text-[var(--text-4)]">{alerts.length} ISSUES DETECTED</span>
                        </div>

                        <div className="space-y-3">
                            {alerts.map((alert, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${renderSeverityColor(alert.severity)}15`, color: renderSeverityColor(alert.severity) }}>
                                        {alert.type === 'ZERO_STOCK' && '📉'}
                                        {alert.type === 'STUCK_RECEIVING' && '⏳'}
                                        {alert.type === 'BLOCKED_QC' && '🔬'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-[var(--text-1)] uppercase">
                                            {alert.type.replace('_', ' ')}: {alert.product_code}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-3)] mt-0.5">
                                            {alert.product_name} 
                                            {alert.hu_code && ` — HU: ${alert.hu_code}`}
                                            {alert.zone_code && ` in ${alert.zone_code}`}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-[var(--text-4)] uppercase">Age</div>
                                        <div className="text-xs text-[var(--text-2)] font-mono">
                                            {alert.last_seen ? '12d' : alert.last_event ? '48h' : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {alerts.length === 0 && (
                                <div className="py-20 text-center opacity-20">
                                    <span className="text-4xl">🛡️</span>
                                    <div className="text-xs font-bold mt-2">SYSTEM HEALTHY</div>
                                    <div className="text-[10px]">No inventory anomalies detected</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Movers */}
                <div className="space-y-4">
                    <div className="bg-[var(--bg-surface2)] rounded-2xl border border-white/5 p-6">
                        <h3 className="text-sm font-bold text-[var(--text-1)] uppercase tracking-widest mb-6">Top Stock Levels</h3>
                        <div className="space-y-4">
                            {fastMovers.map(p => (
                                <div key={p.product_id} className="space-y-2">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-[var(--text-2)] font-bold">{p.product_code}</span>
                                        <span className="text-[var(--text-3)]">{p.total_quantity.toLocaleString()} {p.base_unit}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[var(--accent)] rounded-full opacity-50" 
                                            style={{ width: `${Math.min(100, (p.total_quantity / 5000) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[var(--bg-surface2)] rounded-2xl border border-white/5 p-6">
                        <h3 className="text-sm font-bold text-[var(--text-1)] uppercase tracking-widest mb-4">Storage Utilization</h3>
                        <div className="flex items-center justify-center py-6">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path
                                        className="stroke-current text-white/5"
                                        strokeWidth="3"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="stroke-current text-[var(--accent)]"
                                        strokeWidth="3"
                                        strokeDasharray="72, 100"
                                        strokeLinecap="round"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-bold text-[var(--text-1)]">72%</span>
                                    <span className="text-[8px] text-[var(--text-4)] uppercase">Capacity</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockOverview;
