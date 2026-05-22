import type { PrismaClient } from '@prisma/client';

export async function listVehicles(prisma: PrismaClient, opts: { search?: string; page?: number; limit?: number } = {}) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = opts.search
    ? {
        OR: [
          { vehicleNumber: { contains: opts.search } },
          { brand: { contains: opts.search } },
          { model: { contains: opts.search } },
          { customer: { name: { contains: opts.search } } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: { customer: { select: { id: true, name: true, mobile: true } } },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function getVehiclesByCustomer(prisma: PrismaClient, customerId: string) {
  return prisma.vehicle.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: { jobCards: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
}

export async function getVehicle(prisma: PrismaClient, id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      customer: true,
      jobCards: {
        orderBy: { createdAt: 'desc' },
        include: { mechanic: { select: { name: true } }, services: true, parts: true },
      },
    },
  });
}

export async function createVehicle(
  prisma: PrismaClient,
  data: {
    customerId: string;
    vehicleNumber: string;
    brand?: string;
    model?: string;
    fuelType?: string;
    kmReading?: number;
    insuranceExpiry?: string;
    insuranceNotes?: string;
  }
) {
  return prisma.vehicle.create({
    data: {
      ...data,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
    },
  });
}

export async function updateVehicle(prisma: PrismaClient, id: string, data: Record<string, unknown>) {
  const { insuranceExpiry, ...rest } = data;
  return prisma.vehicle.update({
    where: { id },
    data: {
      ...rest,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry as string) : undefined,
    } as never,
  });
}

export async function deleteVehicle(prisma: PrismaClient, id: string) {
  return prisma.vehicle.delete({ where: { id } });
}
