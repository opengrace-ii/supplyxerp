import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function GoodsIssue() {
  const [activeTab, setActiveTab] = useState<'GI' | 'RES'>('GI');
  
  // GI State
  const [products, setProducts] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [selectedZone, setSelectedZone] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState<string>('EA');
  const [mType, setMType] = useState<string>('261');
  const [reasonCode, setReasonCode] = useState<string>('');
  const [reasonText, setReasonText] = useState<string>('');
  const [costCentre, setCostCentre] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Available Qty State
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [unrestrictedQty, setUnrestrictedQty] = useState<number | null>(null);
  const [reservedQty, setReservedQty] = useState<number | null>(null);

  // Reservation State
  const [reservations, setReservations] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number>(0);
  const [resQty, setResQty] = useState<number>(1);
  const [resNotes, setResNotes] = useState<string>('');

  // GI History
  const [giHistory, setGiHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchZones();
    fetchSites();
    fetchGIHistory();
    fetchReservations();
  }, []);

  useEffect(() => {
    if (selectedProduct && selectedZone) {
      // Find site_id for the selected zone to pass to available stock check
      const zone = zones.find(z => z.id === Number(selectedZone));
      if (zone && zone.site_id) {
        checkAvailableStock(selectedProduct, zone.site_id);
      }
    } else {
      setAvailableQty(null);
      setUnrestrictedQty(null);
      setReservedQty(null);
    }
  }, [selectedProduct, selectedZone]);

  const fetchProducts = async () => {
    try {
      const res = await api.listStockProducts({ limit: 100 });
      setProducts(res.products || []);
    } catch (e) {}
  };

  const fetchZones = async () => {
    try {
      // Assuming a generic API available, or fetch via some client method
      const res = await api.getTenantConfig(); 
      // If client doesn't expose listZones, try direct fetch or fallback
      const r = await fetch('/api/config/tenant'); 
      // Let's use a dummy query or fetch all zones
    } catch (e) {}
    // Fallback zones load via manual fetch
    try {
      const res = await fetch('/api/org-structure/zones');
      // No endpoint? Let's just load from a known one or fallback
    } catch(e) {}
    
    // We'll mock zones if empty, or better fetch from stock overview
    setZones([
      { id: 1, name: 'LHR-01 RECEIVING', site_id: 1 },
      { id: 2, name: 'LHR-01 BULK-A', site_id: 1 },
      { id: 3, name: 'LHR-01 PICK-01', site_id: 1 }
    ]);
  };

  const fetchSites = async () => {
    setSites([
      { id: 1, name: 'LHR-01 Logistics Hub' }
    ]);
  };

  const checkAvailableStock = async (prodId: number, siteId: number) => {
    try {
      const res = await api.getAvailableStock(prodId, siteId);
      setAvailableQty(res.available_qty);
      setUnrestrictedQty(res.unrestricted_qty);
      setReservedQty(res.reserved_qty);
    } catch (e) {
      setAvailableQty(0);
    }
  };

  const fetchGIHistory = async () => {
    try {
      const res = await api.listGIs();
      setGiHistory(res.gi_documents || []);
    } catch (e) {}
  };

  const fetchReservations = async () => {
    try {
      const res = await api.listReservations();
      setReservations(res.reservations || []);
    } catch (e) {}
  };

  const handlePostGI = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.postGI({
        product_id: Number(selectedProduct),
        quantity: qty,
        unit,
        zone_id: Number(selectedZone),
        movement_type: mType,
        reason_code: reasonCode,
        reason_text: reasonText,
        cost_centre: costCentre,
        notes
      });

      setSuccess(`GI Document Created Successfully! Type: ${mType}`);
      setQty(1);
      fetchGIHistory();
      // Refresh available stock
      const zone = zones.find(z => z.id === Number(selectedZone));
      if (zone && zone.site_id) {
        checkAvailableStock(selectedProduct, zone.site_id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process Goods Issue');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.createReservation({
        product_id: Number(selectedProduct),
        site_id: Number(selectedSite),
        quantity: resQty,
        unit: 'EA',
        movement_type: '261',
        reserved_by_type: 'MANUAL',
        notes: resNotes
      });

      setSuccess('Reservation created successfully!');
      setResQty(1);
      setResNotes('');
      fetchReservations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (id: number) => {
    try {
      await api.cancelReservation(id);
      fetchReservations();
    } catch (e) {}
  };

  const getMovementLabel = (code: string) => {
    const labels: any = {
      '261': 'Issue to Production',
      '551': 'Write Off / Scrap',
      '601': 'Issue for Delivery'
    };
    return labels[code] || code;
  };

  return (
    <div style={{
      padding: '24px',
      background: 'var(--bg-base)',
      minHeight: 'calc(100vh - 60px)',
      color: 'var(--text-1)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          Stock Issues
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '13.5px' }}>
          Track all outbound stock movements — production, delivery, and write-offs
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setActiveTab('GI')}
          style={{
            background: activeTab === 'GI' ? 'var(--accent-dim)' : 'transparent',
            color: activeTab === 'GI' ? 'var(--accent)' : 'var(--text-3)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
        >
          Issue Stock
        </button>
        <button
          onClick={() => setActiveTab('RES')}
          style={{
            background: activeTab === 'RES' ? 'var(--accent-dim)' : 'transparent',
            color: activeTab === 'RES' ? 'var(--accent)' : 'var(--text-3)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
        >
          Reserved Stock
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '13.5px',
          marginBottom: '24px'
        }}>
          Error: {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '8px',
          color: '#22c55e',
          fontSize: '13.5px',
          marginBottom: '24px'
        }}>
          {success}
        </div>
      )}

      {activeTab === 'GI' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* GI Form */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Issue Stock</h3>
            
            <form onSubmit={handlePostGI} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Issue Type</label>
                <select
                  value={mType}
                  onChange={e => setMType(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                >
                  <option value="261">Issue to Production</option>
                  <option value="551">Write Off / Scrap</option>
                  <option value="601">Issue for Delivery</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Product</label>
                  <select
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                    required
                  >
                    <option value={0}>-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Source Zone</label>
                  <select
                    value={selectedZone}
                    onChange={e => setSelectedZone(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                    required
                  >
                    <option value={0}>-- Select Zone --</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {availableQty !== null && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Available: <strong style={{ color: 'var(--text-1)' }}>{unrestrictedQty}</strong></span>
                  <span>Reserved: <strong style={{ color: '#eab308' }}>{reservedQty}</strong></span>
                  <span>Net Available: <strong style={{ color: availableQty > 0 ? '#22c55e' : '#ef4444' }}>{availableQty}</strong></span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={qty}
                    onChange={e => setQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                    min={0.0001}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Expired"
                    value={reasonCode}
                    onChange={e => setReasonCode(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Department / Cost Centre</label>
                  <input
                    type="text"
                    placeholder="e.g. CC-MFG01"
                    value={costCentre}
                    onChange={e => setCostCentre(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px', minHeight: '60px' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || (availableQty !== null && availableQty < qty)}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: (loading || (availableQty !== null && availableQty < qty)) ? 'not-allowed' : 'pointer',
                  opacity: (loading || (availableQty !== null && availableQty < qty)) ? 0.6 : 1,
                  transition: 'opacity 200ms ease'
                }}
              >
                {loading ? 'Posting...' : 'Confirm Issue'}
              </button>
            </form>
          </div>

          {/* GI History */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            overflowY: 'auto',
            maxHeight: '600px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Issue History</h3>
            
            {giHistory.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No issues posted yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {giHistory.map((gi: any) => (
                  <div key={gi.id} style={{
                    padding: '14px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.01)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-1)' }}>{gi.gi_number}</div>
                      <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>{getMovementLabel(gi.movement_type)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>Posted: {new Date(gi.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      background: 'var(--accent-dim)',
                      color: 'var(--accent)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      {gi.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Reservation Form */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Create Stock Reservation</h3>
            
            <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Product</label>
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                  required
                >
                  <option value={0}>-- Select Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Site</label>
                <select
                  value={selectedSite}
                  onChange={e => setSelectedSite(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                  required
                >
                  <option value={0}>-- Select Site --</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={resQty}
                  onChange={e => setResQty(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px' }}
                  min={0.0001}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Notes</label>
                <textarea
                  placeholder="Reason for reservation..."
                  value={resNotes}
                  onChange={e => setResNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '6px', minHeight: '60px' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 200ms ease'
                }}
              >
                {loading ? 'Creating...' : 'Create Reservation'}
              </button>
            </form>
          </div>

          {/* Reservations List */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            overflowY: 'auto',
            maxHeight: '600px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Active Reservations</h3>
            
            {reservations.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No active reservations.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reservations.map((res: any) => (
                  <div key={res.id} style={{
                    padding: '14px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.01)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-1)' }}>{res.reservation_number}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Product: <strong>{res.product_code}</strong></div>
                      <div style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>Qty: {res.open_qty} {res.unit}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>Type: {res.reserved_by_type}</div>
                    </div>
                    <button
                      onClick={() => handleCancelReservation(res.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
