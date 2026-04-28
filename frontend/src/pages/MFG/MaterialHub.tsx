import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea, InlineAlert } from '@/components/ui/Form';
import { SectionTabs } from '@/components/ui/SectionTabs';
import { cn } from '@/lib/cn';

// Sub-components (could be split to files, but keeping integrated for now as requested)
import { RFQManagement } from './RFQManagement';

export const MaterialHub: React.FC = () => {
    const { traceSteps, clearTraceSteps } = useAppStore();
    const [view, setView] = useState<'materials' | 'suppliers' | 'purchasing' | 'gr' | 'adjustments' | 'rfq'>('materials');
    
    // Materials State
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [detailTab, setDetailTab] = useState<'general' | 'procurement' | 'planning' | 'inventory' | 'costing'>('general');
    const [productStock, setProductStock] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({ 
        code: '', name: '', base_unit: 'KG', description: '',
        material_category: 'RAW_MATERIAL', product_group: '',
        procurement_type: 'EXTERNAL', planned_delivery_days: 0, in_house_lead_days: 0,
        planning_method: 'MANUAL', reorder_point: 0, safety_stock: 0, min_lot_size: 0, max_lot_size: 0,
        qc_on_gr: false, batch_tracked: false, shelf_life_days: 0,
        price_control: 'STANDARD', standard_price: 0
    });
    const [addTab, setAddTab] = useState<'general' | 'procurement' | 'planning' | 'storage' | 'costing'>('general');

    const [stats, setStats] = useState({ total: 0, active: 0, no_barcode: 0, uom_count: 0 });
    const [suppliers, setSuppliers] = useState<any[]>([]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getProducts(100, 0);
            const prods = data.products || [];
            setProducts(prods);
            setStats({
                total: data.total || 0,
                active: prods.filter((p: any) => p.is_active !== false).length,
                no_barcode: prods.filter((p: any) => !p.uom_conversions || p.uom_conversions.length === 0).length,
                uom_count: new Set(prods.map((p: any) => p.base_unit)).size
            });
        } catch (err) {
            console.error("Failed to fetch products", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSuppliers = useCallback(async () => {
        try {
            const data = await api.listSuppliers();
            setSuppliers(data.suppliers || []);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        if (view === 'materials') fetchProducts();
        if (view === 'rfq' || view === 'purchasing' || view === 'suppliers') fetchSuppliers();
    }, [view, fetchProducts, fetchSuppliers]);

    useEffect(() => {
        if (selectedProduct && detailTab === 'inventory') {
            api.getStockProductDetail(selectedProduct.id).then(setProductStock).catch(() => setProductStock(null));
        }
    }, [selectedProduct?.id, detailTab]);

    const handleSaveProduct = async () => {
        setError(null);
        clearTraceSteps();
        try {
            const res = await api.createProduct(formData);
            if (res.success) {
                fetchProducts();
                setFormData({ 
                    code: '', name: '', base_unit: 'KG', description: '',
                    material_category: 'RAW_MATERIAL', product_group: '',
                    procurement_type: 'EXTERNAL', planned_delivery_days: 0, in_house_lead_days: 0,
                    planning_method: 'MANUAL', reorder_point: 0, safety_stock: 0, min_lot_size: 0, max_lot_size: 0,
                    qc_on_gr: false, batch_tracked: false, shelf_life_days: 0,
                    price_control: 'STANDARD', standard_price: 0
                });
                setShowAddForm(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create product");
        }
    };

    const handleUpdateProduct = async () => {
        if (!selectedProduct) return;
        setError(null);
        try {
            await api.updateProduct(selectedProduct.id, {
                ...selectedProduct,
                qc_on_gr: selectedProduct.qc_on_gr,
                default_stock_type: selectedProduct.default_stock_type,
                overdelivery_tolerance: selectedProduct.overdelivery_tolerance
            });
            fetchProducts();
            // Refresh local selected product
            const allProds = await api.getProducts(100, 0);
            const updated = allProds.products.find((p: any) => p.id === selectedProduct.id);
            setSelectedProduct(updated);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to update product");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)]">
            {/* Header */}
            <div className="p-8 border-b border-[var(--border)] bg-[var(--bg-surface2)] flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">MaterialHub</h1>
                    <p className="text-sm text-[var(--text-3)] mt-2">Supply chain backbone · Material master · Purchase lifecycle</p>
                </div>
                
                {/* Mode Switcher */}
            <div className="mt-4 px-8 border-b border-[var(--border)]">
                <SectionTabs
                    tabs={[
                        { id: 'materials', label: 'Materials' },
                        { id: 'suppliers', label: 'Suppliers' },
                        { id: 'rfq', label: 'RFQ Cycle' },
                        { id: 'purchasing', label: 'Purchasing' },
                        { id: 'gr', label: 'Goods Receipt' },
                        { id: 'adjustments', label: 'Adjustments' }
                    ].map(t => ({ key: t.id, label: t.label }))}
                    active={view}
                    onChange={(k: string) => { setView(k as any); setSelectedProduct(null); }}
                />
            </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                {view === 'materials' && (
                    <div className="space-y-8">
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard label="TOTAL PRODUCTS" value={stats.total} icon="📦" />
                            <KpiCard label="ACTIVE" value={stats.active} icon="🟢" />
                            <KpiCard label="PENDING BARCODES" value={stats.no_barcode} icon="🏷️" />
                            <KpiCard label="UOM COUNT" value={stats.uom_count} icon="📏" />
                        </div>

                        <div className="flex gap-8">
                            <div className="flex-1 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="sx-search">
                                        <svg className="w-4 h-4 opacity-50 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                          <circle cx="7" cy="7" r="4.5"/>
                                          <path d="M11 11l2.5 2.5" strokeLinecap="round"/>
                                        </svg>
                                        <input type="text" placeholder="Search materials..." />
                                    </div>
                                    <Button variant="primary" onClick={() => setShowAddForm(true)}>+ New Material</Button>
                                </div>

                                <Card>
                                    <CardBody>
                                        <DataTable
                                            columns={[
                                                { key: 'code', header: 'CODE', mono: true, className: 'text-[var(--accent)] font-bold' },
                                                { key: 'name', header: 'NAME' },
                                                { key: 'base_unit', header: 'UNIT', width: '80px', className: 'opacity-50' },
                                                { 
                                                    key: 'status', 
                                                    header: 'STATUS', 
                                                    render: (p) => <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" /> 
                                                },
                                                {
                                                    key: 'actions',
                                                    header: '',
                                                    className: 'text-right',
                                                    render: (p) => (
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(p)}>👁️ Details</Button>
                                                    )
                                                }
                                            ]}
                                            rows={products}
                                            loading={loading}
                                        />
                                    </CardBody>
                                </Card>
                            </div>

                            <div className="w-[450px]">
                                {selectedProduct ? (
                                    <Card className="sticky top-0">
                                        <div className="flex border-b border-[var(--border)] overflow-x-auto no-scrollbar">
                                            {[
                                                { id: 'general', label: 'GEN' },
                                                { id: 'procurement', label: 'PRO' },
                                                { id: 'planning', label: 'PLN' },
                                                { id: 'inventory', label: 'INV' },
                                                { id: 'costing', label: 'VAL' }
                                            ].map(t => (
                                                <button 
                                                    key={t.id} 
                                                    onClick={() => setDetailTab(t.id as any)} 
                                                    className={cn(
                                                        "flex-1 py-3 text-[10px] font-black tracking-widest uppercase transition-all",
                                                        detailTab === t.id ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                                                    )}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                        <CardBody className="space-y-6 min-h-[500px]">
                                            {detailTab === 'general' && (
                                                <div className="space-y-6 animate-in fade-in duration-300">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-[var(--text-1)]">{selectedProduct.name}</h3>
                                                        <Badge variant="amber" className="mt-2">{selectedProduct.code}</Badge>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Field label="DESCRIPTION">
                                                            <Textarea 
                                                                value={selectedProduct.description} 
                                                                onChange={e => setSelectedProduct({...selectedProduct, description: e.target.value})}
                                                                className="text-xs h-20"
                                                            />
                                                        </Field>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <Field label="CATEGORY">
                                                                <Select value={selectedProduct.material_category} onChange={e => setSelectedProduct({...selectedProduct, material_category: e.target.value})}>
                                                                    <option value="RAW_MATERIAL">RAW MATERIAL</option>
                                                                    <option value="FINISHED_GOOD">FINISHED GOOD</option>
                                                                    <option value="CONSUMABLE">CONSUMABLE</option>
                                                                </Select>
                                                            </Field>
                                                            <Field label="BASE UNIT">
                                                                <Input value={selectedProduct.base_unit} readOnly className="opacity-60" />
                                                            </Field>
                                                        </div>
                                                    </div>
                                                    <Button variant="secondary" size="sm" className="w-full" onClick={handleUpdateProduct}>SAVE CHANGES</Button>
                                                </div>
                                            )}

                                            {detailTab === 'procurement' && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <Field label="PROCUREMENT TYPE">
                                                        <Select value={selectedProduct.procurement_type} onChange={e => setSelectedProduct({...selectedProduct, procurement_type: e.target.value})}>
                                                            <option value="EXTERNAL">EXTERNAL</option>
                                                            <option value="INTERNAL">INTERNAL</option>
                                                            <option value="BOTH">BOTH</option>
                                                        </Select>
                                                    </Field>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Field label="PLANNED DELIV. (DAYS)"><Input type="number" value={selectedProduct.planned_delivery_days} onChange={e => setSelectedProduct({...selectedProduct, planned_delivery_days: parseInt(e.target.value)})} /></Field>
                                                        <Field label="IN-HOUSE LEAD (DAYS)"><Input type="number" value={selectedProduct.in_house_lead_days} onChange={e => setSelectedProduct({...selectedProduct, in_house_lead_days: parseInt(e.target.value)})} /></Field>
                                                    </div>
                                                    <Button variant="secondary" size="sm" className="w-full" onClick={handleUpdateProduct}>UPDATE SUPPLY PARAMS</Button>
                                                </div>
                                            )}

                                            {detailTab === 'planning' && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <Field label="MRP METHOD">
                                                        <Select value={selectedProduct.planning_method} onChange={e => setSelectedProduct({...selectedProduct, planning_method: e.target.value})}>
                                                            <option value="MANUAL">MANUAL</option>
                                                            <option value="REORDER_POINT">REORDER POINT</option>
                                                            <option value="MRP">MRP</option>
                                                        </Select>
                                                    </Field>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Field label="REORDER POINT"><Input type="number" value={selectedProduct.reorder_point} onChange={e => setSelectedProduct({...selectedProduct, reorder_point: parseFloat(e.target.value)})} /></Field>
                                                        <Field label="SAFETY STOCK"><Input type="number" value={selectedProduct.safety_stock} onChange={e => setSelectedProduct({...selectedProduct, safety_stock: parseFloat(e.target.value)})} /></Field>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Field label="MIN LOT"><Input type="number" value={selectedProduct.min_lot_size} onChange={e => setSelectedProduct({...selectedProduct, min_lot_size: parseFloat(e.target.value)})} /></Field>
                                                        <Field label="MAX LOT"><Input type="number" value={selectedProduct.max_lot_size} onChange={e => setSelectedProduct({...selectedProduct, max_lot_size: parseFloat(e.target.value)})} /></Field>
                                                    </div>
                                                    <Button variant="secondary" size="sm" className="w-full" onClick={handleUpdateProduct}>UPDATE PLANNING</Button>
                                                </div>
                                            )}

                                            {detailTab === 'inventory' && (
                                                <div className="space-y-6 animate-in fade-in duration-300">
                                                    <div className="p-4 bg-[var(--accent-dim)] rounded-xl border border-[var(--accent)]/20">
                                                        <div className="text-[10px] font-bold text-[var(--accent)] uppercase mb-1">On Hand Balance</div>
                                                        <div className="text-3xl font-black text-[var(--text-1)]">
                                                            {productStock?.product?.total_quantity || 0} 
                                                            <span className="text-sm text-[var(--text-3)] ml-2 font-medium">{selectedProduct.base_unit}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-[var(--text-2)] uppercase">Batch Tracked</span>
                                                            <input type="checkbox" checked={selectedProduct.batch_tracked} onChange={e => setSelectedProduct({...selectedProduct, batch_tracked: e.target.checked})} className="accent-[var(--accent)]" />
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-[var(--text-2)] uppercase">QC Required on GR</span>
                                                            <input type="checkbox" checked={selectedProduct.qc_on_gr} onChange={e => setSelectedProduct({...selectedProduct, qc_on_gr: e.target.checked})} className="accent-[var(--accent)]" />
                                                        </div>
                                                        <Field label="SHELF LIFE (DAYS)"><Input type="number" value={selectedProduct.shelf_life_days} onChange={e => setSelectedProduct({...selectedProduct, shelf_life_days: parseInt(e.target.value)})} /></Field>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest px-1">Zone Distribution</h4>
                                                        {productStock?.zone_breakdown?.length > 0 ? (
                                                            productStock.zone_breakdown.map((z: any) => (
                                                                <div key={z.zone_code} className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border)] text-xs">
                                                                    <span className="text-[var(--text-2)] font-medium">{z.zone_code}</span>
                                                                    <span className="text-[var(--text-1)] font-bold">{z.quantity}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-[10px] text-[var(--text-4)] text-center py-4 italic">No stock in any zones</div>
                                                        )}
                                                    </div>
                                                    <Button variant="secondary" size="sm" className="w-full" onClick={handleUpdateProduct}>UPDATE INVENTORY POLICY</Button>
                                                </div>
                                            )}

                                            {detailTab === 'costing' && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <Field label="PRICE CONTROL">
                                                        <Select value={selectedProduct.price_control} onChange={e => setSelectedProduct({...selectedProduct, price_control: e.target.value})}>
                                                            <option value="STANDARD">STANDARD</option>
                                                            <option value="MOVING_AVG">MOVING AVG</option>
                                                        </Select>
                                                    </Field>
                                                    <Field label="STANDARD PRICE"><Input type="number" value={selectedProduct.standard_price} onChange={e => setSelectedProduct({...selectedProduct, standard_price: parseFloat(e.target.value)})} /></Field>
                                                    <div className="p-4 bg-[var(--bg-base)]/50 rounded-lg border border-[var(--border)]">
                                                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase mb-2">Valuation Info</div>
                                                        <div className="flex justify-between text-xs">
                                                            <span>Current MAP:</span>
                                                            <span className="font-bold">£{selectedProduct.map_price || '0.00'}</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="secondary" size="sm" className="w-full" onClick={handleUpdateProduct}>UPDATE VALUATION</Button>
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>
                                ) : (
                                    <div className="h-[400px] border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-4)] p-8 text-center">
                                        <span className="text-4xl mb-4 opacity-20">📦</span>
                                        <p className="text-sm font-medium">Select a material from the list to view its lifecycle and inventory analytics.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {view === 'suppliers' && <SupplierManagement suppliers={suppliers} onRefresh={fetchSuppliers} onViewDoc={setSelectedDoc} />}
                {view === 'rfq' && <RFQManagement products={products} suppliers={suppliers} onViewDoc={setSelectedDoc} />}
                {view === 'purchasing' && <PurchasingManagement products={products} onViewDoc={setSelectedDoc} />}
                {view === 'gr' && <GRManagement products={products} onViewDoc={setSelectedDoc} />}
                {view === 'adjustments' && <StockAdjustmentManagement onViewDoc={setSelectedDoc} />}
            </div>

            {/* Modals */}
            <Modal open={showAddForm} onClose={() => setShowAddForm(false)} title="Add New Material" subtitle="Register a new material in the master catalogue">
                <div className="space-y-6">
                    {error && <InlineAlert type="error" message={error} />}
                    
                    <div className="flex border-b border-[var(--border)] overflow-x-auto no-scrollbar">
                        {[
                            { id: 'general', label: 'General' },
                            { id: 'procurement', label: 'Procurement' },
                            { id: 'planning', label: 'Planning' },
                            { id: 'storage', label: 'Storage/QC' },
                            { id: 'costing', label: 'Costing' }
                        ].map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => setAddTab(t.id as any)}
                                className={cn(
                                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all",
                                    addTab === t.id ? "text-[var(--accent)] border-[var(--accent)]" : "text-[var(--text-4)] border-transparent hover:text-[var(--text-2)]"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[300px]">
                        {addTab === 'general' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Field label="MATERIAL CODE"><Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. RM-FAB-100" /></Field>
                                <Field label="DESCRIPTION"><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Blue Denim Fabric" /></Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="CATEGORY">
                                        <Select value={formData.material_category} onChange={e => setFormData({...formData, material_category: e.target.value})}>
                                            <option value="RAW_MATERIAL">RAW MATERIAL (ROH)</option>
                                            <option value="FINISHED_GOOD">FINISHED GOOD (FERT)</option>
                                            <option value="CONSUMABLE">CONSUMABLE (HIBE)</option>
                                            <option value="SERVICE_ITEM">SERVICE ITEM (DIEN)</option>
                                        </Select>
                                    </Field>
                                    <Field label="BASE UNIT">
                                        <Select value={formData.base_unit} onChange={e => setFormData({...formData, base_unit: e.target.value})}>
                                            {['KG', 'IMP', 'QTY', 'LTR', 'MTR', 'PCS'].map(u => <option key={u} value={u}>{u}</option>)}
                                        </Select>
                                    </Field>
                                </div>
                            </div>
                        )}

                        {addTab === 'procurement' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Field label="PROCUREMENT TYPE">
                                    <Select value={formData.procurement_type} onChange={e => setFormData({...formData, procurement_type: e.target.value})}>
                                        <option value="EXTERNAL">EXTERNAL PURCHASE</option>
                                        <option value="INTERNAL">INTERNAL PRODUCTION</option>
                                        <option value="BOTH">BOTH</option>
                                    </Select>
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="PLANNED DELIVERY (DAYS)"><Input type="number" value={formData.planned_delivery_days} onChange={e => setFormData({...formData, planned_delivery_days: parseInt(e.target.value)})} /></Field>
                                    <Field label="IN-HOUSE LEAD (DAYS)"><Input type="number" value={formData.in_house_lead_days} onChange={e => setFormData({...formData, in_house_lead_days: parseInt(e.target.value)})} /></Field>
                                </div>
                            </div>
                        )}

                        {addTab === 'planning' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Field label="MRP / PLANNING METHOD">
                                    <Select value={formData.planning_method} onChange={e => setFormData({...formData, planning_method: e.target.value})}>
                                        <option value="MANUAL">MANUAL PLANNING</option>
                                        <option value="REORDER_POINT">REORDER POINT</option>
                                        <option value="MRP">MRP (AUTOMATED)</option>
                                        <option value="KANBAN">KANBAN</option>
                                    </Select>
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="REORDER POINT"><Input type="number" value={formData.reorder_point} onChange={e => setFormData({...formData, reorder_point: parseFloat(e.target.value)})} /></Field>
                                    <Field label="SAFETY STOCK"><Input type="number" value={formData.safety_stock} onChange={e => setFormData({...formData, safety_stock: parseFloat(e.target.value)})} /></Field>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="MIN LOT SIZE"><Input type="number" value={formData.min_lot_size} onChange={e => setFormData({...formData, min_lot_size: parseFloat(e.target.value)})} /></Field>
                                    <Field label="MAX LOT SIZE"><Input type="number" value={formData.max_lot_size} onChange={e => setFormData({...formData, max_lot_size: parseFloat(e.target.value)})} /></Field>
                                </div>
                            </div>
                        )}

                        {addTab === 'storage' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex items-center gap-4 p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border)]">
                                    <input type="checkbox" checked={formData.qc_on_gr} onChange={e => setFormData({...formData, qc_on_gr: e.target.checked})} className="w-4 h-4 accent-[var(--accent)]" />
                                    <div>
                                        <div className="text-xs font-bold text-[var(--text-1)] uppercase">Mandatory QC on Receipt</div>
                                        <div className="text-[10px] text-[var(--text-4)]">Blocks stock until inspection passes</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border)]">
                                    <input type="checkbox" checked={formData.batch_tracked} onChange={e => setFormData({...formData, batch_tracked: e.target.checked})} className="w-4 h-4 accent-[var(--accent)]" />
                                    <div>
                                        <div className="text-xs font-bold text-[var(--text-1)] uppercase">Batch Management</div>
                                        <div className="text-[10px] text-[var(--text-4)]">Track FIFO/FEFO by unique batch ID</div>
                                    </div>
                                </div>
                                <Field label="SHELF LIFE (DAYS)"><Input type="number" value={formData.shelf_life_days} onChange={e => setFormData({...formData, shelf_life_days: parseInt(e.target.value)})} /></Field>
                            </div>
                        )}

                        {addTab === 'costing' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Field label="PRICE CONTROL">
                                    <Select value={formData.price_control} onChange={e => setFormData({...formData, price_control: e.target.value})}>
                                        <option value="STANDARD">STANDARD PRICE (S)</option>
                                        <option value="MOVING_AVG">MOVING AVERAGE (V)</option>
                                    </Select>
                                </Field>
                                <Field label="STANDARD PRICE (VALUATION UNIT)"><Input type="number" value={formData.standard_price} onChange={e => setFormData({...formData, standard_price: parseFloat(e.target.value)})} /></Field>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                        <Button variant="primary" className="flex-1" onClick={handleSaveProduct}>SAVE MASTER RECORD</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowAddForm(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>


            {selectedDoc && (
                <DocumentDetail doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const SupplierManagement: React.FC<{ suppliers: any[], onRefresh: () => void, onViewDoc: (doc: any) => void }> = ({ suppliers, onRefresh, onViewDoc }) => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ code: '', name: '', currency: 'GBP', contact_name: '', email: '' });
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        try {
            await api.createSupplier(formData);
            setShowForm(false);
            setFormData({ code: '', name: '', currency: 'GBP', contact_name: '', email: '' });
            onRefresh();
        } catch (err: any) { setError(err.response?.data?.error || "Failed to add supplier"); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-1)]">Supplier Portal</h2>
                <Button variant="primary" onClick={() => setShowForm(true)}>+ New Supplier</Button>
            </div>

            <Card>
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'code', header: 'CODE', mono: true, className: 'text-[var(--accent)] font-bold' },
                            { key: 'name', header: 'VENDOR NAME' },
                            { key: 'currency', header: 'CURRENCY', width: '100px' },
                            { 
                                key: 'contact', 
                                header: 'CONTACT', 
                                render: (s) => (
                                    <div className="text-[11px]">
                                        <div className="text-[var(--text-1)] font-bold">{s.contact_name}</div>
                                        <div className="text-[var(--text-3)]">{s.email}</div>
                                    </div>
                                )
                            },
                            {
                                key: 'actions',
                                header: '',
                                className: 'text-right',
                                render: (s) => <Button variant="ghost" size="sm" onClick={() => onViewDoc({type: 'SUPPLIER', data: s})}>👁️ Profile</Button>
                            }
                        ]}
                        rows={suppliers}
                    />
                </CardBody>
            </Card>

            <Modal open={showForm} onClose={() => setShowForm(false)} title="Onboard Vendor" subtitle="Register a new supplier for procurement">
                <div className="space-y-4">
                    {error && <InlineAlert type="error" message={error} />}
                    <Field label="VENDOR CODE"><Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} /></Field>
                    <Field label="BUSINESS NAME"><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></Field>
                    <Field label="SETTLEMENT CURRENCY">
                        <Select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                            <option value="GBP">GBP - Pound Sterling</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                        </Select>
                    </Field>
                    <Field label="CONTACT NAME"><Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} /></Field>
                    <Field label="CONTACT EMAIL"><Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></Field>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handleSubmit}>REGISTER VENDOR</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const PurchasingManagement: React.FC<{ products: any[], onViewDoc: (doc: any) => void }> = ({ products, onViewDoc }) => {
    const [subTab, setSubTab] = useState<'PR' | 'PO'>('PR');
    const [prs, setPRs] = useState<any[]>([]);
    const [pos, setPOs] = useState<any[]>([]);
    const [showCreatePR, setShowCreatePR] = useState(false);
    const [newPR, setNewPR] = useState({ notes: '', lines: [{ product_id: 0, quantity: 1, unit: 'KG', estimated_price: 0 }] });
    const [error, setError] = useState<string | null>(null);

    const fetchPRs = async () => {
        try { const data = await api.listPRs(); setPRs(data.purchase_requests || []); } catch (err) { console.error(err); }
    };
    const fetchPOs = async () => {
        try { const data = await api.listPOs(); setPOs(data.purchase_orders || []); } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchPRs(); fetchPOs(); }, []);

    const handleCreatePR = async () => {
        setError(null);
        try {
            await api.createPR(newPR);
            setShowCreatePR(false);
            fetchPRs();
        } catch (err: any) { setError(err.response?.data?.error || "Failed to create PR"); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex gap-2 border-b border-[var(--border)] pb-px">
                {['PR', 'PO'].map(t => (
                    <button 
                        key={t} 
                        onClick={() => setSubTab(t as any)} 
                        className={cn(
                            "px-6 py-3 text-xs font-black tracking-widest uppercase transition-all border-b-2",
                            subTab === t ? "text-[var(--accent)] border-[var(--accent)]" : "text-[var(--text-3)] border-transparent hover:text-[var(--text-2)]"
                        )}
                    >
                        {t === 'PR' ? `Purchase Requests (${prs.length})` : `Purchase Orders (${pos.length})`}
                    </button>
                ))}
            </div>

            {subTab === 'PR' ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-[var(--text-1)]">Material Requisitions</h3>
                        <Button variant="primary" onClick={() => setShowCreatePR(true)}>+ New PR</Button>
                    </div>
                    <Card>
                        <CardBody>
                            <DataTable
                                columns={[
                                    { key: 'pr_number', header: 'PR NUMBER', mono: true, className: 'text-[var(--accent)] font-bold' },
                                    { 
                                        key: 'status', 
                                        header: 'STATUS', 
                                        render: (pr) => <Badge variant={pr.status === 'APPROVED' ? 'green' : 'amber'}>{pr.status}</Badge> 
                                    },
                                    { key: 'created_at', header: 'DATE', render: (pr) => new Date(pr.created_at).toLocaleDateString(), className: 'opacity-40 text-xs' },
                                    { key: 'notes', header: 'NOTES', className: 'opacity-60 text-xs' },
                                    {
                                        key: 'actions',
                                        header: '',
                                        className: 'text-right',
                                        render: (pr) => <Button variant="ghost" size="sm" onClick={() => onViewDoc({type: 'PR', data: pr})}>👁️ View</Button>
                                    }
                                ]}
                                rows={prs}
                            />
                        </CardBody>
                    </Card>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-[var(--text-1)]">External Purchase Orders</h3>
                        <Button variant="primary" disabled>+ New PO (via PR)</Button>
                    </div>
                    <Card>
                        <CardBody>
                            <DataTable
                                columns={[
                                    { key: 'po_number', header: 'PO NUMBER', mono: true, className: 'text-[var(--accent)] font-bold' },
                                    { key: 'supplier_name', header: 'VENDOR' },
                                    { 
                                        key: 'status', 
                                        header: 'STATUS', 
                                        render: (po) => <Badge variant={po.status === 'APPROVED' ? 'green' : 'amber'}>{po.status}</Badge> 
                                    },
                                    { key: 'total_value', header: 'TOTAL', render: (po) => `${po.total_value} ${po.currency}`, className: 'font-bold' },
                                    {
                                        key: 'actions',
                                        header: '',
                                        className: 'text-right',
                                        render: (po) => <Button variant="ghost" size="sm" onClick={() => onViewDoc({type: 'PO', data: po})}>👁️ View</Button>
                                    }
                                ]}
                                rows={pos}
                            />
                        </CardBody>
                    </Card>
                </div>
            )}

            <Modal open={showCreatePR} onClose={() => setShowCreatePR(false)} title="Create Requisition" subtitle="Submit a new purchase request for approval">
                <div className="space-y-4">
                    {error && <InlineAlert type="error" message={error} />}
                    <Field label="PRODUCT">
                        <Select value={newPR.lines[0].product_id} onChange={e => setNewPR({...newPR, lines: [{...newPR.lines[0], product_id: parseInt(e.target.value)}]})}>
                            <option value="">Select Material...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="QUANTITY"><Input type="number" value={newPR.lines[0].quantity} onChange={e => setNewPR({...newPR, lines: [{...newPR.lines[0], quantity: parseFloat(e.target.value)}]})} /></Field>
                        <Field label="UNIT">
                            <Select value={newPR.lines[0].unit} onChange={e => setNewPR({...newPR, lines: [{...newPR.lines[0], unit: e.target.value}]})}>
                                {['KG', 'IMP', 'QTY', 'LTR', 'MTR', 'PCS'].map(u => <option key={u} value={u}>{u}</option>)}
                            </Select>
                        </Field>
                    </div>
                    <Field label="REASON / NOTES"><Textarea className="h-24" value={newPR.notes} onChange={e => setNewPR({...newPR, notes: e.target.value})} /></Field>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handleCreatePR}>SUBMIT PR</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowCreatePR(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const GRManagement: React.FC<{ products: any[], onViewDoc: (doc: any) => void }> = ({ products, onViewDoc }) => {
    const { clearTraceSteps } = useAppStore();
    const [grs, setGRs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [zones, setZones] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ product_id: 0, quantity: 0, unit: 'KG', zone_id: 0, supplier_ref: '', delivery_note_number: '', notes: '' });

    const fetchGRs = async () => {
        setLoading(true);
        try { const data = await api.listGRs(); setGRs(data.grs || []); } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const fetchZones = async () => {
        try {
            const data = await api.getOrgTree();
            const allZones: any[] = [];
            data.forEach((org: any) => org.sites?.forEach((site: any) => site.zones?.forEach((zone: any) => {
                if (zone.type === 'RECEIVING') allZones.push({ ...zone, siteName: site.name });
            })));
            setZones(allZones);
            if (allZones.length > 0 && form.zone_id === 0) setForm(f => ({ ...f, zone_id: allZones[0].id }));
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchGRs(); fetchZones(); }, []);

    const handlePost = async () => {
        setError(null);
        if (form.product_id === 0 || form.zone_id === 0 || form.quantity <= 0) {
            setError("Please fill all required fields");
            return;
        }
        clearTraceSteps();
        try {
            await api.postGR(form);
            setShowForm(false);
            setForm({ product_id: 0, quantity: 0, unit: 'KG', zone_id: 0, supplier_ref: '', delivery_note_number: '', notes: '' });
            fetchGRs();
        } catch (err: any) { setError(err.response?.data?.error || "Failed to post GR"); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[var(--text-1)]">Goods Receipt Documents</h3>
                <Button variant="primary" onClick={() => setShowForm(true)}>+ New Receipt</Button>
            </div>

            <Card>
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'gr_number', header: 'GR NUMBER', mono: true, className: 'text-[var(--accent)] font-bold' },
                            { key: 'posting_date', header: 'POSTING DATE', render: (gr) => new Date(gr.posting_date).toLocaleDateString(), className: 'opacity-40 text-xs' },
                            { key: 'movement_type', header: 'MTYPE', className: 'opacity-50' },
                            { key: 'supplier_ref', header: 'SUPPLIER REF' },
                            { key: 'delivery_note_number', header: 'DELIVERY NOTE' },
                            {
                                key: 'actions',
                                header: '',
                                className: 'text-right',
                                render: (gr) => <Button variant="ghost" size="sm" onClick={() => onViewDoc({type: 'GR', data: gr})}>👁️ View</Button>
                            }
                        ]}
                        rows={grs}
                        loading={loading}
                    />
                </CardBody>
            </Card>

            <Modal open={showForm} onClose={() => setShowForm(false)} title="Post Goods Receipt" subtitle="Log an incoming shipment into a receiving zone">
                <div className="space-y-4">
                    {error && <InlineAlert type="error" message={error} />}
                    <Field label="PRODUCT">
                        <Select value={form.product_id} onChange={e => setForm({...form, product_id: Number(e.target.value)})}>
                            <option value={0}>-- Select Product --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="QUANTITY"><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} /></Field>
                        <Field label="RECEIVING ZONE">
                            <Select value={form.zone_id} onChange={e => setForm({...form, zone_id: Number(e.target.value)})}>
                                {zones.map(z => <option key={z.id} value={z.id}>{z.siteName} / {z.code}</option>)}
                            </Select>
                        </Field>
                    </div>
                    <Field label="SUPPLIER REFERENCE"><Input value={form.supplier_ref} onChange={e => setForm({...form, supplier_ref: e.target.value})} /></Field>
                    <Field label="DELIVERY NOTE #"><Input value={form.delivery_note_number} onChange={e => setForm({...form, delivery_note_number: e.target.value})} /></Field>
                    <div className="flex gap-3 pt-4">
                        <Button variant="primary" className="flex-1" onClick={handlePost}>POST DOCUMENT</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>CANCEL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const StockAdjustmentManagement: React.FC<{ onViewDoc: (doc: any) => void }> = ({ onViewDoc }) => {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAdjustments = useCallback(async () => {
        setLoading(true);
        try { const data = await api.listAdjustments(); setAdjustments(data.adjustments || []); } catch (err) { console.error(err); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[var(--text-1)]">Stock Adjustment Journals</h3>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchAdjustments}>Refresh</Button>
                    <Button variant="primary" onClick={() => {}}>View Audit Logs</Button>
                </div>
            </div>
            <Card>
                <CardBody>
                    <DataTable
                        columns={[
                            { key: 'sa_number', header: 'SA NUMBER', mono: true, className: 'text-[var(--accent)] font-bold' },
                            { key: 'posting_date', header: 'DATE', render: (sa) => new Date(sa.posting_date).toLocaleDateString(), className: 'opacity-40 text-xs' },
                            { key: 'product_code', header: 'PRODUCT', className: 'font-bold' },
                            { key: 'zone_code', header: 'ZONE', className: 'opacity-50' },
                            { 
                                key: 'difference', 
                                header: 'DIFF', 
                                className: 'text-right',
                                render: (sa) => (
                                    <span className={cn("font-black", sa.difference >= 0 ? 'text-green-500' : 'text-red-500')}>
                                        {sa.difference > 0 ? '+' : ''}{sa.difference}
                                    </span>
                                )
                            }
                        ]}
                        rows={adjustments}
                        loading={loading}
                    />
                </CardBody>
            </Card>
        </div>
    );
};

const DocumentDetail: React.FC<{ doc: any, onClose: () => void }> = ({ doc, onClose }) => {
    const [fullData, setFullData] = useState<any>(null);
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<number>(0);
    const [rejectionReason, setRejectionReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (doc.type === 'PO') {
                const res = await api.getPO(doc.data.id);
                setFullData(res.purchase_order);
                setLines(res.lines || []);
            } else if (doc.type === 'PR') {
                const res = await api.getPR(doc.data.id);
                setFullData(res.purchase_request);
                setLines(res.lines || []);
                if (res.purchase_request.status === 'APPROVED') {
                    const sRes = await api.listSuppliers();
                    setSuppliers(sRes.suppliers || []);
                }
            } else if (doc.type === 'GR') {
                const res = await api.getGR(doc.data.id);
                setFullData(res.gr_document);
                setLines(res.lines || []);
            } else {
                setFullData(doc.data);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [doc]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAction = async (action: string) => {
        setError(null);
        try {
            if (doc.type === 'PR') {
                if (action === 'submit') await api.submitPR(doc.data.id);
                else if (action === 'approve') await api.approvePR(doc.data.id);
                else if (action === 'reject') {
                    if (!rejectionReason) { setError("Please enter rejection reason"); return; }
                    await api.rejectPR(doc.data.id, rejectionReason);
                }
                else if (action === 'convert') {
                    if (!selectedSupplier) { setError("Please select a supplier"); return; }
                    await api.convertPRtoPO(doc.data.id, selectedSupplier);
                }
            } else if (doc.type === 'PO') {
                if (action === 'submit') await api.submitPO(doc.data.id);
                else if (action === 'approve') await api.approvePO(doc.data.id);
                else if (action === 'reject') {
                    if (!rejectionReason) { setError("Please enter rejection reason"); return; }
                    await api.rejectPO(doc.data.id, rejectionReason);
                }
            }
            onClose();
            window.location.reload(); 
        } catch (err: any) { setError(`Action failed: ${action}`); }
    };

    const d = fullData || doc.data;

    return (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-[var(--bg-surface2)] border-l border-[var(--border)] z-[100] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-surface3)]">
                <div>
                    <Badge variant="amber" className="mb-2">{doc.type} RECORD</Badge>
                    <h2 className="text-2xl font-black text-[var(--text-1)] tracking-tight">
                        {d.po_number || d.pr_number || d.gr_number || d.sa_number || d.code}
                    </h2>
                </div>
                <Button variant="ghost" onClick={onClose} className="rounded-full w-10 h-10 p-0 text-xl">&times;</Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {error && <InlineAlert type="error" message={error} />}

                <div className="grid grid-cols-2 gap-6 p-6 bg-[var(--bg-input)] rounded-2xl border border-[var(--border)]">
                    <div>
                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-1">Status</div>
                        <div className="text-sm font-bold text-[var(--accent)]">{d.status || 'ACTIVE'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-1">Created</div>
                        <div className="text-sm font-bold text-[var(--text-1)]">{new Date(d.created_at || d.posting_date).toLocaleDateString()}</div>
                    </div>
                    {doc.type === 'PO' && (
                        <>
                            <div className="col-span-2 pt-4 border-t border-[var(--border)]">
                                <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-1">Supplier</div>
                                <div className="text-sm font-bold text-[var(--text-1)]">{d.supplier_name}</div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-widest mb-1">Value</div>
                                <div className="text-lg font-black text-white/95">{d.total_value} {d.currency}</div>
                            </div>
                        </>
                    )}
                </div>

                {lines.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest px-1">Line Items</h4>
                        <div className="space-y-3">
                            {lines.map((l: any) => (
                                <div key={l.id} className="flex justify-between items-center p-4 bg-[var(--bg-surface3)] rounded-xl border border-[var(--border)]">
                                    <div>
                                        <div className="text-sm font-bold text-[var(--text-1)]">{l.product_name}</div>
                                        <div className="text-[10px] font-mono text-[var(--text-3)]">{l.product_code}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-[var(--text-1)]">{l.quantity} {l.unit}</div>
                                        {l.net_price && <div className="text-[10px] text-[var(--text-3)]">{l.net_price} per unit</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Controls */}
                {(doc.type === 'PR' || doc.type === 'PO') && (
                    <div className="pt-8 border-t border-[var(--border)] space-y-6">
                        <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">Workflow Controls</h4>
                        <div className="flex gap-3 flex-wrap">
                            {d.status === 'DRAFT' && <Button variant="primary" className="flex-1" onClick={() => handleAction('submit')}>SUBMIT FOR APPROVAL</Button>}
                            {d.status === 'SUBMITTED' && (
                                <>
                                    <Button variant="primary" className="bg-green-600 hover:bg-green-500 text-white flex-1" onClick={() => handleAction('approve')}>APPROVE</Button>
                                    <div className="w-full flex gap-3 mt-4">
                                        <Input className="flex-1" placeholder="Rejection reason..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                                        <Button variant="danger" onClick={() => handleAction('reject')}>REJECT</Button>
                                    </div>
                                </>
                            )}
                            {doc.type === 'PR' && d.status === 'APPROVED' && (
                                <div className="w-full space-y-4">
                                    <Field label="CONVERT TO PO - SELECT SUPPLIER">
                                        <Select value={selectedSupplier} onChange={e => setSelectedSupplier(Number(e.target.value))}>
                                            <option value={0}>-- Select Vendor --</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                        </Select>
                                    </Field>
                                    <Button variant="primary" className="w-full" onClick={() => handleAction('convert')} disabled={!selectedSupplier}>GENERATE PO</Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProductPricingTab: React.FC<{ product: any }> = ({ product }) => {
    const [pricing, setPricing] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [edit, setEdit] = useState({ price_control: 'V', standard_price: 0, moving_price: 0 });

    const fetchPricing = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getProductPricing(product.public_id);
            setPricing(data.pricing);
            setHistory(data.history || []);
            setEdit({
                price_control: data.pricing.price_control,
                standard_price: parseFloat(data.pricing.standard_price),
                moving_price: parseFloat(data.pricing.moving_price)
            });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [product.public_id]);

    useEffect(() => { fetchPricing(); }, [fetchPricing]);

    const handleUpdate = async () => {
        try {
            await api.updateProductPricing(product.public_id, edit);
            fetchPricing();
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="text-xs text-[var(--text-3)] animate-pulse">Syncing market data...</div>;
    if (!pricing) return <div className="text-xs text-[var(--text-4)]">No active pricing profile.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
                <Field label="Price Control">
                    <Select value={edit.price_control} onChange={e => setEdit({...edit, price_control: e.target.value})}>
                        <option value="S">S - Standard</option>
                        <option value="V">V - Moving Avg</option>
                    </Select>
                </Field>
                <div className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border)] flex flex-col justify-center">
                    <div className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1">Current Val</div>
                    <div className="text-xl font-black text-[var(--accent)]">
                        {pricing.price_control === 'S' ? pricing.standard_price : pricing.moving_price} 
                        <span className="text-[10px] ml-1 text-[var(--text-3)] font-medium">{pricing.currency}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <Field label="Update Master Price">
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            className="flex-1"
                            value={edit.price_control === 'S' ? edit.standard_price : edit.moving_price} 
                            onChange={e => setEdit({...edit, [edit.price_control === 'S' ? 'standard_price' : 'moving_price']: parseFloat(e.target.value)})} 
                        />
                        <Button variant="primary" onClick={handleUpdate}>UPDATE</Button>
                    </div>
                </Field>
            </div>

            <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest px-1">Audit Log</h4>
                <div className="space-y-2">
                    {history.slice(0, 5).map((h, i) => (
                        <div key={i} className="flex justify-between items-center bg-[var(--bg-base)]/40 p-3 rounded-lg border border-[var(--border)] text-[11px]">
                            <span className="text-[var(--text-3)]">{new Date(h.valid_from).toLocaleDateString()}</span>
                            <span className={cn("font-bold", h.change_type === 'INITIAL' ? 'text-green-500' : 'text-[var(--accent)]')}>
                                {h.new_price} {pricing.currency}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MaterialHub;
