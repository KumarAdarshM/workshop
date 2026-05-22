import type { PrismaClient, PaymentMethod, PaymentStatus } from '@prisma/client';

export async function generateInvoiceNumber(prisma: PrismaClient) {
  const settings = await prisma.workshopSettings.findUnique({ where: { id: 'default' } });
  const prefix = settings?.invoicePrefix ?? 'INV';
  const count = await prisma.invoice.count();
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
}

export async function listInvoices(
  prisma: PrismaClient,
  opts: { page?: number; limit?: number; status?: PaymentStatus; search?: string } = {}
) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.search) {
    where.OR = [
      { invoiceNumber: { contains: opts.search } },
      { customer: { name: { contains: opts.search } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where: where as never,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, mobile: true } },
        jobCard: { select: { jobNumber: true } },
        _count: { select: { payments: true } },
      },
    }),
    prisma.invoice.count({ where: where as never }),
  ]);

  return { items, total, page, limit };
}

export async function getInvoice(prisma: PrismaClient, id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      jobCard: { include: { vehicle: true, services: true, parts: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function createInvoiceFromJob(prisma: PrismaClient, jobCardId: string) {
  const job = await prisma.jobCard.findUnique({
    where: { id: jobCardId },
    include: { services: true, parts: true, invoice: true },
  });
  if (!job) throw new Error('Job card not found');
  if (job.invoice) return job.invoice;

  const subtotal = job.laborTotal + job.partsTotal - job.discount;
  const gstAmount = (subtotal * job.gstPercent) / 100;
  const grandTotal = subtotal + gstAmount;
  const invoiceNumber = await generateInvoiceNumber(prisma);

  return prisma.invoice.create({
    data: {
      invoiceNumber,
      jobCardId: job.id,
      customerId: job.customerId,
      subtotal,
      laborTotal: job.laborTotal,
      partsTotal: job.partsTotal,
      discount: job.discount,
      gstPercent: job.gstPercent,
      gstAmount,
      grandTotal,
      status: 'PENDING',
    },
  });
}

export async function addPayment(
  prisma: PrismaClient,
  invoiceId: string,
  data: { amount: number; method: PaymentMethod; reference?: string; notes?: string }
) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error('Invoice not found');

  await prisma.payment.create({
    data: { invoiceId, ...data },
  });

  const paid = invoice.paidAmount + data.amount;
  let status: PaymentStatus = 'PARTIAL';
  if (paid >= invoice.grandTotal) status = 'PAID';
  else if (paid <= 0) status = 'PENDING';

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: paid, status },
    include: { payments: true, customer: true },
  });
}
