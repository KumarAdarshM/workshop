import { useEffect, useState, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { SetupPage } from '@/pages/SetupPage';
import { SetupGate } from '@/components/SetupGate';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { JobCardsPage } from '@/pages/JobCardsPage';
import { JobCardNewPage } from '@/pages/JobCardNewPage';
import { JobCardDetailPage } from '@/pages/JobCardDetailPage';
import { BillingPage } from '@/pages/BillingPage';
import { InvoiceDetailPage } from '@/pages/InvoiceDetailPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { StockAlertsPage } from '@/pages/StockAlertsPage';
import { StaffPage } from '@/pages/StaffPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-brand-parchment p-8 text-center">
          <p className="text-lg font-semibold text-brand-error">Something went wrong</p>
          <p className="max-w-md text-sm text-brand-mid">{this.state.error.message}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, checkSession } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkSession().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-parchment">
        <LoadingSpinner size="lg" label="Starting Workshop Pro…" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route
            path="/login"
            element={
              <SetupGate>
                <LoginPage />
              </SetupGate>
            }
          />
          <Route
            path="/"
            element={
              <SetupGate>
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              </SetupGate>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="job-cards" element={<JobCardsPage />} />
            <Route path="job-cards/new" element={<JobCardNewPage />} />
            <Route path="job-cards/:id" element={<JobCardDetailPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="billing/:id" element={<InvoiceDetailPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="stock-alerts" element={<StockAlertsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
