import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, User, Phone } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/format';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  notes?: string;
  createdAt: string;
  _count?: { vehicles: number; jobCards: number };
}

export function CustomersPage() {
  const token = useAuthStore((s) => s.token)!;
  const [params] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', mobile: '', address: '', notes: '' });

  const load = () => {
    setLoading(true);
    api<{ items: Customer[] }>(IPC.CUSTOMERS_LIST, token, { search, limit: 50 })
      .then((r) => setCustomers(r.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', mobile: '', address: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, mobile: c.mobile, address: c.address ?? '', notes: c.notes ?? '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      await api(IPC.CUSTOMERS_UPDATE, token, editing.id, form);
    } else {
      await api(IPC.CUSTOMERS_CREATE, token, form);
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    await api(IPC.CUSTOMERS_DELETE, token, id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer profiles and service history"
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add Customer</button>}
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-mid" />
        <input className="input pl-10" placeholder="Search by name, mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        {loading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner label="Loading customers…" /></div>
        ) : customers.length === 0 ? (
          <EmptyState icon={User} title="No customers" description="Add your first customer to get started" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Vehicles</th>
                <th>Jobs</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td><span className="flex items-center gap-1 text-brand-mid"><Phone className="h-3 w-3" />{c.mobile}</span></td>
                  <td className="max-w-[200px] truncate text-brand-mid">{c.address ?? '—'}</td>
                  <td>{c._count?.vehicles ?? 0}</td>
                  <td>{c._count?.jobCards ?? 0}</td>
                  <td className="text-brand-mid">{formatDate(c.createdAt)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="btn-ghost p-2"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="btn-ghost p-2 text-brand-error"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Mobile *</label>
            <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Notes</label>
            <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={!form.name || !form.mobile}>Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
