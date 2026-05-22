import { useEffect, useState } from 'react';
import { Plus, Search, Car } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  brand?: string;
  model?: string;
  fuelType?: string;
  kmReading?: number;
  customer: { id: string; name: string; mobile: string };
}

interface Customer {
  id: string;
  name: string;
}

export function VehiclesPage() {
  const token = useAuthStore((s) => s.token)!;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '', vehicleNumber: '', brand: '', model: '', fuelType: 'Petrol', kmReading: '',
  });

  const load = () => {
    api<{ items: Vehicle[] }>(IPC.VEHICLES_LIST, token, { search, limit: 50 }).then((r) => setVehicles(r.items));
    api<{ items: Customer[] }>(IPC.CUSTOMERS_LIST, token, { limit: 100 }).then((r) => setCustomers(r.items));
  };

  useEffect(() => { load(); }, [search]);

  const handleSave = async () => {
    await api(IPC.VEHICLES_CREATE, token, {
      ...form,
      kmReading: form.kmReading ? parseInt(form.kmReading) : undefined,
    });
    setModalOpen(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Track vehicles and service history"
        actions={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Vehicle</button>}
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-mid" />
        <input className="input pl-10" placeholder="Search vehicle number, brand..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.length === 0 ? (
          <div className="col-span-full"><EmptyState icon={Car} title="No vehicles" /></div>
        ) : (
          vehicles.map((v) => (
            <div key={v.id} className="card hover:border-brand-terracotta/30 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-brand-terracotta">{v.vehicleNumber}</p>
                  <p className="text-sm text-brand-charcoal">{v.brand} {v.model}</p>
                </div>
                <Car className="h-8 w-8 text-brand-mid/50" />
              </div>
              <div className="mt-3 space-y-1 text-sm text-brand-mid">
                <p>Owner: {v.customer.name}</p>
                <p>{v.customer.mobile}</p>
                {v.fuelType && <p>Fuel: {v.fuelType}</p>}
                {v.kmReading && <p>KM: {v.kmReading.toLocaleString()}</p>}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Vehicle" size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-brand-mid">Customer *</label>
            <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Vehicle Number *</label>
            <input className="input" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Brand</label>
            <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Model</label>
            <input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Fuel Type</label>
            <select className="input" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
              {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">KM Reading</label>
            <input className="input" type="number" value={form.kmReading} onChange={(e) => setForm({ ...form, kmReading: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!form.customerId || !form.vehicleNumber}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
