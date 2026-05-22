import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, AlertTriangle } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { INVENTORY_CATEGORIES, formatCurrency } from '@/lib/format';
import { useNotificationStore } from '@/stores/notificationStore';
import { useStockAlertStore, showStockNativeAlert } from '@/stores/stockAlertStore';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier?: { name: string };
}

export function InventoryPage() {
  const token = useAuthStore((s) => s.token)!;
  const refreshNotifications = useNotificationStore((s) => s.fetch);
  const refreshStockBadge = useStockAlertStore((s) => s.fetch);
  const lowCount = useStockAlertStore((s) => s.count);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    sku: '', name: '', category: 'ACCESSORIES', quantity: 0, minStock: 5,
    purchasePrice: 0, sellingPrice: 0, description: '',
  });

  const load = () => {
    api<{ items: InventoryItem[] }>(IPC.INVENTORY_LIST, token, { limit: 100 }).then((r) => setItems(r.items));
  };

  useEffect(() => {
    load();
    refreshStockBadge();
  }, []);

  const handleSave = async () => {
    await api(IPC.INVENTORY_CREATE, token, form);
    setModalOpen(false);
    load();
    void useNotificationStore.getState().fetch();
  };

  const adjustStock = async (id: string, qty: number) => {
    const reason = prompt('Reason for adjustment:');
    if (!reason) return;
    const res = await api<{
      item: InventoryItem;
      alert: { title: string; body: string } | null;
    }>(IPC.INVENTORY_ADJUST, token, id, qty, reason);
    await showStockNativeAlert(res.alert);
    load();
    refreshStockBadge();
    refreshNotifications();
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Spare parts stock management"
        actions={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Part</button>}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-3">
          <Package className="h-8 w-8 text-brand-terracotta" />
          <div>
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-brand-mid">Total SKUs</p>
          </div>
        </div>
        <Link to="/stock-alerts" className="card flex items-center gap-3 border-brand-warning/25 transition-colors hover:border-brand-warning/50">
          <AlertTriangle className="h-8 w-8 text-brand-warning" />
          <div>
            <p className="text-2xl font-bold text-brand-warning">{lowCount || items.filter((i) => i.quantity <= i.minStock).length}</p>
            <p className="text-xs text-brand-mid">Low stock alerts →</p>
          </div>
        </Link>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Purchase</th>
              <th>Selling</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.quantity <= item.minStock ? 'bg-brand-warning-dim/30' : ''}>
                <td className="font-mono text-sm">{item.sku}</td>
                <td className="font-medium">{item.name}</td>
                <td className="text-brand-mid capitalize">{item.category.replace(/_/g, ' ').toLowerCase()}</td>
                <td>
                  <span className={item.quantity <= item.minStock ? 'text-brand-warning font-bold' : ''}>
                    {item.quantity}
                  </span>
                  <span className="text-brand-mid"> / {item.minStock}</span>
                </td>
                <td>{formatCurrency(item.purchasePrice)}</td>
                <td>{formatCurrency(item.sellingPrice)}</td>
                <td>{item.supplier?.name ?? '—'}</td>
                <td>
                  <button onClick={() => adjustStock(item.id, 10)} className="btn-ghost text-xs mr-1">+10</button>
                  <button onClick={() => adjustStock(item.id, -1)} className="btn-ghost text-xs">-1</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Spare Part" size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs text-brand-mid">SKU *</label><input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-brand-mid">Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {INVENTORY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div><label className="mb-1 block text-xs text-brand-mid">Quantity</label><input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-brand-mid">Min Stock</label><input className="input" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-brand-mid">Purchase Price</label><input className="input" type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: +e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-brand-mid">Selling Price</label><input className="input" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save</button>
        </div>
      </Modal>
    </div>
  );
}
