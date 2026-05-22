import type { PrismaClient } from '@prisma/client';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface WorkshopNotification {
  id: string;
  type: string;
  priority: NotificationPriority;
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

export async function buildNotifications(prisma: PrismaClient): Promise<WorkshopNotification[]> {
  const now = new Date();
  const items: WorkshopNotification[] = [];

  const lowStock = await prisma.inventory.findMany({ orderBy: { quantity: 'asc' } });
  for (const inv of lowStock.filter((i) => i.quantity <= i.minStock)) {
    items.push({
      id: `low-stock-${inv.id}`,
      type: 'LOW_STOCK',
      priority: inv.quantity === 0 ? 'high' : 'medium',
      title: inv.quantity === 0 ? 'Out of stock' : 'Low stock alert',
      message: `${inv.name} (${inv.sku}): ${inv.quantity} left, min ${inv.minStock}`,
      link: '/stock-alerts',
      createdAt: inv.updatedAt.toISOString(),
    });
  }

  const pendingInvoices = await prisma.invoice.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL'] } },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  for (const inv of pendingInvoices) {
    const balance = inv.grandTotal - inv.paidAmount;
    items.push({
      id: `invoice-pending-${inv.id}`,
      type: 'PENDING_PAYMENT',
      priority: balance > 5000 ? 'high' : 'medium',
      title: 'Pending payment',
      message: `${inv.invoiceNumber} — ${inv.customer.name}: ₹${balance.toFixed(0)} due`,
      link: `/billing/${inv.id}`,
      createdAt: inv.updatedAt.toISOString(),
    });
  }

  const readyJobs = await prisma.jobCard.findMany({
    where: { status: 'COMPLETED' },
    include: { customer: { select: { name: true } }, vehicle: { select: { vehicleNumber: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 15,
  });
  for (const job of readyJobs) {
    items.push({
      id: `job-ready-${job.id}`,
      type: 'JOB_READY',
      priority: 'medium',
      title: 'Ready for delivery',
      message: `${job.jobNumber} — ${job.vehicle.vehicleNumber} (${job.customer.name})`,
      link: `/job-cards/${job.id}`,
      createdAt: job.updatedAt.toISOString(),
    });
  }

  const waitingParts = await prisma.jobCard.findMany({
    where: { status: 'WAITING_PARTS' },
    include: { customer: { select: { name: true } }, vehicle: { select: { vehicleNumber: true } } },
    take: 15,
  });
  for (const job of waitingParts) {
    items.push({
      id: `job-parts-${job.id}`,
      type: 'WAITING_PARTS',
      priority: 'medium',
      title: 'Waiting for parts',
      message: `${job.jobNumber} — ${job.vehicle.vehicleNumber}`,
      link: `/job-cards/${job.id}`,
      createdAt: job.updatedAt.toISOString(),
    });
  }

  const overdueJobs = await prisma.jobCard.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS'] },
      estimatedCompletion: { lt: now },
    },
    include: { customer: { select: { name: true } }, vehicle: { select: { vehicleNumber: true } } },
    take: 10,
  });
  for (const job of overdueJobs) {
    items.push({
      id: `job-overdue-${job.id}`,
      type: 'JOB_OVERDUE',
      priority: 'high',
      title: 'Overdue job',
      message: `${job.jobNumber} passed estimated completion`,
      link: `/job-cards/${job.id}`,
      createdAt: job.estimatedCompletion!.toISOString(),
    });
  }

  const priorityOrder: Record<NotificationPriority, number> = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export async function getNotificationsForUser(prisma: PrismaClient, userId: string) {
  const all = await buildNotifications(prisma);

  // Drop dismissals for alerts that no longer apply (e.g. stock restocked)
  const currentIds = all.map((n) => n.id);
  if (currentIds.length > 0) {
    await prisma.dismissedNotification.deleteMany({
      where: { userId, notificationKey: { notIn: currentIds } },
    });
  } else {
    await prisma.dismissedNotification.deleteMany({ where: { userId } });
  }

  const dismissed = await prisma.dismissedNotification.findMany({
    where: { userId },
    select: { notificationKey: true },
  });
  const dismissedSet = new Set(dismissed.map((d) => d.notificationKey));
  const active = all.filter((n) => !dismissedSet.has(n.id));
  return { items: active, unreadCount: active.length, total: all.length };
}

export async function dismissNotification(prisma: PrismaClient, userId: string, notificationKey: string) {
  const all = await buildNotifications(prisma);
  if (!all.some((n) => n.id === notificationKey)) {
    return { success: true };
  }
  await prisma.dismissedNotification.upsert({
    where: { userId_notificationKey: { userId, notificationKey } },
    create: { userId, notificationKey },
    update: { dismissedAt: new Date() },
  });
  return { success: true };
}

export async function dismissAllNotifications(prisma: PrismaClient, userId: string) {
  const all = await buildNotifications(prisma);
  await Promise.all(
    all.map((n) =>
      prisma.dismissedNotification.upsert({
        where: { userId_notificationKey: { userId, notificationKey: n.id } },
        create: { userId, notificationKey: n.id },
        update: { dismissedAt: new Date() },
      })
    )
  );
  return { success: true };
}
