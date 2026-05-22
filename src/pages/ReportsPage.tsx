import { useEffect, useState } from 'react';
import { BarChart3, Download, Users, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, CHART_COLORS } from '@/lib/format';

const chartTooltipStyle = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: 10,
  fontSize: 12,
};

export function ReportsPage() {
  const token = useAuthStore((s) => s.token)!;
  const [monthly, setMonthly] = useState<{ paid: number; pending: number; chart: { month: string; revenue: number }[] } | null>(null);
  const [top, setTop] = useState<{ customers: { name: string; totalSpent: number; jobCount: number }[]; services: { name: string; count: number }[] } | null>(null);
  const [pending, setPending] = useState<{ invoiceNumber: string; grandTotal: number; paidAmount: number; customer: { name: string } }[]>([]);

  useEffect(() => {
    api(IPC.REPORTS_MONTHLY, token).then(setMonthly);
    api(IPC.REPORTS_TOP, token).then(setTop);
    api(IPC.REPORTS_PENDING, token).then(setPending);
  }, []);

  const exportReport = async () => {
    const lines = [
      `Monthly Paid: ${formatCurrency(monthly?.paid ?? 0)}`,
      `Pending: ${formatCurrency(monthly?.pending ?? 0)}`,
      ...((top?.customers ?? []).map((c) => `${c.name}: ${formatCurrency(c.totalSpent)}`)),
    ];
    const path = await api<string>(IPC.PDF_REPORT_LINES, token, 'Workshop Report', lines);
    alert(`Report saved: ${path}`);
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Sales, revenue & performance insights"
        actions={
          <button onClick={exportReport} className="btn-secondary">
            <Download className="h-4 w-4" /> Export PDF
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="stat-card">
          <p className="text-xs text-brand-mid uppercase">Monthly Revenue (Paid)</p>
          <p className="text-3xl font-bold text-brand-success">{formatCurrency(monthly?.paid ?? 0)}</p>
        </div>
        <div className="stat-card border-brand-warning/25">
          <p className="text-xs text-brand-mid uppercase">Pending Payments</p>
          <p className="text-3xl font-bold text-brand-warning">{formatCurrency(monthly?.pending ?? 0)}</p>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="mb-4 font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 6-Month Revenue</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly?.chart ?? []}>
            <XAxis dataKey="month" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Top Customers</h3>
          <div className="space-y-2">
            {top?.customers.map((c, i) => (
              <div key={i} className="flex justify-between rounded-lg bg-brand-light px-3 py-2">
                <span>{c.name} <span className="text-xs text-brand-mid">({c.jobCount} jobs)</span></span>
                <span className="font-medium">{formatCurrency(c.totalSpent)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Top Services</h3>
          <div className="space-y-2">
            {top?.services.map((s, i) => (
              <div key={i} className="flex justify-between rounded-lg bg-brand-light px-3 py-2">
                <span>{s.name}</span>
                <span className="text-brand-mid">{s.count} times</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card mt-6">
          <h3 className="mb-4 font-semibold">Pending Invoices</h3>
          <div className="space-y-2">
            {pending.slice(0, 10).map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{p.invoiceNumber} — {p.customer.name}</span>
                <span className="text-brand-warning">{formatCurrency(p.grandTotal - p.paidAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
