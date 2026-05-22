import { useEffect, useState } from 'react';
import { UserCog, Wrench, CheckCircle } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  _count?: { jobCards: number };
}

interface MechanicPerf {
  id: string;
  name: string;
  completedJobs: number;
  activeJobs: number;
}

export function StaffPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [performance, setPerformance] = useState<MechanicPerf[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', pin: '1234', role: 'MECHANIC' });

  const load = () => {
    api<StaffMember[]>(IPC.STAFF_LIST, token).then(setStaff);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await api(IPC.STAFF_CREATE, token, form);
    setModalOpen(false);
    load();
  };

  const roleIcon = (role: string) => {
    if (role === 'MECHANIC') return Wrench;
    return UserCog;
  };

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description="Team, mechanics & attendance"
        actions={
          user?.role === 'ADMIN' ? (
            <button onClick={() => setModalOpen(true)} className="btn-primary">Add Staff</button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => {
          const Icon = roleIcon(s.role);
          return (
            <div key={s.id} className="card">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-brand-terracotta/12 p-3">
                  <Icon className="h-6 w-6 text-brand-terracotta" />
                </div>
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs capitalize text-brand-mid">{s.role.toLowerCase()}</p>
                  {s.phone && <p className="mt-1 text-sm">{s.phone}</p>}
                  <p className="mt-2 text-xs text-brand-mid">{s._count?.jobCards ?? 0} jobs assigned</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Member">
        <div className="space-y-4">
          <div><label className="mb-1 block text-xs text-brand-mid">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-brand-mid">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-brand-mid">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="MECHANIC">Mechanic</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div><label className="mb-1 block text-xs text-brand-mid">PIN (4 digits)</label><input className="input" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} maxLength={4} /></div>
          <button onClick={handleSave} className="btn-primary w-full">Save</button>
        </div>
      </Modal>
    </div>
  );
}
