import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

export const MaterialHub: React.FC = () => {
    const { traceSteps, clearTraceSteps } = useAppStore();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [detailTab, setDetailTab] = useState<'info' | 'barcodes' | 'uom'>('info');
    
    const [error, setError] = useState<string | null>(null);
    
    // Form State
    const [formData, setFormData] = useState({ code: '', name: '', base_unit: 'KG', description: '' });
    const [newBarcode, setNewBarcode] = useState('');
    const [newUom, setNewUom] = useState({ to_unit: 'PCS', factor: 1 });
    
    // Stats State (Computed locally for now)
    const [stats, setStats] = useState({ total: 0, active: 0, no_barcode: 0, uom_count: 0 });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await api.getProducts(50, 0);
            const prods = data.products || [];
            setProducts(prods);
            
            setStats({
                total: data.total || 0,
                active: prods.filter((p: any) => p.is_active !== false).length,
                no_barcode: prods.filter((p: any) => !p.uom_conversions || p.uom_conversions.length === 0).length,
                uom_count: new Set(prods.map((p: any) => p.base_unit)).size
            });

            if (selectedProduct) {
                const updated = prods.find((p: any) => p.id === selectedProduct.id);
                if (updated) setSelectedProduct(updated);
            }
        } catch (err) {
            console.error("Failed to fetch products", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'code' ? value.toUpperCase() : value 
        }));
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
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create product");
        }
    };

    const handleRegisterBarcode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !newBarcode) return;
        try {
            await api.registerBarcode({
                code: newBarcode,
                entity_type: 'PRODUCT',
                entity_id: parseInt(selectedProduct.id)
            });
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b' }}>MaterialHub</h1>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Product master · Material catalogue · Supplier mapping</p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                    { label: 'Total Products', value: stats.total },
                    { label: 'Active Products', value: stats.active },
                    { label: 'Pending Barcodes', value: stats.no_barcode },
                    { label: 'Units of Measure', value: stats.uom_count }
                ].map((stat, i) => (
                    <div key={i} style={{ 
                        backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', 
                        padding: '12px 14px', borderRadius: '8px' 
                    }}>
                        <div style={{ fontSize: '10px', color: '#f59e0b', opacity: 0.7, textTransform: 'uppercase', marginBottom: '4px' }}>
                            {stat.label}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
                {/* Product List Panel */}
                <div style={{ flex: 1, minWidth: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <input 
                            type="text" 
                            className="input-scanner" 
                            placeholder="Filter materials..." 
                            style={{ maxWidth: '200px' }}
                        />
                        <button 
                            className="btn" 
                            style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: '700' }}
                            onClick={() => setShowAddForm(!showAddForm)}
                        >
                            {showAddForm ? 'Close' : '+ Add Product'}
                        </button>
                    </div>

                    <div style={{ 
                        backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--theme-border)', 
                        borderRadius: '8px', overflow: 'hidden' 
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Code</th>
                                    <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Name</th>
                                    <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Unit</th>
                                    <th style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => setSelectedProduct(p)}
                                        style={{ 
                                            borderBottom: '1px solid var(--theme-border)', color: '#ccc',
                                            cursor: 'pointer', backgroundColor: selectedProduct?.id === p.id ? 'rgba(245,158,11,0.05)' : 'transparent'
                                        }}
                                    >
                                        <td style={{ padding: '12px', color: '#f59e0b', fontWeight: '600' }}>{p.code}</td>
                                        <td style={{ padding: '12px', color: '#fff' }}>{p.name}</td>
                                        <td style={{ padding: '12px' }}>{p.base_unit}</td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ 
                                                width: '8px', height: '8px', borderRadius: '50%', 
                                                backgroundColor: p.is_active !== false ? '#22c55e' : '#ef4444' 
                                            }} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Panel: Add Form or Details */}
                <div style={{ width: '400px', flexShrink: 0 }}>
                    {showAddForm ? (
                        <div style={{ 
                            padding: '24px', backgroundColor: 'rgba(245,158,11,0.03)', 
                            border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px' 
                        }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#fff' }}>New Product</h2>
                            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Product Code</label>
                                    <input name="code" type="text" className="input-scanner" value={formData.code} onChange={handleFormChange} required style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Product Name</label>
                                    <input name="name" type="text" className="input-scanner" value={formData.name} onChange={handleFormChange} required style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Base Unit</label>
                                    <select name="base_unit" className="input-scanner" value={formData.base_unit} onChange={handleFormChange} required style={{ width: '100%', backgroundColor: '#18181b' }}>
                                        {['KG', 'IMP', 'QTY', 'LTR', 'MTR', 'PCS'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="btn" style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: '700', marginTop: '8px' }}>Save Product</button>
                            </form>
                            
                            {traceSteps.length > 0 && (
                                <div style={{ marginTop: '24px', borderTop: '1px solid rgba(245,158,11,0.1)', paddingTop: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {traceSteps.map((step, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', opacity: 0.8 }}>
                                                <span style={{ color: '#22c55e' }}>✓</span>
                                                <span style={{ color: '#f59e0b', minWidth: '100px' }}>{step.agent}</span>
                                                <span style={{ color: '#888' }}>{step.action}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : selectedProduct ? (
                        <div style={{ 
                            backgroundColor: 'var(--theme-light)', border: '1px solid var(--theme-border)', 
                            borderRadius: '12px', overflow: 'hidden' 
                        }}>
                            {/* Tabs Header */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--theme-border)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                {['info', 'barcodes', 'uom'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setDetailTab(t as any)}
                                        style={{ 
                                            flex: 1, padding: '12px', border: 'none', background: 'none', 
                                            color: detailTab === t ? '#f59e0b' : '#666', fontSize: '11px', fontWeight: '700',
                                            textTransform: 'uppercase', cursor: 'pointer', borderBottom: detailTab === t ? '2px solid #f59e0b' : 'none'
                                        }}
                                    >
                                        {t === 'uom' ? 'UOM Engine' : t}
                                    </button>
                                ))}
                            </div>

                            <div style={{ padding: '20px' }}>
                                {detailTab === 'info' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{selectedProduct.name}</h3>
                                            <p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600' }}>{selectedProduct.code}</p>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Public ID</label>
                                            <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{selectedProduct.public_id}</div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Base Unit</label>
                                            <div style={{ fontSize: '13px', color: '#fff' }}>{selectedProduct.base_unit}</div>
                                        </div>
                                    </div>
                                )}

                                {detailTab === 'barcodes' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <form onSubmit={handleRegisterBarcode} style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                type="text" 
                                                className="input-scanner" 
                                                placeholder="Enter barcode..." 
                                                value={newBarcode}
                                                onChange={e => setNewBarcode(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <button type="submit" className="btn btn-primary">Add</button>
                                        </form>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ fontSize: '11px', color: '#888', borderBottom: '1px solid var(--theme-border)', pb: '4px' }}>Registered Barcodes</div>
                                            {(selectedProduct.barcodes || []).length === 0 && <div style={{ fontSize: '12px', color: '#444', fontStyle: 'italic' }}>No barcodes yet</div>}
                                            {selectedProduct.barcodes?.map((b: any) => (
                                                <div key={b.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px' }}>
                                                    <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{b.code}</span>
                                                    <span style={{ fontSize: '10px', color: '#22c55e' }}>ACTIVE</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {detailTab === 'uom' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '9px', color: '#888' }}>TO UNIT</label>
                                                <select className="input-scanner" value={newUom.to_unit} onChange={e => setNewUom({...newUom, to_unit: e.target.value})}>
                                                    {['KG', 'IMP', 'QTY', 'LTR', 'MTR', 'PCS'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '9px', color: '#888' }}>FACTOR</label>
                                                <input type="number" className="input-scanner" value={newUom.factor} onChange={e => setNewUom({...newUom, factor: parseFloat(e.target.value)})} />
                                            </div>
                                            <button className="btn btn-primary" onClick={handleAddUom}>+</button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ fontSize: '11px', color: '#888', borderBottom: '1px solid var(--theme-border)', pb: '4px' }}>Conversions (from {selectedProduct.base_unit})</div>
                                            {selectedProduct.uom_conversions?.map((u: any, i: number) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px', fontSize: '13px' }}>
                                                    <span>1 {selectedProduct.base_unit}</span>
                                                    <span>=</span>
                                                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>{u.factor} {u.to_unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ 
                            height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px dashed var(--theme-border)', borderRadius: '12px', color: '#444', fontSize: '13px'
                        }}>
                            Select a material to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MaterialHub;
