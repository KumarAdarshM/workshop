import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Lock, Mail, Delete } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginPin, checkSession, isLoading } = useAuthStore();
  const [mode, setMode] = useState<'admin' | 'pin'>('pin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkSession().then((ok) => ok && navigate('/'));
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    setError('');
    try {
      await loginPin(pin);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid PIN');
      setPin('');
    }
  };

  useEffect(() => {
    if (pin.length === 4) handlePinSubmit();
  }, [pin]);

  return (
    <div className="flex min-h-screen bg-brand-parchment">
      {/* Charcoal brand panel */}
      <div className="panel-dark hidden flex-1 flex-col justify-between border-r border-brand-dark-border p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-brand-terracotta/20 ring-1 ring-brand-terracotta/40">
            <Wrench className="h-5 w-5 text-brand-terracotta-light" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-brand-parchment">Workshop Pro</h1>
            <p className="text-xs text-brand-mid">Offline garage ERP</p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-semibold leading-snug tracking-tight text-brand-parchment">
            Your workshop,
            <br />
            <span className="text-brand-terracotta-light">fully digital</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-mid">
            Job cards, GST billing, inventory, and reports — built for workshop owners. Works without internet.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['Job Cards', 'GST Billing', 'Inventory', 'Reports'].map((f) => (
              <span
                key={f}
                className="rounded-[8px] border border-brand-dark-border bg-brand-dark-hover px-3 py-1.5 text-xs text-brand-mid"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-brand-mid">
          Secure offline ERP for automobile workshops. Contact your administrator if you need access.
        </p>
      </div>

      {/* Parchment login form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-brand-parchment p-8">
        <div className="w-full max-w-[360px] animate-slide-up">
          <div className="mb-8 text-center lg:hidden">
            <Wrench className="mx-auto h-8 w-8 text-brand-terracotta" />
            <h1 className="mt-3 text-lg font-semibold text-brand-charcoal">Workshop Pro</h1>
          </div>

          <div className="mb-6 flex rounded-[12px] border border-brand-mid/50 bg-brand-light p-1">
            <button
              type="button"
              className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors ${
                mode === 'pin' ? 'bg-brand-white text-brand-terracotta shadow-sm' : 'text-brand-mid hover:text-brand-charcoal'
              }`}
              onClick={() => setMode('pin')}
            >
              Quick PIN
            </button>
            <button
              type="button"
              className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors ${
                mode === 'admin' ? 'bg-brand-white text-brand-terracotta shadow-sm' : 'text-brand-mid hover:text-brand-charcoal'
              }`}
              onClick={() => setMode('admin')}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-[10px] border border-brand-error/30 bg-brand-error-bg px-4 py-3 text-sm text-brand-error">
              {error}
            </div>
          )}

          {mode === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-mid" />
                  <input className="input pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
                </div>
              </div>
              <div>
                <label className="label">PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-mid" />
                  <input className="input pl-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <div>
              <p className="mb-6 text-center text-sm text-brand-mid">Enter your 4-digit PIN</p>
              <div className="mb-8 flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full border-2 transition-all duration-150 ${
                      pin.length > i ? 'border-brand-terracotta bg-brand-terracotta scale-110' : 'border-brand-mid bg-brand-white'
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
                  <button
                    key={key || 'empty'}
                    type="button"
                    disabled={!key || isLoading}
                    onClick={() => (key === 'del' ? setPin((p) => p.slice(0, -1)) : key && setPin((p) => p + key))}
                    className={`flex h-14 items-center justify-center rounded-[12px] text-lg font-medium transition-colors ${
                      key
                        ? 'border border-brand-mid/50 bg-brand-white text-brand-charcoal hover:border-brand-terracotta/40 hover:bg-brand-light shadow-sm'
                        : 'invisible'
                    }`}
                  >
                    {key === 'del' ? <Delete className="h-5 w-5 text-brand-mid" /> : key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
