import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { resetNotificationCache, useNotificationStore } from '@/stores/notificationStore';
import { useStockAlertStore } from '@/stores/stockAlertStore';
import { useAuthStore } from '@/stores/authStore';

export function AppLayout() {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';
  const isDetailView =
    /^\/billing\/[^/]+$/.test(pathname) || /^\/job-cards\/[^/]+$/.test(pathname);
  const isFixedHeightPage = isDashboard || isDetailView;
  const token = useAuthStore((s) => s.token);
  const startPolling = useNotificationStore((s) => s.startPolling);
  const fetchNotifications = useNotificationStore((s) => s.fetch);
  const fetchStockAlerts = useStockAlertStore((s) => s.fetch);

  useEffect(() => {
    if (!token) {
      resetNotificationCache();
      useNotificationStore.setState({ items: [], unreadCount: 0, isOpen: false, error: null });
      useStockAlertStore.setState({ count: 0, summary: { total: 0, outOfStock: 0, low: 0 } });
      return;
    }
    fetchStockAlerts();
    const stop = startPolling();
    const stockTimer = setInterval(fetchStockAlerts, 60_000);
    return () => {
      stop();
      clearInterval(stockTimer);
    };
  }, [token, startPolling, fetchStockAlerts]);

  // Refresh alerts when navigating (job/billing/inventory changes often happen on other routes)
  useEffect(() => {
    if (token) void fetchNotifications();
  }, [pathname, token, fetchNotifications]);

  return (
    <div className="flex h-screen overflow-hidden bg-brand-parchment">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className={`flex min-h-0 flex-1 flex-col overflow-x-hidden bg-brand-parchment p-5 md:p-6 ${
            isFixedHeightPage ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
