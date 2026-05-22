import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Car,
  Wrench,
  FileText,
  Printer,
  Receipt,
  Calendar,
  Gauge,
  MessageSquare,
  Package,
  Image as ImageIcon,
} from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { JobStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate, JOB_STATUS_LABELS } from '@/lib/format';

interface JobService {
  id: string;
  name: string;
  description?: string | null;
  laborCharge: number;
  quantity: number;
}

interface JobPart {
  id: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  inventory?: { sku: string; name: string } | null;
}

interface JobImage {
  id: string;
  filePath: string;
  caption?: string | null;
}

interface JobCardDetail {
  id: string;
  jobNumber: string;
  status: string;
  complaint?: string | null;
  notes?: string | null;
  laborTotal: number;
  partsTotal: number;
  discount: number;
  gstPercent: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  estimatedCompletion?: string | null;
  deliveredAt?: string | null;
  customer: {
    id: string;
    name: string;
    mobile: string;
    address?: string | null;
    notes?: string | null;
  };
  vehicle: {
    id: string;
    vehicleNumber: string;
    brand?: string | null;
    model?: string | null;
    fuelType?: string | null;
    kmReading?: number | null;
  };
  mechanic?: { id: string; name: string; role: string } | null;
  services: JobService[];
  parts: JobPart[];
  images: JobImage[];
  invoice?: { id: string; invoiceNumber: string; status: string } | null;
}

export function JobCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();
  const [job, setJob] = useState<JobCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    api<JobCardDetail | null>(IPC.JOBCARDS_GET, token, id)
      .then((data) => {
        if (!data) setError('Job card not found');
        else setJob(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    await api(IPC.JOBCARDS_STATUS, token, id, status);
    load();
    void useNotificationStore.getState().fetch();
  };

  const exportPdf = async () => {
    if (!id) return;
    const path = await api<string>(IPC.PDF_JOB_CARD, token, id);
    alert(`PDF saved: ${path}`);
  };

  const printThermal = async () => {
    if (!id) return;
    await api(IPC.PRINT_THERMAL, token, id);
  };

  const createInvoice = async () => {
    if (!id) return;
    const inv = await api<{ id: string }>(IPC.INVOICES_CREATE, token, id);
    void useNotificationStore.getState().fetch();
    navigate(`/billing/${inv.id}`);
  };

  if (loading) return <LoadingSpinner fullPage label="Loading job card…" />;

  if (error || !job) {
    return (
      <div className="page-enter">
        <button onClick={() => navigate('/job-cards')} className="btn-secondary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to job cards
        </button>
        <div className="card text-center py-12">
          <p className="text-brand-error">{error || 'Job card not found'}</p>
          <Link to="/job-cards" className="btn-primary mt-4 inline-flex">Go to job cards</Link>
        </div>
      </div>
    );
  }

  const subtotal = job.laborTotal + job.partsTotal - job.discount;
  const gstAmount = (subtotal * job.gstPercent) / 100;

  return (
    <div className="page-enter flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-4">
        <PageHeader
          title={job.jobNumber}
          description={`Created ${formatDate(job.createdAt)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate('/job-cards')} className="btn-secondary">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={exportPdf} className="btn-secondary" title="Export PDF">
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button onClick={printThermal} className="btn-secondary" title="Print">
                <Printer className="h-4 w-4" /> Print
              </button>
              {!job.invoice && (job.status === 'COMPLETED' || job.status === 'DELIVERED') && (
                <button onClick={createInvoice} className="btn-primary">
                  <Receipt className="h-4 w-4" /> Create invoice
                </button>
              )}
              {job.invoice && (
                <Link to={`/billing/${job.invoice.id}`} className="btn-secondary">
                  <Receipt className="h-4 w-4" /> {job.invoice.invoiceNumber}
                </Link>
              )}
            </div>
          }
        />

        {/* Status bar */}
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <JobStatusBadge status={job.status} />
            <select
              className="input w-auto min-w-[160px] py-2 text-sm"
              value={job.status}
              onChange={(e) => updateStatus(e.target.value)}
            >
              {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <p className="text-2xl font-semibold text-brand-charcoal">{formatCurrency(job.grandTotal)}</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-3">
        {/* Customer & vehicle */}
        <div className="card lg:col-span-2 flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
              <User className="h-4 w-4 text-brand-terracotta" /> Customer
            </h3>
            <div className="rounded-[10px] bg-brand-light p-4 space-y-1">
              <p className="font-medium text-brand-charcoal">{job.customer.name}</p>
              <p className="text-sm text-brand-mid">{job.customer.mobile}</p>
              {job.customer.address && <p className="text-sm text-brand-mid">{job.customer.address}</p>}
              {job.customer.notes && (
                <p className="text-sm text-brand-mid border-t border-brand-mid/30 pt-2 mt-2">{job.customer.notes}</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
              <Car className="h-4 w-4 text-brand-terracotta" /> Vehicle
            </h3>
            <div className="rounded-[10px] bg-brand-light p-4 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-brand-mid uppercase tracking-wider">Number</p>
                <p className="font-mono font-semibold text-brand-terracotta">{job.vehicle.vehicleNumber}</p>
              </div>
              <div>
                <p className="text-xs text-brand-mid uppercase tracking-wider">Make / Model</p>
                <p className="text-brand-charcoal">{job.vehicle.brand} {job.vehicle.model}</p>
              </div>
              {job.vehicle.fuelType && (
                <div>
                  <p className="text-xs text-brand-mid uppercase tracking-wider">Fuel</p>
                  <p className="text-brand-charcoal">{job.vehicle.fuelType}</p>
                </div>
              )}
              {job.vehicle.kmReading != null && (
                <div>
                  <p className="text-xs text-brand-mid uppercase tracking-wider flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> KM reading
                  </p>
                  <p className="text-brand-charcoal">{job.vehicle.kmReading.toLocaleString()} km</p>
                </div>
              )}
            </div>
          </section>

          {(job.complaint || job.notes) && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
                <MessageSquare className="h-4 w-4 text-brand-terracotta" /> Notes
              </h3>
              <div className="rounded-[10px] bg-brand-light p-4 space-y-3">
                {job.complaint && (
                  <div>
                    <p className="text-xs font-medium text-brand-mid uppercase">Complaint</p>
                    <p className="text-sm text-brand-charcoal mt-1">{job.complaint}</p>
                  </div>
                )}
                {job.notes && (
                  <div>
                    <p className="text-xs font-medium text-brand-mid uppercase">Workshop notes</p>
                    <p className="text-sm text-brand-charcoal mt-1">{job.notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Services */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
              <Wrench className="h-4 w-4 text-brand-terracotta" /> Services ({job.services.length})
            </h3>
            {job.services.length === 0 ? (
              <p className="text-sm text-brand-mid">No services added</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Qty</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.services.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <p className="font-medium">{s.name}</p>
                          {s.description && <p className="text-xs text-brand-mid">{s.description}</p>}
                        </td>
                        <td>{s.quantity}</td>
                        <td className="text-right">{formatCurrency(s.laborCharge)}</td>
                        <td className="text-right font-medium">{formatCurrency(s.laborCharge * s.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Parts */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
              <Package className="h-4 w-4 text-brand-terracotta" /> Spare parts ({job.parts.length})
            </h3>
            {job.parts.length === 0 ? (
              <p className="text-sm text-brand-mid">No parts added</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Qty</th>
                      <th className="text-right">Unit price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.parts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <p className="font-medium">{p.partName}</p>
                          {p.inventory && (
                            <p className="text-xs text-brand-mid font-mono">{p.inventory.sku}</p>
                          )}
                        </td>
                        <td>{p.quantity}</td>
                        <td className="text-right">{formatCurrency(p.unitPrice)}</td>
                        <td className="text-right font-medium">{formatCurrency(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {job.images.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
                <ImageIcon className="h-4 w-4 text-brand-terracotta" /> Vehicle images
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.images.map((img) => (
                  <div key={img.id} className="rounded-[10px] border border-brand-mid/40 bg-brand-light px-3 py-2 text-xs text-brand-mid">
                    {img.caption || img.filePath.split('/').pop()}
                  </div>
                ))}
              </div>
            </section>
          )}
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-brand-charcoal">Assignment</h3>
            <div className="flex items-center gap-3 rounded-[10px] bg-brand-light p-3">
              <div className="rounded-[8px] bg-brand-terracotta/12 p-2">
                <Wrench className="h-4 w-4 text-brand-terracotta" />
              </div>
              <div>
                <p className="text-xs text-brand-mid">Mechanic</p>
                <p className="font-medium text-brand-charcoal">{job.mechanic?.name ?? 'Unassigned'}</p>
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-brand-charcoal flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-terracotta" /> Timeline
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-mid">Created</dt>
                <dd className="text-brand-charcoal">{formatDate(job.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-mid">Last updated</dt>
                <dd className="text-brand-charcoal">{formatDate(job.updatedAt)}</dd>
              </div>
              {job.estimatedCompletion && (
                <div className="flex justify-between">
                  <dt className="text-brand-mid">Est. completion</dt>
                  <dd className="text-brand-charcoal">
                    {new Date(job.estimatedCompletion).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              )}
              {job.deliveredAt && (
                <div className="flex justify-between">
                  <dt className="text-brand-mid">Delivered</dt>
                  <dd className="text-brand-success">{formatDate(job.deliveredAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-brand-charcoal">Billing summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-mid">Labor</dt>
                <dd>{formatCurrency(job.laborTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-mid">Parts</dt>
                <dd>{formatCurrency(job.partsTotal)}</dd>
              </div>
              {job.discount > 0 && (
                <div className="flex justify-between text-brand-success">
                  <dt>Discount</dt>
                  <dd>-{formatCurrency(job.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-brand-mid/30 pt-2">
                <dt className="text-brand-mid">Subtotal</dt>
                <dd>{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-mid">GST ({job.gstPercent}%)</dt>
                <dd>{formatCurrency(gstAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-brand-mid/40 pt-2 text-base font-semibold">
                <dt className="text-brand-charcoal">Grand total</dt>
                <dd className="text-brand-terracotta">{formatCurrency(job.grandTotal)}</dd>
              </div>
            </dl>
          </div>

          {job.invoice && (
            <div className="card border-brand-success/30 bg-brand-success-bg/50">
              <p className="text-xs text-brand-mid uppercase">Linked invoice</p>
              <p className="font-mono font-semibold text-brand-charcoal mt-1">{job.invoice.invoiceNumber}</p>
              <p className="text-xs text-brand-mid mt-1">Status: {job.invoice.status}</p>
              <Link to={`/billing/${job.invoice.id}`} className="btn-secondary mt-3 w-full text-center text-sm">
                View invoice details
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
