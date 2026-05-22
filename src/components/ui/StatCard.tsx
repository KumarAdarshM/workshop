import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: 'terracotta' | 'success' | 'warning' | 'charcoal';
}

const accents = {
  terracotta: {
    card: 'border-brand-terracotta/25',
    icon: 'text-brand-terracotta bg-brand-terracotta/12',
  },
  success: {
    card: 'border-brand-success/25',
    icon: 'text-brand-success bg-brand-success-bg',
  },
  warning: {
    card: 'border-brand-warning/25',
    icon: 'text-brand-warning bg-brand-warning-bg',
  },
  charcoal: {
    card: 'border-brand-charcoal/15',
    icon: 'text-brand-charcoal bg-brand-light',
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, accent = 'terracotta' }: StatCardProps) {
  const style = accents[accent];
  return (
    <div className={`stat-card ${style.card}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-mid">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-brand-charcoal">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-brand-mid">{subtitle}</p>}
          {trend && (
            <p className={`mt-1 text-xs ${trend.positive ? 'text-brand-success' : 'text-brand-mid'}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={`rounded-[10px] p-3 ${style.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
