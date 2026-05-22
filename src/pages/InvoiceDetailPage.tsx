import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  FileText,
  Printer,
  CreditCard,
  ClipboardList,
  Car,
  Receipt,
  Wrench,
  Package,
} from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { PaymentStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/format';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
};

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  laborTotal: number;
  partsTotal: number;
  discount: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  paidAmount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    mobile: string;
    address?: string | null;
  };
  jobCard?: {
    id: string;
    jobNumber: string;
    status: string;
    vehicle: {
      vehicleNumber: string;
      brand?: string | null;
      model?: string | null;
    };
    services: { id: string; name: string; quantity: number; laborCharge: number }[];
    parts: { id: string; partName: string; quantity: number; unitPrice: number; total: number }[];
  } | null;
  payments: Payment[];
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [payment, setPayment] = useState({ amount: 0, method: 'CASH', reference: '' });

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    api<InvoiceDetail | null>(IPC.INVOICES_GET, token, id)
      .then((data) => {
        if (!data) setError('Invoice not found');
        else setInvoice(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const balance = invoice ? invoice.grandTotal - invoice.paidAmount : 0;

  const openPayment = () => {
    if (!invoice) return;
    setPayment({ amount: balance, method: 'CASH', reference: '' });
    setPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!id) return;
    await api(IPC.INVOICES_PAYMENT, token, id, payment);
    setPaymentModal(false);
    load();
    void useNotificationStore.getState().fetch();
  };

  const exportPdf = async () => {
    if (!id) return;
    const path = await api<string>(IPC.PDF_INVOICE, token, id);
    alert(`Invoice PDF saved: ${path}`);
  };

  const printReceipt = async () => {
    if (!invoice?.jobCard) {
      alert('Open linked job card to print thermal receipt');
      return;
    }
    await api(IPC.PRINT_THERMAL, token, invoice.jobCard.id);
  };

  if (loading) return <LoadingSpinner fullPage label="Loading invoice…" />;

  if (error || !invoice) {
    return (
      <div className="page-enter">
        <button onClick={() => navigate('/billing')} className="btn-secondary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to billing
        </button>
        <div className="card text-center py-12">
          <p className="text-brand-error">{error || 'Invoice not found'}</p>
          <Link to="/billing" className="btn-primary mt-4 inline-flex">Go to billing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-4">
        <PageHeader
          title={invoice.invoiceNumber}
          description={`Tax invoice · ${formatDate(invoice.createdAt)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate('/billing')} className="btn-secondary">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={exportPdf} className="btn-secondary">
                <FileText className="h-4 w-4" /> PDF
              </button>
              {invoice.jobCard && (
                <button onClick={printReceipt} className="btn-secondary">
                  <Printer className="h-4 w-4" /> Print
                </button>
              )}
              {invoice.status !== 'PAID' && balance > 0 && (
                <button onClick={openPayment} className="btn-primary">
                  <CreditCard className="h-4 w-4" /> Record payment
                </button>
              )}
            </div>
          }
        />

        {/* Summary bar */}
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PaymentStatusBadge status={invoice.status} />
            {balance > 0 && (
              <span className="text-sm text-brand-warning font-medium">
                Balance due: {formatCurrency(balance)}
              </span>
            )}
            {invoice.status === 'PAID' && (
              <span className="text-sm text-brand-success font-medium">Fully paid</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-mid uppercase tracking-wider">Grand total</p>
            <p className="text-2xl font-semibold text-brand-terracotta">{formatCurrency(invoice.grandTotal)}</p>
            <p className="text-sm text-brand-mid">Paid {formatCurrency(invoice.paidAmount)}</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-3">
        <div className="card lg:col-span-2 flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {/* Customer */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
              <User className="h-4 w-4 text-brand-terracotta" /> Bill to
            </h3>
            <div className="rounded-[10px] bg-brand-light p-4">
              <p className="font-medium text-brand-charcoal">{invoice.customer.name}</p>
              <p className="text-sm text-brand-mid">{invoice.customer.mobile}</p>
              {invoice.customer.address && (
                <p className="text-sm text-brand-mid mt-1">{invoice.customer.address}</p>
              )}
            </div>
          </section>

          {/* Linked job card */}
          {invoice.jobCard ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
                <ClipboardList className="h-4 w-4 text-brand-terracotta" /> Job card
              </h3>
              <Link
                to={`/job-cards/${invoice.jobCard.id}`}
                className="block rounded-[10px] border border-brand-mid/40 bg-brand-light p-4 hover:border-brand-terracotta/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono font-semibold text-brand-terracotta">{invoice.jobCard.jobNumber}</p>
                  <span className="text-xs text-brand-mid">View job card →</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-brand-mid">
                  <Car className="h-4 w-4" />
                  {invoice.jobCard.vehicle.vehicleNumber}
                  {(invoice.jobCard.vehicle.brand || invoice.jobCard.vehicle.model) && (
                    <span>· {invoice.jobCard.vehicle.brand} {invoice.jobCard.vehicle.model}</span>
                  )}
                </div>
              </Link>

              {invoice.jobCard.services.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-mid flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Services
                  </p>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.jobCard.services.map((s) => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>{s.quantity}</td>
                            <td className="text-right">{formatCurrency(s.laborCharge * s.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {invoice.jobCard.parts.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-mid flex items-center gap-1">
                    <Package className="h-3 w-3" /> Parts
                  </p>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Part</th>
                          <th>Qty</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.jobCard.parts.map((p) => (
                          <tr key={p.id}>
                            <td>{p.partName}</td>
                            <td>{p.quantity}</td>
                            <td className="text-right">{formatCurrency(p.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <p className="text-sm text-brand-mid">No job card linked to this invoice.</p>
          )}

          {invoice.notes && (
            <section>
              <p className="text-xs font-medium text-brand-mid uppercase mb-1">Notes</p>
              <p className="text-sm text-brand-charcoal rounded-[10px] bg-brand-light p-3">{invoice.notes}</p>
            </section>
          )}

          {/* Payment history */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
              <Receipt className="h-4 w-4 text-brand-terracotta" /> Payment history ({invoice.payments.length})
            </h3>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-brand-mid">No payments recorded yet</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="text-brand-mid">{formatDate(p.createdAt)}</td>
                        <td>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                        <td className="text-brand-mid">{p.reference || '—'}</td>
                        <td className="text-right font-medium text-brand-success">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          </div>
        </div>

        {/* Billing breakdown sidebar */}
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-brand-charcoal">Invoice breakdown</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-mid">Labor charges</dt>
                <dd>{formatCurrency(invoice.laborTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-mid">Parts</dt>
                <dd>{formatCurrency(invoice.partsTotal)}</dd>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-brand-success">
                  <dt>Discount</dt>
                  <dd>-{formatCurrency(invoice.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-brand-mid/30 pt-2">
                <dt className="text-brand-mid">Subtotal</dt>
                <dd>{formatCurrency(invoice.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-mid">GST ({invoice.gstPercent}%)</dt>
                <dd>{formatCurrency(invoice.gstAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-brand-mid/40 pt-2 text-base font-semibold">
                <dt>Grand total</dt>
                <dd className="text-brand-terracotta">{formatCurrency(invoice.grandTotal)}</dd>
              </div>
              <div className="flex justify-between text-brand-success">
                <dt>Amount paid</dt>
                <dd>{formatCurrency(invoice.paidAmount)}</dd>
              </div>
              {balance > 0 && (
                <div className="flex justify-between font-semibold text-brand-warning border-t border-brand-mid/30 pt-2">
                  <dt>Balance due</dt>
                  <dd>{formatCurrency(balance)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card text-sm text-brand-mid space-y-1">
            <p>Created: {formatDate(invoice.createdAt)}</p>
            <p>Updated: {formatDate(invoice.updatedAt)}</p>
          </div>

          {invoice.status !== 'PAID' && balance > 0 && (
            <button onClick={openPayment} className="btn-primary w-full">
              <CreditCard className="h-4 w-4" /> Pay {formatCurrency(balance)}
            </button>
          )}
        </div>
      </div>

      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Record Payment">
        <div className="space-y-4">
          <p className="text-sm text-brand-mid">
            Balance due: <span className="font-semibold text-brand-charcoal">{formatCurrency(balance)}</span>
          </p>
          <div>
            <label className="label">Amount</label>
            <input
              className="input"
              type="number"
              value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: +e.target.value })}
            />
          </div>
          <div>
            <label className="label">Method</label>
            <select
              className="input"
              value={payment.method}
              onChange={(e) => setPayment({ ...payment, method: e.target.value })}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input
              className="input"
              value={payment.reference}
              onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              placeholder="UPI ref / transaction id"
            />
          </div>
          <button onClick={submitPayment} className="btn-primary w-full">Record payment</button>
        </div>
      </Modal>
    </div>
  );
}
