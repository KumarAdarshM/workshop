import { useEffect, useState } from 'react';
import { Save, Database, RotateCcw } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';

interface Settings {
  workshopName: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  defaultGst: number;
  invoicePrefix: string;
  jobCardPrefix: string;
  autoBackup: boolean;
}

export function SettingsPage() {
  const token = useAuthStore((s) => s.token)!;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [backups, setBackups] = useState<{ name: string; path: string; date: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<Settings>(IPC.SETTINGS_GET, token).then(setSettings);
    api<typeof backups>(IPC.BACKUP_LIST, token).then(setBackups);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await api(IPC.SETTINGS_UPDATE, token, settings);
    setMessage('Settings saved');
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const createBackup = async () => {
    const res = await api<{ success: boolean; path?: string }>(IPC.BACKUP_CREATE, token);
    setMessage(res.success ? `Backup created: ${res.path}` : 'Backup failed');
    const list = await api<typeof backups>(IPC.BACKUP_LIST, token);
    setBackups(list);
  };

  const restoreBackup = async (path: string) => {
    if (!confirm('Restore will replace current data. Restart app after restore. Continue?')) return;
    await api(IPC.BACKUP_RESTORE, token, path);
    setMessage('Backup restored. Please restart the application.');
  };

  if (!settings) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div>
      <PageHeader title="Settings" description="Workshop profile, GST & backup" />

      {message && (
        <div className="mb-4 rounded-lg border border-brand-terracotta/25 bg-brand-terracotta/10 text-brand-terracotta px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h3 className="font-semibold">Workshop Profile</h3>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Workshop Name</label>
            <input className="input" value={settings.workshopName} onChange={(e) => setSettings({ ...settings, workshopName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Address</label>
            <textarea className="input" value={settings.address ?? ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-brand-mid">Phone</label>
              <input className="input" value={settings.phone ?? ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-brand-mid">GST Number</label>
              <input className="input" value={settings.gstNumber ?? ''} onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-mid">Default GST %</label>
            <input className="input" type="number" value={settings.defaultGst} onChange={(e) => setSettings({ ...settings, defaultGst: +e.target.value })} />
          </div>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" /> Backup & Restore
          </h3>
          <p className="mb-4 text-sm text-brand-mid">
            Auto backup runs daily. Database is stored locally — works fully offline.
          </p>
          <button onClick={createBackup} className="btn-primary mb-4 w-full">Create Manual Backup</button>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {backups.map((b) => (
              <div key={b.path} className="flex items-center justify-between rounded-lg bg-brand-light px-3 py-2 text-sm">
                <div>
                  <p>{b.name}</p>
                  <p className="text-xs text-brand-mid">{new Date(b.date).toLocaleString()}</p>
                </div>
                <button onClick={() => restoreBackup(b.path)} className="btn-ghost p-2" title="Restore">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            ))}
            {backups.length === 0 && <p className="text-sm text-brand-mid">No backups yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
