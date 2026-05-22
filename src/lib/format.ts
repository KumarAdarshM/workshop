export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting for Parts',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-brand-light text-brand-mid border border-brand-mid/30',
  IN_PROGRESS: 'bg-brand-terracotta/10 text-brand-terracotta border border-brand-terracotta/30',
  WAITING_PARTS: 'bg-brand-warning-bg text-brand-warning border border-brand-warning/25',
  COMPLETED: 'bg-brand-success-bg text-brand-success border border-brand-success/30',
  DELIVERED: 'bg-brand-light text-brand-charcoal border border-brand-terracotta/40 font-medium',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-brand-warning-bg text-brand-warning',
  PARTIAL: 'bg-brand-terracotta/10 text-brand-terracotta',
  PAID: 'bg-brand-success-bg text-brand-success',
};

export const INVENTORY_CATEGORIES = [
  { value: 'ENGINE_PARTS', label: 'Engine Parts' },
  { value: 'OIL', label: 'Oil' },
  { value: 'TIRES', label: 'Tires' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'ACCESSORIES', label: 'Accessories' },
] as const;

export const CHART_COLORS = {
  primary: '#C15F3C',
  secondary: '#d97757',
  success: '#5a7a52',
  warning: '#b8860b',
  muted: '#b0aea5',
  grid: '#e8e6dc',
  tooltipBg: '#ffffff',
  tooltipBorder: '#b0aea5',
  text: '#141413',
};

export const BRAND = {
  charcoal: '#141413',
  parchment: '#faf9f5',
  terracotta: '#C15F3C',
  terracottaLight: '#d97757',
  mid: '#b0aea5',
  light: '#e8e6dc',
} as const;
