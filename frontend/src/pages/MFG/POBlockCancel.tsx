import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, InlineAlert } from '@/components/ui/Form';
import { cn } from '@/lib/cn';

interface POLine {
  po_id: number;
  po_number: string;
  item_no: number;
  material_name?: string;
  short_text?: string;
  quantity: number;
  unit?: string;
  blocked: boolean;
  block_reason_code?: string;
  blocked_by?: string;
  blocked_at?: string;
  deleted: boolean;
}

interface BlockReason {
  code: string;
  description: string;
}

export const POBlockCancel: React.FC = () => {
  const { setModule } = useAppStore();
  const [lines, setLines] = useState<POLine[]>([]);
  const [reasons, setReasons] = useState<BlockReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'BLOCKED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [showUnblockModal, setShowUnblockModal] = useState<POLine | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<POLine | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resR = await apiClient.get("/api/po/block-reasons");
      setReasons(resR.data?.block_reasons || []);

      const resPO = await apiClient.get("/api/purchase-orders?limit=200");
      const pos = resPO.data?.purchase_orders || [];

      const allLines: POLine[] = [];
      const chunkSize = 10;
      for (let i = 0; i < pos.length; i += chunkSize) {
        const chunk = pos.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(async (po: any) => {
            try {
              const resL = await apiClient.get(`/api/purchase-orders/${po.id}`);
              return (resL.data.lines || []).map((l: any) => ({
                ...l,
                po_id: po.id,
                po_number: po.po_number
              }));
            } catch { return []; }
          })
        );
        allLines.push(...results.flat());
      }
      setLines(allLines);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUnblock = async () => {
    if (!showUnblockModal) return;
    setError(null);
    try {
      await apiClient.post(`/api/po/${showUnblockModal.po_id}/items/${showUnblockModal.item_no}/unblock`);
      const resL = await apiClient.get(`/api/purchase-orders/${showUnblockModal.po_id}`);
      const newLines = (resL.data.lines || []).map((l: any) => ({ ...l, po_id: showUnblockModal.po_id, po_number: showUnblockModal.po_number }));
      setLines(prev => {
        const filtered = prev.filter(p => p.po_id !== showUnblockModal.po_id);
        return [...filtered, ...newLines];
      });
      setShowUnblockModal(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    setError(null);
    try {
      const res = await apiClient.delete(`/api/po/${showDeleteModal.po_id}/items/${showDeleteModal.item_no}`);
      setLines(prev => prev.map(p => 
        (p.po_id === showDeleteModal.po_id && p.item_no === showDeleteModal.item_no) 
        ? { ...p, deleted: true } 
        : p
      ));
      setShowDeleteModal(null);
    } catch (e: any) {
      if (e.response?.status === 409) {
        setError(`Cannot delete — goods receipt of ${e.response.data.gr_qty} items already posted.`);
      } else {
        setError(e.message);
      }
    }
  };

  const filteredLines = useMemo(() => {
    return lines.filter(l => {
      const matchesSearch = l.po_number.toLowerCase().includes(search.toLowerCase()) || 
                            (l.short_text || "").toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'BLOCKED') return l.blocked && !l.deleted;
      if (filter === 'CANCELLED') return l.deleted;
      return true;
    });
  }, [lines, filter, search]);

  const stats = {
    totalBlocked: lines.filter(l => l.blocked && !l.deleted).length,
    cancelled: lines.filter(l => l.deleted).length,
    totalLines: lines.length
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] p-8 space-y-8 animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">PO Block Cockpit</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Commitment control · Exception handling · Soft cancellation</p>
        </div>
        <div className="flex gap-4">
           <Input 
              placeholder="Search by PO or Material..." 
              className="w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
           />
           <Button variant="ghost" onClick={loadData}>REFRESH</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="BLOCKED ITEMS" value={stats.totalBlocked} icon="🚫" className="border-amber-500/20" />
        <KpiCard label="CANCELLED" value={stats.cancelled} icon="❌" className="border-red-500/20" />
        <KpiCard label="UNDER REVIEW" value={lines.filter(l => l.blocked || l.deleted).length} icon="⚖️" />
        <KpiCard label="ACTIVE ITEMS" value={stats.totalLines - stats.cancelled} icon="✅" className="border-green-500/20" />
      </div>

      {error && <InlineAlert type="error" message={error} />}

      <Card>
        <CardHeader title="Purchase Orders">
           <div className="flex bg-white/5 p-1 rounded-lg">
              {(['ALL', 'BLOCKED', 'CANCELLED'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                    filter === f ? "bg-[var(--accent)] text-black shadow-lg" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={[
              { key: 'po_number', header: 'PO NUMBER', mono: true, className: 'text-[var(--accent)] font-bold' },
              { key: 'item_no', header: 'ITEM', width: '60px', className: 'opacity-50' },
              { key: 'material', header: 'MATERIAL', render: (l) => l.material_name || "—" },
              { key: 'short_text', header: 'DESCRIPTION', className: 'text-[var(--text-2)] truncate max-w-[200px]' },
              { key: 'quantity', header: 'QTY', render: (l) => `${l.quantity} ${l.unit}` },
              { 
                key: 'status', 
                header: 'STATUS', 
                render: (l) => {
                  if (l.deleted) return <Badge variant="red">CANCELLED</Badge>;
                  if (l.blocked) return <Badge variant="amber">{reasons.find(r => r.code === l.block_reason_code)?.description || l.block_reason_code}</Badge>;
                  return <Badge variant="green">ACTIVE</Badge>;
                }
              },
              { key: 'blocked_by', header: 'ACTOR', className: 'opacity-30 text-[10px]' },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (l) => (
                  <div className="flex justify-end gap-2">
                    {l.blocked && !l.deleted && (
                      <Button variant="ghost" size="sm" className="text-green-500 hover:bg-green-500/10" onClick={() => setShowUnblockModal(l)}>UNBLOCK</Button>
                    )}
                    {!l.deleted && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10" onClick={() => setShowDeleteModal(l)}>DELETE</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setModule('POManagement')}>VIEW PO</Button>
                  </div>
                )
              }
            ]}
            rows={filteredLines}
            loading={loading}
          />
        </CardBody>
      </Card>

      <Modal open={!!showUnblockModal} onClose={() => setShowUnblockModal(null)} title="Release Line Block" subtitle="Restore commitment for this purchase order line">
        <div className="space-y-6">
          <p className="text-sm text-[var(--text-2)]">
            Releasing the block on <span className="text-white font-bold">{showUnblockModal?.po_number} / {showUnblockModal?.item_no}</span> will allow goods receipt and invoice matching to proceed.
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="primary" className="flex-1" onClick={handleUnblock}>CONFIRM RELEASE</Button>
            <Button variant="ghost" className="flex-1" onClick={() => setShowUnblockModal(null)}>CANCEL</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Cancel Line Item" subtitle="Permanent soft-deletion of purchase order line">
        <div className="space-y-6">
          <p className="text-sm text-[var(--text-2)]">
            Are you sure you want to cancel line <span className="text-white font-bold">{showDeleteModal?.item_no}</span> of PO <span className="text-white font-bold">{showDeleteModal?.po_number}</span>?
            This action is irreversible if financial commitments have already been impacted.
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="danger" className="flex-1" onClick={handleDelete}>CONFIRM CANCELLATION</Button>
            <Button variant="ghost" className="flex-1" onClick={() => setShowDeleteModal(null)}>CANCEL</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POBlockCancel;
