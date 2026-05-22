import type { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export async function getDailySales(prisma: PrismaClient, date?: string) {
  const d = date ? new Date(date) : new Date();
  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: startOfDay(d), lte: endOfDay(d) } },
    include: { invoice: { include: { customer: { select: { name: true } } } } },
  });
  const total = payments.reduce((s, p) => s + p.amount, 0);
  return { date: format(d, 'yyyy-MM-dd'), payments, total };
}

export async function getMonthlyRevenue(prisma: PrismaClient, year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const start = startOfMonth(new Date(y, m, 1));
  const end = endOfMonth(start);

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { grandTotal: true, paidAmount: true, status: true, createdAt: true },
  });

  const paid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.grandTotal, 0);
  const pending = invoices.filter((i) => i.status !== 'PAID').reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0);

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(monthStart);
    const sum = await prisma.invoice.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd }, status: 'PAID' },
      _sum: { grandTotal: true },
    });
    months.push({
      month: format(monthStart, 'MMM yyyy'),
      revenue: sum._sum.grandTotal ?? 0,
    });
  }

  return { paid, pending, invoices: invoices.length, chart: months };
}

export async function getPendingPayments(prisma: PrismaClient) {
  return prisma.invoice.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL'] } },
    orderBy: { createdAt: 'desc' },
    include: { customer: { select: { name: true, mobile: true } } },
  });
}

export async function getInventoryReport(prisma: PrismaClient) {
  const items = await prisma.inventory.findMany({
    include: { supplier: true, stockHistory: { take: 5, orderBy: { createdAt: 'desc' } } },
  });
  const totalValue = items.reduce((s, i) => s + i.quantity * i.purchasePrice, 0);
  const lowStock = items.filter((i) => i.quantity <= i.minStock);
  return { items, totalValue, lowStockCount: lowStock.length };
}

export async function getTopCustomers(prisma: PrismaClient, limit = 10) {
  const customers = await prisma.customer.findMany({
    include: {
      invoices: { select: { grandTotal: true, status: true } },
      _count: { select: { jobCards: true } },
    },
  });
  return customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      jobCount: c._count.jobCards,
      totalSpent: c.invoices.reduce((s, i) => s + (i.status === 'PAID' ? i.grandTotal : 0), 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

export async function getTopServices(prisma: PrismaClient, limit = 10) {
  const services = await prisma.jobService.groupBy({
    by: ['name'],
    _count: true,
    _sum: { laborCharge: true },
    orderBy: { _count: { name: 'desc' } },
    take: limit,
  });
  return services.map((s) => ({
    name: s.name,
    count: s._count,
    revenue: s._sum.laborCharge ?? 0,
  }));
}
