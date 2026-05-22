import type { PrismaClient, JobStatus } from '@prisma/client';

function calcTotals(services: { laborCharge: number; quantity: number }[], parts: { total: number }[], discount: number, gstPercent: number) {
  const laborTotal = services.reduce((s, x) => s + x.laborCharge * x.quantity, 0);
  const partsTotal = parts.reduce((s, x) => s + x.total, 0);
  const subtotal = laborTotal + partsTotal - discount;
  const grandTotal = subtotal + (subtotal * gstPercent) / 100;
  return { laborTotal, partsTotal, grandTotal };
}

export async function generateJobNumber(prisma: PrismaClient) {
  const settings = await prisma.workshopSettings.findUnique({ where: { id: 'default' } });
  const prefix = settings?.jobCardPrefix ?? 'JC';
  const count = await prisma.jobCard.count();
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
}

export async function listJobCards(
  prisma: PrismaClient,
  opts: { page?: number; limit?: number; status?: JobStatus; search?: string } = {}
) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.search) {
    where.OR = [
      { jobNumber: { contains: opts.search } },
      { customer: { name: { contains: opts.search } } },
      { vehicle: { vehicleNumber: { contains: opts.search } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.jobCard.findMany({
      where: where as never,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        vehicle: { select: { vehicleNumber: true, brand: true, model: true } },
        mechanic: { select: { id: true, name: true } },
        _count: { select: { services: true, parts: true } },
      },
    }),
    prisma.jobCard.count({ where: where as never }),
  ]);

  return { items, total, page, limit };
}

export async function getJobCard(prisma: PrismaClient, id: string) {
  return prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      mechanic: { select: { id: true, name: true, role: true } },
      services: true,
      parts: { include: { inventory: true } },
      images: true,
      invoice: true,
    },
  });
}

export async function createJobCard(prisma: PrismaClient, data: {
  customerId: string;
  vehicleId: string;
  mechanicId?: string;
  complaint?: string;
  notes?: string;
  estimatedCompletion?: string;
  gstPercent?: number;
  services?: { name: string; description?: string; laborCharge: number; quantity?: number }[];
  parts?: { inventoryId?: string; partName: string; quantity: number; unitPrice: number }[];
}) {
  const jobNumber = await generateJobNumber(prisma);
  const services = data.services ?? [];
  const parts = (data.parts ?? []).map((p) => ({
    ...p,
    total: p.quantity * p.unitPrice,
  }));
  const discount = 0;
  const gstPercent = data.gstPercent ?? 18;
  const { laborTotal, partsTotal, grandTotal } = calcTotals(services, parts, discount, gstPercent);

  const job = await prisma.jobCard.create({
    data: {
      jobNumber,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      mechanicId: data.mechanicId,
      complaint: data.complaint,
      notes: data.notes,
      estimatedCompletion: data.estimatedCompletion ? new Date(data.estimatedCompletion) : undefined,
      laborTotal,
      partsTotal,
      discount,
      gstPercent,
      grandTotal,
      services: { create: services },
      parts: { create: parts },
    },
    include: { services: true, parts: true, customer: true, vehicle: true },
  });

  for (const part of parts) {
    if (part.inventoryId) {
      await prisma.inventory.update({
        where: { id: part.inventoryId },
        data: { quantity: { decrement: part.quantity } },
      });
      await prisma.stockHistory.create({
        data: {
          inventoryId: part.inventoryId,
          changeQty: -part.quantity,
          reason: 'Job card',
          reference: job.jobNumber,
        },
      });
    }
  }

  return job;
}

export async function updateJobCard(prisma: PrismaClient, id: string, data: Record<string, unknown>) {
  const existing = await getJobCard(prisma, id);
  if (!existing) throw new Error('Job card not found');

  const { services, parts, estimatedCompletion, status, deliveredAt, ...rest } = data;

  if (Array.isArray(services)) {
    await prisma.jobService.deleteMany({ where: { jobCardId: id } });
    await prisma.jobService.createMany({
      data: (services as { name: string; description?: string; laborCharge: number; quantity?: number }[]).map((s) => ({
        jobCardId: id,
        ...s,
      })),
    });
  }

  if (Array.isArray(parts)) {
    await prisma.jobPart.deleteMany({ where: { jobCardId: id } });
    await prisma.jobPart.createMany({
      data: (parts as { partName: string; quantity: number; unitPrice: number; inventoryId?: string }[]).map((p) => ({
        jobCardId: id,
        partName: p.partName,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        total: p.quantity * p.unitPrice,
        inventoryId: p.inventoryId,
      })),
    });
  }

  const updated = await getJobCard(prisma, id);
  const { laborTotal, partsTotal, grandTotal } = calcTotals(
    updated!.services,
    updated!.parts,
    (rest.discount as number) ?? existing.discount,
    (rest.gstPercent as number) ?? existing.gstPercent
  );

  return prisma.jobCard.update({
    where: { id },
    data: {
      ...rest,
      laborTotal,
      partsTotal,
      grandTotal,
      estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion as string) : undefined,
      deliveredAt: status === 'DELIVERED' ? new Date() : deliveredAt ? new Date(deliveredAt as string) : undefined,
    } as never,
    include: { services: true, parts: true, customer: true, vehicle: true, mechanic: true },
  });
}

export async function updateJobStatus(prisma: PrismaClient, id: string, status: JobStatus) {
  return prisma.jobCard.update({
    where: { id },
    data: {
      status,
      deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
    },
  });
}

export async function addJobImage(prisma: PrismaClient, jobCardId: string, filePath: string, caption?: string) {
  return prisma.jobImage.create({ data: { jobCardId, filePath, caption } });
}
