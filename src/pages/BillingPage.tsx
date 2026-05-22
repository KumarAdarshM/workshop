import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, FileText, CreditCard, Eye, Search } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { PaymentStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate } from '@/lib/format';

interface Invoice {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  paidAmount: number;
  status: string;
  createdAt: string;
  customer: { name: string; mobile: string };
  jobCard?: { jobNumber: string };
}

export function BillingPage() {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState({ amount: 0, method: 'CASH', reference: '' });

  const load = () => {
    api<{ items: Invoice[] }>(IPC.INVOICES_LIST, token, {
      limit: 50,
      search: search || undefined,
      status: statusFilter || undefined,
    }).then((r) => setInvoices(r.items));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const openPayment = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentModal(inv);
    setPayment({ amount: inv.grandTotal - inv.paidAmount, method: 'CASH', reference: '' });
  };

  const submitPayment = async () => {
    if (!paymentModal) return;
    await api(IPC.INVOICES_PAYMENT, token, paymentModal.id, payment);
    setPaymentModal(null);
    load();
    void useNotificationStore.getState().fetch();
  };

  const exportPdf = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const path = await api<string>(IPC.PDF_INVOICE, token, id);
    alert(`Invoice PDF: ${path}`);
  };

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        description="GST invoices & payments — tap a row or View for full details"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-mid" />
          <input
            className="input pl-10"
            placeholder="Search invoice #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All status</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      <div className="table-container">
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices" description="Create an invoice from a completed job card" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Job</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/billing/${inv.id}`)}
                >
                  <td className="font-mono font-medium text-brand-terracotta hover:underline">
                    {inv.invoiceNumber}
                  </td>
                  <td>
                    <p>{inv.customer.name}</p>
                    <p className="text-xs text-brand-mid">{inv.customer.mobile}</p>
                  </td>
                  <td>{inv.jobCard?.jobNumber ?? '—'}</td>
                  <td className="font-medium">{formatCurrency(inv.grandTotal)}</td>
                  <td>{formatCurrency(inv.paidAmount)}</td>
                  <td className={inv.grandTotal - inv.paidAmount > 0 ? 'text-brand-warning font-medium' : 'text-brand-success'}>
                    {formatCurrency(inv.grandTotal - inv.paidAmount)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <PaymentStatusBadge status={inv.status} />
                  </td>
                  <td className="text-brand-mid">{formatDate(inv.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/billing/${inv.id}`)}
                        className="btn-ghost p-2"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {inv.status !== 'PAID' && (
                        <button onClick={(e) => openPayment(inv, e)} className="btn-ghost p-2" title="Record payment">
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={(e) => exportPdf(inv.id, e)} className="btn-ghost p-2" title="PDF">
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment">
        {paymentModal && (
          <div className="space-y-4">
            <p className="text-sm text-brand-mid">
              Invoice <span className="font-mono text-brand-terracotta">{paymentModal.invoiceNumber}</span>
              <br />
              Balance due: {formatCurrency(paymentModal.grandTotal - paymentModal.paidAmount)}
            </p>
            <div>
              <label className="label">Amount</label>
              <input className="input" type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: +e.target.value })} />
            </div>
            <div>
              <label className="label">Method</label>
              <select className="input" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div>
              <label className="label">Reference</label>
              <input className="input" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} placeholder="UPI ref / txn id" />
            </div>
            <button onClick={submitPayment} className="btn-primary w-full">Record payment</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
