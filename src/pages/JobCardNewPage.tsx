import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';

export function JobCardNewPage() {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<{ id: string; name: string; mobile: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; vehicleNumber: string }[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [inventory, setInventory] = useState<{ id: string; name: string; sellingPrice: number; quantity: number }[]>([]);

  const [form, setForm] = useState({
    customerId: '',
    vehicleId: '',
    mechanicId: '',
    complaint: '',
    notes: '',
    estimatedCompletion: '',
    gstPercent: 18,
  });

  const [services, setServices] = useState([{ name: 'General Service', description: '', laborCharge: 500, quantity: 1 }]);
  const [parts, setParts] = useState<{ inventoryId?: string; partName: string; quantity: number; unitPrice: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ items: typeof customers }>(IPC.CUSTOMERS_LIST, token, { limit: 200 }).then((r) => setCustomers(r.items));
    api<typeof mechanics>(IPC.AUTH_USERS, token).then((users) =>
      setMechanics(users.filter((u) => u.role === 'MECHANIC' || u.role === 'ADMIN'))
    );
    api<{ items: typeof inventory }>(IPC.INVENTORY_LIST, token, { limit: 200 }).then((r) => setInventory(r.items));
  }, []);

  useEffect(() => {
    if (form.customerId) {
      api<typeof vehicles>(IPC.VEHICLES_BY_CUSTOMER, token, form.customerId).then(setVehicles);
    }
  }, [form.customerId]);

  const addPartFromInventory = (invId: string) => {
    const item = inventory.find((i) => i.id === invId);
    if (!item) return;
    setParts([...parts, { inventoryId: item.id, partName: item.name, quantity: 1, unitPrice: item.sellingPrice }]);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const job = await api<{ id: string }>(IPC.JOBCARDS_CREATE, token, { ...form, services, parts });
      navigate(`/job-cards/${job.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Job Card"
        actions={
          <button onClick={() => navigate('/job-cards')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h3 className="font-semibold">Job Details</h3>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Customer *</label>
            <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, vehicleId: '' })}>
              <option value="">Select</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Vehicle *</label>
            <select className="input" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} disabled={!form.customerId}>
              <option value="">Select</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Mechanic</label>
            <select className="input" value={form.mechanicId} onChange={(e) => setForm({ ...form, mechanicId: e.target.value })}>
              <option value="">Unassigned</option>
              {mechanics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Complaint</label>
            <textarea className="input" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Est. Completion</label>
            <input type="datetime-local" className="input" value={form.estimatedCompletion} onChange={(e) => setForm({ ...form, estimatedCompletion: e.target.value })} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Services</h3>
              <button onClick={() => setServices([...services, { name: '', description: '', laborCharge: 0, quantity: 1 }])} className="btn-ghost text-sm">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {services.map((s, i) => (
              <div key={i} className="mb-3 grid grid-cols-12 gap-2">
                <input className="input col-span-5" placeholder="Service name" value={s.name} onChange={(e) => { const n = [...services]; n[i].name = e.target.value; setServices(n); }} />
                <input className="input col-span-3" type="number" placeholder="₹" value={s.laborCharge} onChange={(e) => { const n = [...services]; n[i].laborCharge = +e.target.value; setServices(n); }} />
                <input className="input col-span-2" type="number" value={s.quantity} onChange={(e) => { const n = [...services]; n[i].quantity = +e.target.value; setServices(n); }} />
                <button onClick={() => setServices(services.filter((_, j) => j !== i))} className="col-span-2 btn-ghost"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Spare Parts</h3>
              <select className="input w-auto text-sm" onChange={(e) => { addPartFromInventory(e.target.value); e.target.value = ''; }}>
                <option value="">+ From inventory</option>
                {inventory.map((i) => <option key={i.id} value={i.id}>{i.name} (₹{i.sellingPrice})</option>)}
              </select>
            </div>
            {parts.map((p, i) => (
              <div key={i} className="mb-2 flex gap-2 text-sm">
                <span className="flex-1">{p.partName}</span>
                <span>x{p.quantity}</span>
                <span>₹{p.unitPrice * p.quantity}</span>
                <button onClick={() => setParts(parts.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-brand-error" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSubmit} className="btn-primary" disabled={saving || !form.customerId || !form.vehicleId}>
          {saving ? 'Creating...' : 'Create Job Card'}
        </button>
      </div>
    </div>
  );
}
