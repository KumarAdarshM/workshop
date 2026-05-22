import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  Receipt,
  Package,
  UserCog,
  BarChart3,
  Settings,
  Wrench,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useStockAlertStore } from '@/stores/stockAlertStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/job-cards', icon: ClipboardList, label: 'Job Cards' },
  { to: '/billing', icon: Receipt, label: 'Billing' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/stock-alerts', icon: AlertTriangle, label: 'Stock Alerts', badgeKey: 'stock' as const },
  { to: '/staff', icon: UserCog, label: 'Staff' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const stockAlertCount = useStockAlertStore((s) => s.count);
  const fetchStockAlerts = useStockAlertStore((s) => s.fetch);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) fetchStockAlerts();
  }, [token, fetchStockAlerts]);

  return (
    <aside
      className={`panel-dark flex h-full flex-col border-r border-brand-charcoal shadow-sidebar transition-all duration-200 ${
        sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      <div className="flex h-14 items-center gap-3 border-b border-brand-dark-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-terracotta/20 ring-1 ring-brand-terracotta/40">
          <Wrench className="h-4 w-4 text-brand-terracotta-light" strokeWidth={1.75} />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-parchment">Workshop Pro</p>
            <p className="truncate text-[11px] text-brand-mid">Garage management</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map(({ to, icon: Icon, label, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-terracotta/20 text-brand-terracotta-light border border-brand-terracotta/35'
                    : 'text-brand-mid hover:bg-brand-dark-hover hover:text-brand-parchment border border-transparent'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {!sidebarCollapsed && <span className="flex-1">{label}</span>}
              {badgeKey === 'stock' && stockAlertCount > 0 && (
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-warning px-1.5 text-[10px] font-bold text-brand-charcoal ${
                    sidebarCollapsed ? 'absolute -right-0.5 -top-0.5' : ''
                  }`}
                >
                  {stockAlertCount > 99 ? '99+' : stockAlertCount}
                </span>
              )}
            </NavLink>
          ))}
      </nav>

      <button
        onClick={toggleSidebar}
        className="m-2 flex items-center justify-center gap-2 rounded-[10px] border border-brand-dark-border py-2 text-brand-mid hover:bg-brand-dark-hover hover:text-brand-parchment transition-colors"
      >
        <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        {!sidebarCollapsed && <span className="text-[11px]">Collapse</span>}
      </button>
    </aside>
  );
}
