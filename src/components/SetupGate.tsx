import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SetupGate({ children }: { children: ReactNode }) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ needsSetup: boolean }>(IPC.SETUP_STATUS)
      .then((s) => setNeedsSetup(s.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  if (needsSetup === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-parchment">
        <LoadingSpinner size="lg" label="Starting Workshop Pro…" />
      </div>
    );
  }

  if (needsSetup) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}
