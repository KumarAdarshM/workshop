import { JOB_STATUS_COLORS, JOB_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/format';

export function JobStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${JOB_STATUS_COLORS[status] ?? 'bg-brand-light text-brand-mid'}`}>
      {JOB_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${PAYMENT_STATUS_COLORS[status] ?? 'bg-brand-light text-brand-mid'}`}>
      {status}
    </span>
  );
}
