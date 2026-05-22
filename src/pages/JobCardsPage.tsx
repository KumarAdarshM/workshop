import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Printer, Receipt, Eye, ClipboardList } from 'lucide-react';
import { IPC } from '../../electron/ipc/channels';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { JobStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, JOB_STATUS_LABELS } from '@/lib/format';

interface JobCard {
  id: string;
  jobNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  customer: { name: string; mobile: string };
  vehicle: { vehicleNumber: string; brand?: string; model?: string };
  mechanic?: { name: string };
}

export function JobCardsPage() {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    api<{ items: JobCard[] }>(IPC.JOBCARDS_LIST, token, {
      search,
      status: statusFilter || undefined,
      limit: 50,
    }).then((r) => setJobs(r.items));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await api(IPC.JOBCARDS_STATUS, token, id, status);
    load();
    void useNotificationStore.getState().fetch();
  };

  const exportPdf = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const path = await api<string>(IPC.PDF_JOB_CARD, token, id);
    alert(`PDF saved: ${path}`);
  };

  const printThermal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api(IPC.PRINT_THERMAL, token, id);
  };

  const createInvoice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api(IPC.INVOICES_CREATE, token, id);
    alert('Invoice created. View in Billing.');
  };

  return (
    <div>
      <PageHeader
        title="Job Cards"
        description="Digital job cards — tap a row or View to see full details"
        actions={
          <Link to="/job-cards/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New Job Card
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-mid" />
          <input className="input pl-10" placeholder="Search job, customer, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        {jobs.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No job cards" description="Create a job card to get started" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Job #</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Mechanic</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr
                  key={j.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/job-cards/${j.id}`)}
                >
                  <td className="font-mono font-medium text-brand-terracotta hover:underline">{j.jobNumber}</td>
                  <td>
                    <p>{j.customer.name}</p>
                    <p className="text-xs text-brand-mid">{j.customer.mobile}</p>
                  </td>
                  <td>{j.vehicle.vehicleNumber}</td>
                  <td>{j.mechanic?.name ?? '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <JobStatusBadge status={j.status} />
                  </td>
                  <td className="font-medium">{formatCurrency(j.grandTotal)}</td>
                  <td className="text-brand-mid">{formatDate(j.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/job-cards/${j.id}`)}
                        className="btn-ghost p-2"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {(j.status === 'COMPLETED' || j.status === 'DELIVERED') && (
                        <button onClick={(e) => createInvoice(j.id, e)} className="btn-ghost p-2" title="Invoice">
                          <Receipt className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={(e) => exportPdf(j.id, e)} className="btn-ghost p-2" title="PDF">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => printThermal(j.id, e)} className="btn-ghost p-2" title="Print">
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
