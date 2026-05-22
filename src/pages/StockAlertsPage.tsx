import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Package,
  RefreshCw,
  Plus,
  ArrowUpCircle,
  Phone,
  History,
} from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useStockAlertStore, showStockNativeAlert } from '@/stores/stockAlertStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/format';

type AlertLevel = 'OUT_OF_STOCK' | 'LOW';

interface StockAlertItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  purchasePrice: number;
  sellingPrice: number;
  alertLevel: AlertLevel;
  shortfall: number;
  percentOfMin: number;
  supplier?: { id: string; name: string; phone: string | null };
  stockHistory: { id: string; changeQty: number; reason: string; createdAt: string }[];
}

type FilterTab = 'all' | 'out' | 'low';

export function StockAlertsPage() {
  const token = useAuthStore((s) => s.token)!;
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('focus');
  const refreshBadge = useStockAlertStore((s) => s.fetch);
  const refreshNotifications = useNotificationStore((s) => s.fetch);

  const [items, setItems] = useState<StockAlertItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, outOfStock: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<StockAlertItem | null>(null);
  const [minStockEdit, setMinStockEdit] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{
        items: StockAlertItem[];
        summary: { total: number; outOfStock: number; low: number };
      }>(IPC.INVENTORY_ALERTS, token);
      setItems(data.items);
      setSummary(data.summary);
      await refreshBadge();
    } finally {
      setLoading(false);
    }
  }, [token, refreshBadge]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!focusId || loading) return;
    const el = document.getElementById(`alert-${focusId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('ring-2', 'ring-brand-terracotta');
    const t = setTimeout(() => el?.classList.remove('ring-2', 'ring-brand-terracotta'), 3000);
    return () => clearTimeout(t);
  }, [focusId, loading, items.length]);

  const filtered = useMemo(() => {
    if (filter === 'out') return items.filter((i) => i.alertLevel === 'OUT_OF_STOCK');
    if (filter === 'low') return items.filter((i) => i.alertLevel === 'LOW');
    return items;
  }, [items, filter]);

  const afterStockChange = async (alert?: { title: string; body: string } | null) => {
    await showStockNativeAlert(alert);
    await load();
    await refreshNotifications();
  };

  const restockToMin = async (id: string) => {
    setBusyId(id);
    try {
      const res = await api<{
        item: { quantity: number; minStock: number; name: string; sku: string };
        changed: boolean;
        alert: { title: string; body: string } | null;
      }>(IPC.INVENTORY_RESTOCK, token, id);
      if (res.changed) await afterStockChange(res.alert);
      else await load();
    } finally {
      setBusyId(null);
    }
  };

  const adjust = async (id: string, qty: number) => {
    const reason = qty > 0 ? 'Quick restock from alerts' : 'Stock correction from alerts';
    setBusyId(id);
    try {
      const res = await api<{
        item: { quantity: number; minStock: number; name: string; sku: string };
        alert: { title: string; body: string } | null;
      }>(IPC.INVENTORY_ADJUST, token, id, qty, reason);
      await afterStockChange(res.alert);
    } finally {
      setBusyId(null);
    }
  };

  const saveMinStock = async () => {
    if (!editItem) return;
    setBusyId(editItem.id);
    try {
      await api(IPC.INVENTORY_UPDATE, token, editItem.id, { minStock: minStockEdit });
      setEditItem(null);
      await load();
      await refreshNotifications();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock alerts"
        description="Parts at or below minimum stock — restock before jobs stall"
        actions={
          <div className="flex gap-2">
            <Link to="/inventory" className="btn-secondary">
              Full inventory
            </Link>
            <button onClick={load} className="btn-secondary" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-3 border-brand-warning/30">
          <AlertTriangle className="h-8 w-8 text-brand-warning" />
          <div>
            <p className="text-2xl font-bold text-brand-warning">{summary.total}</p>
            <p className="text-xs text-brand-mid">Active alerts</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 border-brand-error/30">
          <Package className="h-8 w-8 text-brand-error" />
          <div>
            <p className="text-2xl font-bold text-brand-error">{summary.outOfStock}</p>
            <p className="text-xs text-brand-mid">Out of stock</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-brand-terracotta" />
          <div>
            <p className="text-2xl font-bold text-brand-charcoal">{summary.low}</p>
            <p className="text-xs text-brand-mid">Below minimum</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['all', `All (${summary.total})`],
            ['out', `Out of stock (${summary.outOfStock})`],
            ['low', `Low (${summary.low})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={filter === key ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading stock alerts…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 text-brand-success" />
          <p className="font-semibold text-brand-charcoal">All stock levels are healthy</p>
          <p className="mt-1 text-sm text-brand-mid">No items are at or below their minimum threshold.</p>
          <Link to="/inventory" className="btn-primary mt-4 inline-flex">
            View inventory
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isOut = item.alertLevel === 'OUT_OF_STOCK';
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                id={`alert-${item.id}`}
                className={`card transition-shadow ${
                  isOut ? 'border-brand-error/40 bg-brand-error-bg/20' : 'border-brand-warning/30'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge ${isOut ? 'bg-brand-error-bg text-brand-error' : 'bg-brand-warning-bg text-brand-warning'}`}
                      >
                        {isOut ? 'Out of stock' : 'Low stock'}
                      </span>
                      <span className="font-mono text-xs text-brand-mid">{item.sku}</span>
                      <span className="text-xs capitalize text-brand-mid">
                        {item.category.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-brand-charcoal">{item.name}</h3>
                    <p className="mt-1 text-sm text-brand-mid">
                      <span className={isOut ? 'font-bold text-brand-error' : 'font-bold text-brand-warning'}>
                        {item.quantity}
                      </span>
                      {' '}
                      in stock · minimum {item.minStock}
                      {item.shortfall > 0 && (
                        <span className="text-brand-terracotta"> · need +{item.shortfall} to reach min</span>
                      )}
                    </p>
                    <div className="mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-brand-light">
                      <div
                        className={`h-full rounded-full ${isOut ? 'bg-brand-error' : 'bg-brand-warning'}`}
                        style={{ width: `${Math.min(100, item.percentOfMin)}%` }}
                      />
                    </div>
                    {item.supplier && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-brand-mid">
                        <Phone className="h-3 w-3" />
                        Supplier: {item.supplier.name}
                        {item.supplier.phone ? ` · ${item.supplier.phone}` : ''}
                      </p>
                    )}
                    {item.stockHistory.length > 0 && (
                      <div className="mt-3 rounded-[10px] bg-brand-light/80 px-3 py-2">
                        <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-brand-mid">
                          <History className="h-3 w-3" />
                          Recent movements
                        </p>
                        <ul className="space-y-0.5 text-xs text-brand-charcoal">
                          {item.stockHistory.map((h) => (
                            <li key={h.id}>
                              {h.changeQty > 0 ? '+' : ''}
                              {h.changeQty} — {h.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    <button
                      onClick={() => restockToMin(item.id)}
                      disabled={busy || item.shortfall === 0}
                      className="btn-primary text-sm"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Restock to min (+{item.shortfall || item.minStock})
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => adjust(item.id, 10)}
                        disabled={busy}
                        className="btn-secondary text-sm flex-1"
                      >
                        <Plus className="h-4 w-4" />
                        +10
                      </button>
                      <button
                        onClick={() => adjust(item.id, 1)}
                        disabled={busy}
                        className="btn-secondary text-sm flex-1"
                      >
                        +1
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setEditItem(item);
                        setMinStockEdit(item.minStock);
                      }}
                      disabled={busy}
                      className="btn-ghost text-sm"
                    >
                      Edit minimum
                    </button>
                    <p className="text-right text-xs text-brand-mid lg:text-left">
                      {formatCurrency(item.purchasePrice)} → {formatCurrency(item.sellingPrice)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title={editItem ? `Minimum stock — ${editItem.name}` : 'Minimum stock'}
        size="sm"
      >
        <label className="mb-1 block text-xs text-brand-mid">Alert when quantity falls to or below</label>
        <input
          className="input"
          type="number"
          min={0}
          value={minStockEdit}
          onChange={(e) => setMinStockEdit(+e.target.value)}
        />
        <p className="mt-2 text-xs text-brand-mid">
          You will get bell notifications and desktop alerts when stock is at or below this level.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setEditItem(null)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={saveMinStock} className="btn-primary" disabled={!!busyId}>
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}
