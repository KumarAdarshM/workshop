import type { IpcMain } from 'electron';
import { dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC } from './channels';
import { getPrisma, getUploadsPath } from '../database/prisma';
import * as auth from '../services/auth.service';
import * as dashboard from '../services/dashboard.service';
import * as customers from '../services/customers.service';
import * as vehicles from '../services/vehicles.service';
import * as jobcards from '../services/jobcards.service';
import * as inventory from '../services/inventory.service';
import * as invoices from '../services/invoices.service';
import * as staff from '../services/staff.service';
import * as reports from '../services/reports.service';
import * as pdf from '../services/pdf.service';
import * as print from '../services/print.service';
import * as backup from '../services/backup.service';
import * as notifications from '../services/notifications.service';
import * as setup from '../services/setup.service';

function wrap<T extends unknown[]>(
  handler: (_: unknown, ...args: T) => Promise<unknown>
) {
  return async (_: unknown, ...args: unknown[]) => {
    try {
      return { success: true, data: await handler(_, ...(args as T)) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };
}

async function requireAuth(token: string | undefined) {
  if (!token) throw new Error('Unauthorized');
  const session = await auth.validateSession(getPrisma(), token);
  if (!session) throw new Error('Session expired');
  return session;
}

export function registerIpcHandlers(ipcMain: IpcMain) {
  const prisma = () => getPrisma();

  ipcMain.handle(IPC.SETUP_STATUS, wrap(async () => setup.getSetupStatus(prisma())));

  ipcMain.handle(IPC.SETUP_COMPLETE, wrap(async (_, input: setup.SetupInput) => {
    return setup.completeSetup(prisma(), input);
  }));

  ipcMain.handle(IPC.AUTH_LOGIN, wrap(async (_, creds: { email: string; password: string }) => {
    return auth.loginWithCredentials(prisma(), creds.email, creds.password);
  }));

  ipcMain.handle(IPC.AUTH_PIN, wrap(async (_, data: { pin: string; userId?: string }) => {
    return auth.loginWithPin(prisma(), data.pin, data.userId);
  }));

  ipcMain.handle(IPC.AUTH_LOGOUT, wrap(async (_, token: string) => auth.logout(prisma(), token)));

  ipcMain.handle(IPC.AUTH_SESSION, wrap(async (_, token: string) => auth.validateSession(prisma(), token)));

  ipcMain.handle(IPC.AUTH_USERS, wrap(async (_, token: string) => {
    await requireAuth(token);
    return prisma().user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: 'asc' },
    });
  }));

  ipcMain.handle(IPC.DASHBOARD_STATS, wrap(async (_, token: string) => {
    await requireAuth(token);
    return dashboard.getDashboardStats(prisma());
  }));

  ipcMain.handle(IPC.NOTIFICATIONS_LIST, wrap(async (_, token: string) => {
    const session = await requireAuth(token);
    return notifications.getNotificationsForUser(prisma(), session.user.id);
  }));

  ipcMain.handle(IPC.NOTIFICATIONS_DISMISS, wrap(async (_, token: string, notificationKey: string) => {
    const session = await requireAuth(token);
    return notifications.dismissNotification(prisma(), session.user.id, notificationKey);
  }));

  ipcMain.handle(IPC.NOTIFICATIONS_DISMISS_ALL, wrap(async (_, token: string) => {
    const session = await requireAuth(token);
    return notifications.dismissAllNotifications(prisma(), session.user.id);
  }));

  ipcMain.handle(
    IPC.NOTIFICATIONS_NATIVE,
    wrap(async (_, token: string, payload: { title: string; body: string }) => {
      await requireAuth(token);
      const { Notification } = await import('electron');
      if (Notification.isSupported()) {
        new Notification({
          title: payload.title,
          body: payload.body,
        }).show();
      }
      return { shown: true };
    })
  );

  ipcMain.handle(IPC.CUSTOMERS_LIST, wrap(async (_, token: string, opts: object) => {
    await requireAuth(token);
    return customers.listCustomers(prisma(), opts as never);
  }));

  ipcMain.handle(IPC.CUSTOMERS_GET, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return customers.getCustomer(prisma(), id);
  }));

  ipcMain.handle(IPC.CUSTOMERS_CREATE, wrap(async (_, token: string, data: object) => {
    await requireAuth(token);
    return customers.createCustomer(prisma(), data as never);
  }));

  ipcMain.handle(IPC.CUSTOMERS_UPDATE, wrap(async (_, token: string, id: string, data: object) => {
    await requireAuth(token);
    return customers.updateCustomer(prisma(), id, data as never);
  }));

  ipcMain.handle(IPC.CUSTOMERS_DELETE, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return customers.deleteCustomer(prisma(), id);
  }));

  ipcMain.handle(IPC.VEHICLES_LIST, wrap(async (_, token: string, opts: object) => {
    await requireAuth(token);
    return vehicles.listVehicles(prisma(), opts as never);
  }));

  ipcMain.handle(IPC.VEHICLES_BY_CUSTOMER, wrap(async (_, token: string, customerId: string) => {
    await requireAuth(token);
    return vehicles.getVehiclesByCustomer(prisma(), customerId);
  }));

  ipcMain.handle(IPC.VEHICLES_GET, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return vehicles.getVehicle(prisma(), id);
  }));

  ipcMain.handle(IPC.VEHICLES_CREATE, wrap(async (_, token: string, data: object) => {
    await requireAuth(token);
    return vehicles.createVehicle(prisma(), data as never);
  }));

  ipcMain.handle(IPC.VEHICLES_UPDATE, wrap(async (_, token: string, id: string, data: object) => {
    await requireAuth(token);
    return vehicles.updateVehicle(prisma(), id, data as Record<string, unknown>);
  }));

  ipcMain.handle(IPC.JOBCARDS_LIST, wrap(async (_, token: string, opts: object) => {
    await requireAuth(token);
    return jobcards.listJobCards(prisma(), opts as never);
  }));

  ipcMain.handle(IPC.JOBCARDS_GET, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return jobcards.getJobCard(prisma(), id);
  }));

  ipcMain.handle(IPC.JOBCARDS_CREATE, wrap(async (_, token: string, data: object) => {
    await requireAuth(token);
    return jobcards.createJobCard(prisma(), data as never);
  }));

  ipcMain.handle(IPC.JOBCARDS_UPDATE, wrap(async (_, token: string, id: string, data: object) => {
    await requireAuth(token);
    return jobcards.updateJobCard(prisma(), id, data as Record<string, unknown>);
  }));

  ipcMain.handle(IPC.JOBCARDS_STATUS, wrap(async (_, token: string, id: string, status: string) => {
    await requireAuth(token);
    return jobcards.updateJobStatus(prisma(), id, status as never);
  }));

  ipcMain.handle(IPC.JOBCARDS_IMAGE, wrap(async (_, token: string, jobCardId: string, sourcePath: string, caption?: string) => {
    await requireAuth(token);
    const ext = path.extname(sourcePath);
    const dest = path.join(getUploadsPath(), `${jobCardId}-${Date.now()}${ext}`);
    fs.copyFileSync(sourcePath, dest);
    return jobcards.addJobImage(prisma(), jobCardId, dest, caption);
  }));

  ipcMain.handle(IPC.INVENTORY_LIST, wrap(async (_, token: string, opts: object) => {
    await requireAuth(token);
    return inventory.listInventory(prisma(), opts as never);
  }));

  ipcMain.handle(IPC.INVENTORY_LOW, wrap(async (_, token: string) => {
    await requireAuth(token);
    return inventory.getLowStock(prisma());
  }));

  ipcMain.handle(IPC.INVENTORY_ALERTS, wrap(async (_, token: string) => {
    await requireAuth(token);
    return inventory.getStockAlerts(prisma());
  }));

  ipcMain.handle(IPC.INVENTORY_RESTOCK, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return inventory.restockToMinimum(prisma(), id);
  }));

  ipcMain.handle(IPC.INVENTORY_CREATE, wrap(async (_, token: string, data: object) => {
    await requireAuth(token);
    return inventory.createInventory(prisma(), data as Record<string, unknown>);
  }));

  ipcMain.handle(IPC.INVENTORY_UPDATE, wrap(async (_, token: string, id: string, data: object) => {
    await requireAuth(token);
    return inventory.updateInventory(prisma(), id, data as Record<string, unknown>);
  }));

  ipcMain.handle(IPC.INVENTORY_ADJUST, wrap(async (_, token: string, id: string, qty: number, reason: string) => {
    await requireAuth(token);
    return inventory.adjustStock(prisma(), id, qty, reason);
  }));

  ipcMain.handle(IPC.INVOICES_LIST, wrap(async (_, token: string, opts: object) => {
    await requireAuth(token);
    return invoices.listInvoices(prisma(), opts as never);
  }));

  ipcMain.handle(IPC.INVOICES_GET, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return invoices.getInvoice(prisma(), id);
  }));

  ipcMain.handle(IPC.INVOICES_CREATE, wrap(async (_, token: string, jobCardId: string) => {
    await requireAuth(token);
    return invoices.createInvoiceFromJob(prisma(), jobCardId);
  }));

  ipcMain.handle(IPC.INVOICES_PAYMENT, wrap(async (_, token: string, invoiceId: string, data: object) => {
    await requireAuth(token);
    return invoices.addPayment(prisma(), invoiceId, data as never);
  }));

  ipcMain.handle(IPC.STAFF_LIST, wrap(async (_, token: string) => {
    await requireAuth(token);
    return staff.listStaff(prisma());
  }));

  ipcMain.handle(IPC.STAFF_CREATE, wrap(async (_, token: string, data: object) => {
    const session = await requireAuth(token);
    if (session.user.role !== 'ADMIN') throw new Error('Admin only');
    return staff.createStaff(prisma(), data as never);
  }));

  ipcMain.handle(IPC.STAFF_ATTENDANCE, wrap(async (_, token: string, data?: object) => {
    await requireAuth(token);
    if (data && typeof data === 'object' && 'userId' in data) {
      return staff.recordAttendance(prisma(), data as never);
    }
    return staff.getAttendance(prisma());
  }));

  ipcMain.handle(IPC.REPORTS_DAILY, wrap(async (_, token: string, date?: string) => {
    await requireAuth(token);
    return reports.getDailySales(prisma(), date);
  }));

  ipcMain.handle(IPC.REPORTS_MONTHLY, wrap(async (_, token: string) => {
    await requireAuth(token);
    return reports.getMonthlyRevenue(prisma());
  }));

  ipcMain.handle(IPC.REPORTS_PENDING, wrap(async (_, token: string) => {
    await requireAuth(token);
    return reports.getPendingPayments(prisma());
  }));

  ipcMain.handle(IPC.REPORTS_INVENTORY, wrap(async (_, token: string) => {
    await requireAuth(token);
    return reports.getInventoryReport(prisma());
  }));

  ipcMain.handle(IPC.REPORTS_TOP, wrap(async (_, token: string) => {
    await requireAuth(token);
    return { customers: await reports.getTopCustomers(prisma()), services: await reports.getTopServices(prisma()) };
  }));

  ipcMain.handle(IPC.SETTINGS_GET, wrap(async (_, token: string) => {
    await requireAuth(token);
    return prisma().workshopSettings.findUnique({ where: { id: 'default' } });
  }));

  ipcMain.handle(IPC.SETTINGS_UPDATE, wrap(async (_, token: string, data: object) => {
    const session = await requireAuth(token);
    if (session.user.role !== 'ADMIN') throw new Error('Admin only');
    return prisma().workshopSettings.update({ where: { id: 'default' }, data: data as never });
  }));

  ipcMain.handle(IPC.PDF_JOB_CARD, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return pdf.generateJobCardPdf(prisma(), id);
  }));

  ipcMain.handle(IPC.PDF_INVOICE, wrap(async (_, token: string, id: string) => {
    await requireAuth(token);
    return pdf.generateInvoicePdf(prisma(), id);
  }));

  ipcMain.handle(IPC.PDF_REPORT_LINES, wrap(async (_, token: string, title: string, lines: string[]) => {
    await requireAuth(token);
    return pdf.generateReportPdf(prisma(), title, lines);
  }));

  ipcMain.handle(IPC.PRINT, wrap(async (_, token: string, html: string) => {
    await requireAuth(token);
    return print.printHtml(html);
  }));

  ipcMain.handle(IPC.PRINT_THERMAL, wrap(async (_, token: string, jobId: string) => {
    await requireAuth(token);
    const job = await jobcards.getJobCard(prisma(), jobId);
    const settings = await prisma().workshopSettings.findUnique({ where: { id: 'default' } });
    const html = print.buildThermalReceipt({
      workshopName: settings?.workshopName ?? 'Workshop Pro',
      title: `Job #${job?.jobNumber}`,
      lines: [
        { label: 'Customer', value: job?.customer.name ?? '' },
        { label: 'Vehicle', value: job?.vehicle.vehicleNumber ?? '' },
        { label: 'Status', value: job?.status ?? '' },
      ],
      total: `₹${job?.grandTotal.toFixed(2) ?? '0'}`,
    });
    return print.printHtml(html, { silent: false });
  }));

  ipcMain.handle(IPC.BACKUP_CREATE, wrap(async (_, token: string) => {
    await requireAuth(token);
    return backup.createBackup();
  }));

  ipcMain.handle(IPC.BACKUP_RESTORE, wrap(async (_, token: string, backupPath: string) => {
    const session = await requireAuth(token);
    if (session.user.role !== 'ADMIN') throw new Error('Admin only');
    return backup.restoreBackup(backupPath);
  }));

  ipcMain.handle(IPC.BACKUP_LIST, wrap(async (_, token: string) => {
    await requireAuth(token);
    return backup.listBackups();
  }));

  ipcMain.handle(IPC.DIALOG_OPEN, wrap(async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  }));

  ipcMain.handle(IPC.DIALOG_SAVE, wrap(async () => {
    const result = await dialog.showSaveDialog({ filters: [{ name: 'Database', extensions: ['db'] }] });
    return result.canceled ? null : result.filePath;
  }));
}
