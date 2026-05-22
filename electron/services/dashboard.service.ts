import type { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function getDashboardStats(prisma: PrismaClient) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [
    todayJobs,
    activeJobs,
    pendingDeliveries,
    todayRevenue,
    allInventory,
    recentCustomers,
    statusBreakdown,
    weeklyRevenue,
  ] = await Promise.all([
    prisma.jobCard.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.jobCard.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS'] } },
    }),
    prisma.jobCard.count({ where: { status: 'COMPLETED' } }),
    prisma.payment.aggregate({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.inventory.findMany({ orderBy: { quantity: 'asc' }, take: 50 }),
    prisma.customer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { jobCards: true } } },
    }),
    prisma.jobCard.groupBy({ by: ['status'], _count: true }),
    getWeeklyRevenue(prisma),
  ]);

  const lowStock = allInventory.filter((i) => i.quantity <= i.minStock).slice(0, 10);

  const monthRevenue = await prisma.invoice.aggregate({
    where: {
      createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      status: 'PAID',
    },
    _sum: { grandTotal: true },
  });

  return {
    todayBookings: todayJobs,
    activeJobCards: activeJobs,
    pendingDeliveries,
    todayRevenue: todayRevenue._sum.amount ?? 0,
    monthRevenue: monthRevenue._sum.grandTotal ?? 0,
    lowStock,
    recentCustomers,
    statusBreakdown,
    weeklyRevenue,
  };
}

async function getWeeklyRevenue(prisma: PrismaClient) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const start = startOfDay(day);
    const end = endOfDay(day);
    const sum = await prisma.payment.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    days.push({
      date: format(day, 'EEE'),
      revenue: sum._sum.amount ?? 0,
    });
  }
  return days;
}
