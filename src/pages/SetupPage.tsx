import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ChevronRight, ChevronLeft, Shield } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types/ipc';

interface SetupStatus {
  needsSetup: boolean;
  demoDataAvailable: boolean;
}

type Step = 1 | 2 | 3;

export function SetupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore.setState;
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [workshopName, setWorkshopName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [defaultGst, setDefaultGst] = useState(18);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [acceptEula, setAcceptEula] = useState(false);
  const [includeDemoData, setIncludeDemoData] = useState(false);

  useEffect(() => {
    api<SetupStatus>(IPC.SETUP_STATUS).then((s) => {
      setStatus(s);
      if (!s.needsSetup) navigate('/login', { replace: true });
    });
  }, [navigate]);

  const nextStep = () => {
    setError('');
    if (step === 1 && !workshopName.trim()) {
      setError('Workshop name is required');
      return;
    }
    if (step === 2) {
      if (!adminName.trim() || !adminEmail.trim()) {
        setError('Admin name and email are required');
        return;
      }
      if (adminPin.length < 4 || adminPin !== confirmPin) {
        setError('Enter a matching PIN of at least 4 digits');
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1) as Step);
  };

  const handleComplete = async () => {
    if (!acceptEula) {
      setError('Please accept the license agreement');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api<{
        success: boolean;
        token?: string;
        user?: User;
        error?: string;
      }>(IPC.SETUP_COMPLETE, {
        workshopName,
        address,
        phone,
        gstNumber,
        defaultGst,
        adminName,
        adminEmail,
        adminPhone,
        adminPin,
        confirmPin,
        acceptEula,
        includeDemoData: status?.demoDataAvailable ? includeDemoData : false,
      });
      if (!res.success || !res.token) throw new Error(res.error ?? 'Setup failed');
      setAuth({ token: res.token, user: res.user ?? null, isLoading: false });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!status?.needsSetup) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-parchment">
        <p className="text-sm text-brand-mid">Loading setup…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-brand-parchment">
      <div className="panel-dark hidden w-[380px] flex-col justify-between border-r border-brand-dark-border p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-brand-terracotta/20 ring-1 ring-brand-terracotta/40">
            <Wrench className="h-5 w-5 text-brand-terracotta-light" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-brand-parchment">Workshop Pro</h1>
            <p className="text-xs text-brand-mid">First-time setup</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { n: 1, label: 'Workshop profile' },
            { n: 2, label: 'Administrator account' },
            { n: 3, label: 'License agreement' },
          ].map(({ n, label }) => (
            <div
              key={n}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm ${
                step === n ? 'bg-brand-dark-hover text-brand-parchment' : 'text-brand-mid'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  step >= n ? 'bg-brand-terracotta text-brand-parchment' : 'border border-brand-dark-border'
                }`}
              >
                {n}
              </span>
              {label}
            </div>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-brand-mid">
          Your data stays on this computer. Set a strong admin PIN — it is required to sign in and manage staff.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
        <div className="w-full max-w-[480px] animate-slide-up">
          <div className="mb-6 lg:hidden">
            <h1 className="text-lg font-semibold text-brand-charcoal">Set up Workshop Pro</h1>
            <p className="text-sm text-brand-mid">Step {step} of 3</p>
          </div>

          {error && (
            <div className="mb-4 rounded-[10px] border border-brand-error/30 bg-brand-error-bg px-4 py-3 text-sm text-brand-error">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold">Workshop profile</h2>
              <p className="text-sm text-brand-mid">Shown on invoices and job cards.</p>
              <div>
                <label className="label">Workshop name *</label>
                <input className="input" value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label">GSTIN</label>
                  <input className="input" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Default GST %</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={defaultGst}
                  onChange={(e) => setDefaultGst(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold">Administrator</h2>
              <p className="text-sm text-brand-mid">This account manages settings, staff, and billing.</p>
              <div>
                <label className="label">Full name *</label>
                <input className="input" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Admin PIN *</label>
                  <input
                    className="input"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label className="label">Confirm PIN *</label>
                  <input
                    className="input"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
              {status.demoDataAvailable && (
                <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-brand-mid/40 bg-brand-light p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={includeDemoData}
                    onChange={(e) => setIncludeDemoData(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-brand-charcoal">Load sample data (development only)</span>
                    <span className="mt-1 block text-brand-mid">
                      Adds demo customers, inventory, and staff with PIN 1234. Not included in production installers.
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2 text-brand-terracotta">
                <Shield className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-brand-charcoal">License agreement</h2>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-[10px] border border-brand-mid/40 bg-brand-light p-4 text-xs leading-relaxed text-brand-mid">
                <p className="mb-2 font-medium text-brand-charcoal">Workshop Pro — End User License Agreement (summary)</p>
                <p>
                  By using Workshop Pro you agree to use the software only under a valid license, on machines you own or
                  control. Customer and business data you enter remains on your device unless you enable future cloud
                  features. You are responsible for backups and compliance with local tax and privacy laws. The full EULA
                  is in the application folder as <code className="text-brand-charcoal">legal/EULA.md</code>.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1" checked={acceptEula} onChange={(e) => setAcceptEula(e.target.checked)} />
                <span>
                  I have read and agree to the{' '}
                  <span className="font-medium text-brand-terracotta">End User License Agreement</span> and{' '}
                  <span className="font-medium text-brand-terracotta">Privacy Policy</span>
                </span>
              </label>
            </div>
          )}

          <div className="mt-6 flex justify-between gap-3">
            {step > 1 ? (
              <button type="button" className="btn-secondary" onClick={() => setStep((s) => (s - 1) as Step)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={nextStep}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={loading || !acceptEula} onClick={handleComplete}>
                {loading ? 'Setting up…' : 'Finish setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
