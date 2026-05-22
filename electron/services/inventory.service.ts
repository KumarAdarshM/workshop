import type { PrismaClient, InventoryCategory } from '@prisma/client';

export async function listInventory(
  prisma: PrismaClient,
  opts: { page?: number; limit?: number; search?: string; category?: InventoryCategory } = {}
) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (opts.category) where.category = opts.category;
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search } },
      { sku: { contains: opts.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where: where as never,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: { supplier: { select: { name: true } } },
    }),
    prisma.inventory.count({ where: where as never }),
  ]);

  return { items, total, page, limit };
}

export async function getLowStock(prisma: PrismaClient) {
  const items = await prisma.inventory.findMany({ orderBy: { quantity: 'asc' } });
  return items.filter((i) => i.quantity <= i.minStock);
}

export type StockAlertLevel = 'OUT_OF_STOCK' | 'LOW' | 'OK';

export async function getStockAlerts(prisma: PrismaClient) {
  const items = await prisma.inventory.findMany({
    orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      stockHistory: { take: 3, orderBy: { createdAt: 'desc' } },
    },
  });

  const alerts = items
    .map((item) => {
      const shortfall = Math.max(0, item.minStock - item.quantity);
      let alertLevel: StockAlertLevel = 'OK';
      if (item.quantity === 0) alertLevel = 'OUT_OF_STOCK';
      else if (item.quantity <= item.minStock) alertLevel = 'LOW';

      return {
        ...item,
        alertLevel,
        shortfall,
        percentOfMin: item.minStock > 0 ? Math.round((item.quantity / item.minStock) * 100) : 100,
      };
    })
    .filter((i) => i.alertLevel !== 'OK');

  const outOfStock = alerts.filter((a) => a.alertLevel === 'OUT_OF_STOCK').length;
  const low = alerts.filter((a) => a.alertLevel === 'LOW').length;

  return {
    items: alerts,
    summary: { total: alerts.length, outOfStock, low },
  };
}

export async function restockToMinimum(prisma: PrismaClient, id: string, reason = 'Restock to minimum') {
  const item = await prisma.inventory.findUnique({ where: { id } });
  if (!item) throw new Error('Item not found');
  const changeQty = Math.max(0, item.minStock - item.quantity);
  if (changeQty === 0) return { item, changed: false, changeQty: 0, alert: getStockAlertNotification(item) };
  const result = await adjustStock(prisma, id, changeQty, reason, 'stock-alert');
  return { item: result.item, changed: true, changeQty, alert: result.alert };
}

export function getStockAlertNotification(item: { name: string; sku: string; quantity: number; minStock: number }) {
  if (item.quantity > item.minStock) return null;
  const isOut = item.quantity === 0;
  return {
    title: isOut ? 'Out of stock' : 'Low stock alert',
    body: `${item.name} (${item.sku}): ${item.quantity} in stock, minimum ${item.minStock}`,
  };
}

export async function createInventory(prisma: PrismaClient, data: Record<string, unknown>) {
  const item = await prisma.inventory.create({ data: data as never });
  await prisma.stockHistory.create({
    data: {
      inventoryId: item.id,
      changeQty: item.quantity,
      reason: 'Initial stock',
    },
  });
  return item;
}

export async function updateInventory(prisma: PrismaClient, id: string, data: Record<string, unknown>) {
  return prisma.inventory.update({ where: { id }, data: data as never });
}

export async function adjustStock(
  prisma: PrismaClient,
  id: string,
  changeQty: number,
  reason: string,
  reference?: string
) {
  const item = await prisma.inventory.update({
    where: { id },
    data: { quantity: { increment: changeQty } },
  });
  await prisma.stockHistory.create({
    data: { inventoryId: id, changeQty, reason, reference },
  });
  const alert = getStockAlertNotification(item);
  return { item, alert };
}
