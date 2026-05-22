import type { PrismaClient } from '@prisma/client';

export async function listCustomers(
  prisma: PrismaClient,
  opts: { page?: number; limit?: number; search?: string } = {}
) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = opts.search
    ? {
        OR: [
          { name: { contains: opts.search } },
          { mobile: { contains: opts.search } },
          { address: { contains: opts.search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { vehicles: true, jobCards: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getCustomer(prisma: PrismaClient, id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: true,
      jobCards: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { vehicle: true, mechanic: { select: { name: true } } },
      },
    },
  });
}

export async function createCustomer(
  prisma: PrismaClient,
  data: { name: string; mobile: string; address?: string; notes?: string }
) {
  return prisma.customer.create({ data });
}

export async function updateCustomer(
  prisma: PrismaClient,
  id: string,
  data: Partial<{ name: string; mobile: string; address?: string; notes?: string }>
) {
  return prisma.customer.update({ where: { id }, data });
}

export async function deleteCustomer(prisma: PrismaClient, id: string) {
  return prisma.customer.delete({ where: { id } });
}
