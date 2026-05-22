import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ClipboardList,
  Truck,
  IndianRupee,
  AlertTriangle,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, CHART_COLORS } from '@/lib/format';

const PIE_COLORS = [
  CHART_COLORS.muted,
  CHART_COLORS.primary,
  CHART_COLORS.warning,
  CHART_COLORS.success,
  CHART_COLORS.secondary,
];

interface DashboardData {
  todayBookings: number;
  activeJobCards: number;
  pendingDeliveries: number;
  todayRevenue: number;
  monthRevenue: number;
  lowStock: { id: string; name: string; quantity: number; minStock: number }[];
  recentCustomers: { id: string; name: string; mobile: string; _count: { jobCards: number } }[];
  statusBreakdown: { status: string; _count: number }[];
  weeklyRevenue: { date: string; revenue: number }[];
}

const chartTooltipStyle = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: 10,
  fontSize: 12,
  color: CHART_COLORS.text,
};

export function DashboardPage() {
  const token = useAuthStore((s) => s.token)!;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardData>(IPC.DASHBOARD_STATS, token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <LoadingSpinner label="Loading dashboard…" />
      </div>
    );
  }

  const pieData = data?.statusBreakdown.map((s) => ({
    name: s.status.replace(/_/g, ' '),
    value: s._count,
  })) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden page-enter">
      {/* Header */}
      <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-brand-charcoal">Dashboard</h1>
          <p className="mt-1 text-sm text-brand-mid">Today&apos;s workshop at a glance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/job-cards/new" className="btn-primary">
            New job card
          </Link>
          <Link to="/customers" className="btn-secondary">
            Add customer
          </Link>
          <Link to="/billing" className="btn-secondary">
            Billing
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Bookings" value={data?.todayBookings ?? 0} icon={Calendar} accent="terracotta" />
        <StatCard title="Active Jobs" value={data?.activeJobCards ?? 0} icon={ClipboardList} accent="warning" />
        <StatCard title="Pending Delivery" value={data?.pendingDeliveries ?? 0} icon={Truck} accent="charcoal" />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data?.todayRevenue ?? 0)}
          subtitle={`Month ${formatCurrency(data?.monthRevenue ?? 0)}`}
          icon={IndianRupee}
          accent="success"
        />
      </div>

      {/* Charts — grow to fill middle */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card flex min-h-0 flex-col lg:col-span-2">
          <h3 className="mb-3 shrink-0 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
            <TrendingUp className="h-4 w-4 text-brand-terracotta" strokeWidth={1.75} />
            Weekly revenue
          </h3>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weeklyRevenue ?? []}>
                <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card flex min-h-0 flex-col">
          <h3 className="mb-3 shrink-0 text-sm font-semibold text-brand-charcoal">Job status</h3>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="45%" outerRadius="70%" paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 shrink-0 space-y-1.5">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-brand-mid">
                  <span className="h-2 w-2 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                  {p.name}
                </span>
                <span className="font-medium text-brand-charcoal">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom widgets — equal height, fill remaining space */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-warning">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
              Low stock
            </h3>
            <Link to="/stock-alerts" className="text-xs text-brand-terracotta hover:underline">
              Manage alerts
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {data?.lowStock.length ? (
              <div className="space-y-1.5">
                {data.lowStock.map((item) => (
                  <Link
                    key={item.id}
                    to={`/stock-alerts?focus=${item.id}`}
                    className="flex items-center justify-between rounded-[10px] bg-brand-light px-3 py-2 transition-colors hover:bg-brand-light-gray"
                  >
                    <span className="text-sm text-brand-charcoal">{item.name}</span>
                    <span className="badge bg-brand-error-bg text-brand-error">
                      {item.quantity} / {item.minStock}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-mid">All stock levels are healthy</p>
            )}
          </div>
        </div>

        <div className="card flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
              <Users className="h-4 w-4 text-brand-terracotta" strokeWidth={1.75} />
              Recent customers
            </h3>
            <Link to="/customers" className="text-xs text-brand-terracotta hover:underline">
              View all
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              {data?.recentCustomers.map((c) => (
                <Link
                  key={c.id}
                  to={`/customers?id=${c.id}`}
                  className="flex items-center justify-between rounded-[10px] bg-brand-light px-3 py-2 transition-colors hover:bg-brand-light/80"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">{c.name}</p>
                    <p className="text-xs text-brand-mid">{c.mobile}</p>
                  </div>
                  <span className="text-xs text-brand-mid">{c._count.jobCards} jobs</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
