import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

export const MaterialHub: React.FC = () => {
    const { traceSteps, clearTraceSteps } = useAppStore();
    const [view, setView] = useState<'materials' | 'suppliers' | 'purchasing' | 'gr' | 'adjustments'>('materials');
    
    // Materials State
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [detailTab, setDetailTab] = useState<'info' | 'barcodes' | 'uom' | 'stock'>('info');
    const [productStock, setProductStock] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({ code: '', name: '', base_unit: 'KG', description: '' });
    const [newBarcode, setNewBarcode] = useState('');
    const [newUom, setNewUom] = useState({ to_unit: 'PCS', factor: 1 });
    const [stats, setStats] = useState({ total: 0, active: 0, no_barcode: 0, uom_count: 0 });

    const fetchProducts = async () => {
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
    };

    useEffect(() => {
        if (view === 'materials') fetchProducts();
    }, [view]);

    useEffect(() => {
        if (selectedProduct && detailTab === 'stock') {
            api.getStockProductDetail(selectedProduct.id).then(setProductStock).catch(() => setProductStock(null));
        }
    }, [selectedProduct?.id, detailTab]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'code' ? value.toUpperCase() : value }));
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        clearTraceSteps();
        try {
            const res = await api.createProduct(formData);
            if (res.success) {
                fetchProducts();
                setFormData({ code: '', name: '', base_unit: 'KG', description: '' });
                setShowAddForm(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create product");
        }
    };

    const handleRegisterBarcode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !newBarcode) return;
        try {
            await api.registerBarcode({ code: newBarcode, entity_type: 'PRODUCT', entity_id: parseInt(selectedProduct.id) });
            setNewBarcode('');
            fetchProducts();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to register barcode");
        }
    };

    const handleAddUom = async () => {
        if (!selectedProduct) return;
        const currentUoms = selectedProduct.uom_conversions || [];
        const updated = [...currentUoms, { from_unit: selectedProduct.base_unit, ...newUom }];
        try {
            await api.updateProductUOM(selectedProduct.public_id, updated);
            fetchProducts();
        } catch (err) {
            alert("Failed to update UOM");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', marginBottom: '4px' }}>MaterialHub</h1>
                    <p style={{ fontSize: '13px', color: '#888' }}>Supply chain backbone · Material master · Purchase lifecycle</p>
                </div>
                
                {/* Mode Switcher */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '12px', border: '1px solid var(--theme-border)' }}>
                    {[
                        { id: 'materials', label: 'Materials', icon: '📦' },
                        { id: 'suppliers', label: 'Suppliers', icon: '🏢' },
                        { id: 'purchasing', label: 'Purchasing', icon: '🧾' },
                        { id: 'gr', label: 'Goods Receipt', icon: '🚚' },
                        { id: 'adjustments', label: 'Adjustments', icon: '⚖️' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setView(tab.id as any); setSelectedProduct(null); }}
                            style={{
                                padding: '10px 18px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                                cursor: 'pointer', transition: 'all 0.2s',
                                backgroundColor: view === tab.id ? '#f59e0b' : 'transparent',
                                color: view === tab.id ? '#000' : '#71717a',
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'materials' && (
                <>
                    {/* Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Total Products', value: stats.total },
                            { label: 'Active Products', value: stats.active },
                            { label: 'Pending Barcodes', value: stats.no_barcode },
                            { label: 'Units of Measure', value: stats.uom_count }
                        ].map((stat, i) => (
                            <div key={i} style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: '#f59e0b', opacity: 0.7, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em', fontWeight: '700' }}>
                                    {stat.label}
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ flex: 1, minWidth: '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <input type="text" className="input-scanner" placeholder="Search materials..." style={{ width: '250px' }} />
                                <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                                    {showAddForm ? 'Cancel' : '+ New Material'}
                                </button>
                            </div>

                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <tr>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>CODE</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>NAME</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>BASE UNIT</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p) => (
                                            <tr key={p.id} onClick={() => setSelectedProduct(p)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--theme-border)', backgroundColor: selectedProduct?.id === p.id ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
                                                <td style={{ padding: '16px', color: '#f59e0b', fontWeight: '700' }}>{p.code}</td>
                                                <td style={{ padding: '16px', color: '#fff', fontWeight: '500' }}>{p.name}</td>
                                                <td style={{ padding: '16px', color: '#888' }}>{p.base_unit}</td>
                                                <td style={{ padding: '16px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ width: '450px' }}>
                            {showAddForm ? (
                                <div className="card" style={{ padding: '24px', border: '1px solid rgba(245,158,11,0.3)' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px' }}>Add New Material</h2>
                                    <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>MATERIAL CODE</label>
                                            <input name="code" className="input-scanner" value={formData.code} onChange={handleFormChange} placeholder="e.g., FAB-001" required />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>DISPLAY NAME</label>
                                            <input name="name" className="input-scanner" value={formData.name} onChange={handleFormChange} placeholder="e.g., Fabric Roll Blue" required />
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '11px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>BASE UNIT</label>
                                                <select name="base_unit" className="input-scanner" value={formData.base_unit} onChange={handleFormChange}>
                                                    {['KG', 'IMP', 'QTY', 'LTR', 'MTR', 'PCS'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', height: '44px' }}>Save Material</button>
                                    </form>
                                    
                                    {traceSteps.length > 0 && (
                                        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '12px', fontWeight: '700' }}>PIPELINE EXECUTION TRACE</div>
                                            {traceSteps.map((s, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#22c55e', marginBottom: '6px' }}>
                                                    <span>✔</span> <span style={{ color: '#f59e0b', fontWeight: '600', minWidth: '120px' }}>{s.agent}</span> <span>{s.action}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : selectedProduct ? (
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', borderBottom: '1px solid var(--theme-border)' }}>
                                        {['info', 'stock', 'barcodes', 'uom'].map(t => (
                                            <button key={t} onClick={() => setDetailTab(t as any)} style={{ flex: 1, padding: '14px', background: 'none', border: 'none', color: detailTab === t ? '#f59e0b' : '#666', borderBottom: detailTab === t ? '2px solid #f59e0b' : 'none', fontSize: '11px', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase' }}>{t}</button>
                                        ))}
                                    </div>
                                    <div style={{ padding: '24px' }}>
                                        {detailTab === 'info' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>{selectedProduct.name}</h3>
                                                    <div style={{ padding: '4px 8px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '4px', fontSize: '11px', fontWeight: '800', width: 'fit-content' }}>{selectedProduct.code}</div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '4px', fontWeight: '700' }}>BASE UNIT</label>
                                                        <div style={{ fontSize: '14px', color: '#fff' }}>{selectedProduct.base_unit}</div>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '4px', fontWeight: '700' }}>CREATION DATE</label>
                                                        <div style={{ fontSize: '14px', color: '#fff' }}>{new Date(selectedProduct.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {detailTab === 'stock' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--theme-border)' }}>
                                                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: '700' }}>TOTAL SYSTEM BALANCE</div>
                                                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>{productStock?.product?.total_quantity || 0} <span style={{ fontSize: '14px', color: '#888' }}>{selectedProduct.base_unit}</span></div>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#666', fontWeight: '700', borderBottom: '1px solid var(--theme-border)', paddingBottom: '8px' }}>ZONE-LEVEL BREAKDOWN</div>
                                                {productStock?.zone_breakdown?.map((z: any) => (
                                                    <div key={z.zone_code} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                                        <span style={{ fontWeight: '600' }}>{z.zone_code}</span>
                                                        <span style={{ color: '#f59e0b', fontWeight: '800' }}>{z.quantity} {selectedProduct.base_unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: '400px', border: '2px dashed var(--theme-border)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '14px', fontWeight: '600' }}>
                                    Select a material to analyze lifecycle
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {view === 'suppliers' && <SupplierManagement onViewDoc={setSelectedDoc} />}
            {view === 'purchasing' && <PurchasingManagement products={products} onViewDoc={setSelectedDoc} />}
            {view === 'gr' && <GRManagement products={products} onViewDoc={setSelectedDoc} />}
            {view === 'adjustments' && <StockAdjustmentManagement onViewDoc={setSelectedDoc} />}

            {selectedDoc && (
                <DocumentDetail doc={selectedDoc} onViewDoc={setSelectedDoc} />
            )}
        </div>
    );
};

const SupplierManagement: React.FC<{ onViewDoc: (doc: any) => void }> = ({ onViewDoc }) => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ code: '', name: '', currency: 'GBP', contact_name: '', email: '' });

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const data = await api.listSuppliers();
            setSuppliers(data.suppliers || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSuppliers(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createSupplier(formData);
            setShowForm(false);
            setFormData({ code: '', name: '', currency: 'GBP', contact_name: '', email: '' });
            fetchSuppliers();
        } catch (err) { alert("Failed to add supplier"); }
    };

    return (
        <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Supplier Portal</h2>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Supplier'}</button>
                </div>
                <div className="card" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>CODE</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>VENDOR NAME</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>CURRENCY</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#666', borderBottom: '1px solid var(--theme-border)' }}>CONTACT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(s => (
                                <tr key={s.id} onClick={() => onViewDoc({type: 'SUPPLIER', data: s})} style={{ borderBottom: '1px solid var(--theme-border)', cursor: 'pointer' }}>
                                    <td style={{ padding: '16px', color: '#f59e0b', fontWeight: '700' }}>{s.code}</td>
                                    <td style={{ padding: '16px', color: '#fff', fontWeight: '600' }}>{s.name}</td>
                                    <td style={{ padding: '16px', color: '#888' }}>{s.currency}</td>
                                    <td style={{ padding: '16px', color: '#666', fontSize: '11px' }}>{s.contact_name} <br/> {s.email}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showForm && (
                <div style={{ width: '400px' }}>
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px' }}>Onboard Vendor</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '6px', fontWeight: '700' }}>VENDOR CODE</label>
                                <input className="input-scanner" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '6px', fontWeight: '700' }}>BUSINESS NAME</label>
                                <input className="input-scanner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '6px', fontWeight: '700' }}>SETTLEMENT CURRENCY</label>
                                <select className="input-scanner" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                                    <option value="GBP">GBP - Pound Sterling</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: '40px' }}>Register Vendor</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const PurchasingManagement: React.FC<{ products: any[], onViewDoc: (doc: any) => void }> = ({ products, onViewDoc }) => {
    const [subTab, setSubTab] = useState<'PR' | 'PO'>('PR');
    const [prs, setPRs] = useState<any[]>([]);
    const [pos, setPOs] = useState<any[]>([]);
    const [showCreatePR, setShowCreatePR] = useState(false);
    const [newPR, setNewPR] = useState({ notes: '', lines: [{ product_id: 0, quantity: 1, unit: 'KG', estimated_price: 0 }] });

    const fetchPRs = async () => {
        try {
            const data = await api.listPRs();
            setPRs(data.purchase_requests || []);
        } catch (err) { console.error(err); }
    };

    const fetchPOs = async () => {
        try {
            const data = await api.listPOs();
            setPOs(data.purchase_orders || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchPRs();
        fetchPOs();
    }, []);

    const handleCreatePR = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createPR(newPR);
            setShowCreatePR(false);
            fetchPRs();
        } catch (err) { alert("Failed to create PR"); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--theme-border)', paddingBottom: '10px' }}>
                <button onClick={() => setSubTab('PR')} style={{ background: 'none', border: 'none', color: subTab === 'PR' ? '#f59e0b' : '#666', borderBottom: subTab === 'PR' ? '2px solid #f59e0b' : 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', padding: '10px 0' }}>Purchase Requests ({prs.length})</button>
                <button onClick={() => setSubTab('PO')} style={{ background: 'none', border: 'none', color: subTab === 'PO' ? '#f59e0b' : '#666', borderBottom: subTab === 'PO' ? '2px solid #f59e0b' : 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', padding: '10px 0' }}>Purchase Orders ({pos.length})</button>
            </div>

            {subTab === 'PR' && (
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Material Requisitions</h3>
                            <button className="btn btn-primary" onClick={() => setShowCreatePR(true)}>+ New PR</button>
                        </div>
                        <div className="card" style={{ padding: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>PR NUMBER</th>
                                        <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>STATUS</th>
                                        <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>DATE</th>
                                        <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>NOTES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prs.map(pr => (
                                        <tr key={pr.id} onClick={() => onViewDoc({type: 'PR', data: pr})} style={{ borderBottom: '1px solid var(--theme-border)', cursor: 'pointer' }}>
                                            <td style={{ padding: '14px', color: '#f59e0b', fontWeight: '700' }}>{pr.pr_number}</td>
                                            <td style={{ padding: '14px' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', backgroundColor: pr.status === 'APPROVED' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: pr.status === 'APPROVED' ? '#22c55e' : '#f59e0b' }}>{pr.status}</span>
                                            </td>
                                            <td style={{ padding: '14px', color: '#888', fontSize: '12px' }}>{new Date(pr.created_at).toLocaleDateString()}</td>
                                            <td style={{ padding: '14px', color: '#666', fontSize: '12px' }}>{pr.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {showCreatePR && (
                        <div style={{ width: '450px' }}>
                            <div className="card" style={{ padding: '24px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px' }}>Create Requisition</h3>
                                <form onSubmit={handleCreatePR} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '6px', fontWeight: '700' }}>PRODUCT</label>
                                        <select className="input-scanner" onChange={e => setNewPR({...newPR, lines: [{...newPR.lines[0], product_id: parseInt(e.target.value)}]})}>
                                            <option value="">Select Material...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '6px', fontWeight: '700' }}>QUANTITY</label>
                                            <input type="number" className="input-scanner" value={newPR.lines[0].quantity} onChange={e => setNewPR({...newPR, lines: [{...newPR.lines[0], quantity: parseFloat(e.target.value)}]})} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '6px', fontWeight: '700' }}>UNIT</label>
                                            <select className="input-scanner" value={newPR.lines[0].unit} onChange={e => setNewPR({...newPR, lines: [{...newPR.lines[0], unit: e.target.value}]})}>
                                                {['KG', 'IMP', 'QTY', 'LTR', 'MTR', 'PCS'].map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '6px', fontWeight: '700' }}>REASON / NOTES</label>
                                        <textarea className="input-scanner" style={{ height: '80px', paddingTop: '10px' }} value={newPR.notes} onChange={e => setNewPR({...newPR, notes: e.target.value})} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreatePR(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Submit PR</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {subTab === 'PO' && (
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800' }}>External Purchase Orders</h3>
                        <button className="btn btn-primary" onClick={() => alert("PO creation requires selecting an approved PR or manual vendor selection.")}>+ New PO</button>
                    </div>
                    <div className="card" style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <tr>
                                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>PO NUMBER</th>
                                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>VENDOR</th>
                                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>STATUS</th>
                                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pos.map(po => (
                                    <tr key={po.id} onClick={() => onViewDoc({type: 'PO', data: po})} style={{ borderBottom: '1px solid var(--theme-border)', cursor: 'pointer' }}>
                                        <td style={{ padding: '14px', color: '#f59e0b', fontWeight: '700' }}>{po.po_number}</td>
                                        <td style={{ padding: '14px', color: '#fff', fontWeight: '600' }}>{po.supplier_name}</td>
                                        <td style={{ padding: '14px' }}>
                                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', backgroundColor: po.status === 'APPROVED' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: po.status === 'APPROVED' ? '#22c55e' : '#f59e0b' }}>{po.status}</span>
                                        </td>
                                        <td style={{ padding: '14px', color: '#fff' }}>{po.total_value} {po.currency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const GRManagement: React.FC<{ products: any[], onViewDoc: (doc: any) => void }> = ({ products, onViewDoc }) => {
    const { clearTraceSteps } = useAppStore();
    const [grs, setGRs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [zones, setZones] = useState<any[]>([]);
    const [form, setForm] = useState({
        product_id: 0,
        quantity: 0,
        unit: 'KG',
        zone_id: 0,
        supplier_ref: '',
        delivery_note_number: '',
        notes: ''
    });

    const fetchGRs = async () => {
        setLoading(true);
        try {
            const data = await api.listGRs();
            setGRs(data.grs || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchZones = async () => {
        try {
            const data = await api.getOrgTree();
            // Flatten zones from tree: Org -> Sites -> Zones
            const allZones: any[] = [];
            data.forEach((org: any) => {
                org.sites?.forEach((site: any) => {
                    site.zones?.forEach((zone: any) => {
                        if (zone.type === 'RECEIVING') {
                            allZones.push({ ...zone, siteName: site.name });
                        }
                    });
                });
            });
            setZones(allZones);
            if (allZones.length > 0 && form.zone_id === 0) {
                setForm(f => ({ ...f, zone_id: allZones[0].id }));
            }
        } catch (err) { console.error("Failed to fetch zones", err); }
    };

    useEffect(() => { 
        fetchGRs();
        fetchZones();
    }, []);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.product_id === 0 || form.zone_id === 0 || form.quantity <= 0) {
            alert("Please fill all required fields");
            return;
        }
        clearTraceSteps();
        try {
            await api.postGR(form);
            setShowForm(false);
            setForm({ product_id: 0, quantity: 0, unit: 'KG', zone_id: 0, supplier_ref: '', delivery_note_number: '', notes: '' });
            fetchGRs();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to post GR");
        }
    };

    return (
        <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Goods Receipt Documents</h3>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New GR'}</button>
                </div>
                <div className="card" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>GR NUMBER</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>POSTING DATE</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>MTYPE</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>SUPPLIER REF</th>
                                <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>DELIVERY NOTE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grs.map(gr => (
                                <tr key={gr.id} onClick={() => onViewDoc({type: 'GR', data: gr})} style={{ borderBottom: '1px solid var(--theme-border)', cursor: 'pointer' }}>
                                    <td style={{ padding: '14px', color: '#f59e0b', fontWeight: '700' }}>{gr.gr_number}</td>
                                    <td style={{ padding: '14px', color: '#fff', fontSize: '12px' }}>{new Date(gr.posting_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '14px', color: '#888', fontSize: '12px' }}>{gr.movement_type}</td>
                                    <td style={{ padding: '14px', color: '#fff', fontSize: '12px' }}>{gr.supplier_ref}</td>
                                    <td style={{ padding: '14px', color: '#fff', fontSize: '12px' }}>{gr.delivery_note_number}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div style={{ width: '380px', flexShrink: 0 }}>
                    <div className="card">
                        <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '20px' }}>Post New Receipt</h4>
                        <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '8px', fontWeight: '700' }}>PRODUCT</label>
                                <select className="input-scanner" value={form.product_id} onChange={e => setForm({...form, product_id: Number(e.target.value)})}>
                                    <option value={0}>-- Select Product --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '8px', fontWeight: '700' }}>QTY</label>
                                    <input type="number" className="input-scanner" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '8px', fontWeight: '700' }}>ZONE</label>
                                    <select className="input-scanner" value={form.zone_id} onChange={e => setForm({...form, zone_id: Number(e.target.value)})}>
                                        {zones.map(z => <option key={z.id} value={z.id}>{z.siteName} / {z.code}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Post Document</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const DocumentDetail: React.FC<{ doc: { type: 'PR' | 'PO' | 'GR' | 'SUPPLIER' | 'SA', data: any }, onViewDoc: (doc: any | null) => void }> = ({ doc, onViewDoc }) => {
    const [fullData, setFullData] = useState<any>(null);
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<number>(0);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showConvert, setShowConvert] = useState(false);

    const fetchData = async () => {
        setFullData(null);
        setLines([]);
        if (doc.type === 'PO') {
            const res = await api.getPO(doc.data.id);
            setFullData(res.purchase_order);
            setLines(res.lines || []);
        } else if (doc.type === 'PR') {
            const res = await api.getPR(doc.data.id);
            setFullData(res.purchase_request);
            setLines(res.lines || []);
            // Fetch suppliers for conversion if approved
            if (res.purchase_request.status === 'APPROVED') {
                const sRes = await api.listSuppliers();
                setSuppliers(sRes.suppliers || []);
            }
        } else if (doc.type === 'GR') {
            const res = await api.getGR(doc.data.id);
            setFullData(res.gr_document);
            setLines(res.lines || []);
        } else if (doc.type === 'SA') {
            setFullData(doc.data);
        } else if (doc.type === 'SUPPLIER') {
            setFullData(doc.data);
        }
    };

    useEffect(() => {
        fetchData();
    }, [doc]);

    const handleAction = async (action: string) => {
        setLoading(true);
        try {
            if (doc.type === 'PR') {
                if (action === 'submit') await api.submitPR(doc.data.id);
                else if (action === 'approve') await api.approvePR(doc.data.id);
                else if (action === 'reject') await api.rejectPR(doc.data.id, rejectionReason);
                else if (action === 'convert') {
                    if (!selectedSupplier) { alert("Please select a supplier"); return; }
                    await api.convertPRtoPO(doc.data.id, selectedSupplier);
                }
            } else if (doc.type === 'PO') {
                if (action === 'submit') await api.submitPO(doc.data.id);
                else if (action === 'approve') await api.approvePO(doc.data.id);
                else if (action === 'reject') await api.rejectPO(doc.data.id, rejectionReason);
            }
            await fetchData();
            // Refresh parent lists if possible (might need to refresh the whole page or pass a callback)
            window.location.reload(); // Quickest way for now to ensure all states sync
        } catch (err) {
            alert(`Action failed: ${action}`);
        } finally {
            setLoading(false);
        }
    };

    const d = fullData || doc.data;

    return (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '640px', height: '100vh', backgroundColor: '#111', borderLeft: '1px solid var(--theme-border)', zIndex: 1000, padding: '40px', boxShadow: '-20px 0 40px rgba(0,0,0,0.8)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 12px', borderRadius: '4px', letterSpacing: '0.05em' }}>{doc.type} RECORD</span>
                <button onClick={() => onViewDoc(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '24px', cursor: 'pointer', transition: 'color 0.2s' }}>×</button>
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>{d.po_number || d.pr_number || d.gr_number || d.sa_number || d.code}</h1>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Operational Compliance · Audit Trail · System Verified</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--theme-border)' }}>
                <div>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>STATUS</div>
                    <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '16px' }}>{d.status || 'ACTIVE'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>{doc.type === 'SUPPLIER' ? 'CURRENCY' : 'POSTING DATE'}</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>{doc.type === 'SUPPLIER' ? d.currency : new Date(d.posting_date || d.created_at).toLocaleDateString()}</div>
                </div>
                {doc.type === 'PO' && (
                    <>
                        <div>
                            <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>SUPPLIER</div>
                            <div style={{ color: '#fff', fontSize: '14px' }}>{d.supplier_name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>TOTAL VALUE</div>
                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: '800' }}>{d.total_value} {d.currency}</div>
                        </div>
                    </>
                )}
                {doc.type === 'GR' && (
                    <>
                        <div>
                            <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>MOVEMENT TYPE</div>
                            <div style={{ color: '#fff', fontSize: '14px' }}>{d.movement_type}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>SUPPLIER REF</div>
                            <div style={{ color: '#fff', fontSize: '14px' }}>{d.supplier_ref || 'N/A'}</div>
                        </div>
                    </>
                )}
                {doc.type === 'SA' && (
                    <>
                        <div>
                            <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>ADJUSTMENT TYPE</div>
                            <div style={{ color: '#fff', fontSize: '14px' }}>{d.type}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>REASON</div>
                            <div style={{ color: '#fff', fontSize: '14px' }}>{d.reason}</div>
                        </div>
                    </>
                )}
            </div>

            {doc.type !== 'SUPPLIER' && doc.type !== 'SA' && (
                <>
                    <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', borderBottom: '1px solid var(--theme-border)', paddingBottom: '8px', marginBottom: '16px', letterSpacing: '0.05em' }}>DOCUMENT LINE ITEMS</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--theme-border)' }}>
                                <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '10px', color: '#444' }}>LINE</th>
                                <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '10px', color: '#444' }}>ITEM DETAILS</th>
                                <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '10px', color: '#444' }}>QUANTITY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((l: any) => (
                                <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px 0', color: '#f59e0b', fontSize: '12px', fontWeight: '800' }}>{l.line_number}</td>
                                    <td style={{ padding: '16px 0', color: '#fff', fontSize: '13px', fontWeight: '500' }}>
                                        {l.product_name} 
                                        <div style={{fontSize: '10px', color: '#555', marginTop: '4px', fontFamily: 'monospace'}}>{l.product_code}</div>
                                    </td>
                                    <td style={{ padding: '16px 0', textAlign: 'right', color: '#fff', fontSize: '14px', fontWeight: '700' }}>
                                        {l.quantity} <span style={{fontSize: '11px', color: '#666'}}>{l.unit}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {doc.type === 'SA' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ padding: '24px', backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '800', marginBottom: '12px' }}>ADJUSTMENT IMPACT</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <span style={{ fontSize: '10px', color: '#666' }}>PRODUCT</span>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{d.product_code}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '10px', color: '#666' }}>ZONE</span>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{d.zone_code}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '10px', color: '#666' }}>DIFFERENCE</span>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: d.difference >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {d.difference > 0 ? '+' : ''}{d.difference} <span style={{ fontSize: '12px' }}>{d.unit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {doc.type === 'SUPPLIER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--theme-border)' }}>
                        <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase' }}>Supplier Contact</div>
                        <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>{d.contact_name}</div>
                        <div style={{ color: '#888', fontSize: '14px' }}>{d.email}</div>
                    </div>
                </div>
            )}

            {(doc.type === 'PR' || doc.type === 'PO') && d && (
                <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--theme-border)' }}>
                    <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', marginBottom: '20px', letterSpacing: '0.05em' }}>LIFECYCLE CONTROLS</div>
                    
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {d.status === 'DRAFT' && (
                            <button className="btn btn-primary" onClick={() => handleAction('submit')} disabled={loading}>Submit for Approval</button>
                        )}
                        {d.status === 'SUBMITTED' && (
                            <>
                                <button className="btn btn-primary" style={{ backgroundColor: '#22c55e' }} onClick={() => handleAction('approve')} disabled={loading}>Approve Document</button>
                                <button className="btn" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => { if(rejectionReason) handleAction('reject'); else alert("Please enter rejection reason"); }} disabled={loading}>Reject</button>
                                <input style={{ flex: 1, minWidth: '200px' }} className="input-scanner" placeholder="Reason for rejection..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                            </>
                        )}
                        {doc.type === 'PR' && d.status === 'APPROVED' && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: '700' }}>SELECT SUPPLIER FOR PO</label>
                                        <select className="input-scanner" value={selectedSupplier} onChange={e => setSelectedSupplier(Number(e.target.value))}>
                                            <option value={0}>-- Select Vendor --</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                        </select>
                                    </div>
                                    <button className="btn btn-primary" onClick={() => handleAction('convert')} disabled={loading || !selectedSupplier}>Convert to PO</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const StockAdjustmentManagement: React.FC<{ onViewDoc: (doc: any) => void }> = ({ onViewDoc }) => {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAdjustments = async () => {
        setLoading(true);
        try {
            const data = await api.listAdjustments();
            setAdjustments(data.adjustments || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAdjustments(); }, []);

    return (
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Stock Adjustment Journals</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" style={{ borderColor: 'var(--theme-border)', color: '#888' }} onClick={fetchAdjustments}>Refresh</button>
                    <button className="btn btn-primary" onClick={() => alert("Adjustments are generated via physical count operations.")}>Audit Logs</button>
                </div>
            </div>
            <div className="card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <tr>
                            <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>SA NUMBER</th>
                            <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>DATE</th>
                            <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>PRODUCT</th>
                            <th style={{ padding: '14px', textAlign: 'left', fontSize: '11px', color: '#666' }}>ZONE</th>
                            <th style={{ padding: '14px', textAlign: 'right', fontSize: '11px', color: '#666' }}>DIFF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adjustments.map(sa => (
                            <tr key={sa.id} onClick={() => onViewDoc({type: 'SA', data: sa})} style={{ borderBottom: '1px solid var(--theme-border)', cursor: 'pointer' }}>
                                <td style={{ padding: '14px', color: '#f59e0b', fontWeight: '700' }}>{sa.sa_number}</td>
                                <td style={{ padding: '14px', color: '#fff', fontSize: '12px' }}>{new Date(sa.posting_date).toLocaleDateString()}</td>
                                <td style={{ padding: '14px', color: '#fff', fontSize: '12px', fontWeight: '600' }}>{sa.product_code}</td>
                                <td style={{ padding: '14px', color: '#888', fontSize: '12px' }}>{sa.zone_code}</td>
                                <td style={{ padding: '14px', textAlign: 'right', color: sa.difference >= 0 ? '#22c55e' : '#ef4444', fontWeight: '900' }}>{sa.difference > 0 ? '+' : ''}{sa.difference}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MaterialHub;
