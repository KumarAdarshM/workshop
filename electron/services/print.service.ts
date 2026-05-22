import { BrowserWindow } from 'electron';
import fs from 'fs';

export async function printHtml(html: string, options?: { silent?: boolean; deviceName?: string }) {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    win.webContents.print(
      {
        silent: options?.silent ?? false,
        printBackground: true,
        deviceName: options?.deviceName,
      },
      (success, errorType) => {
        win.close();
        resolve(success ? { success: true } : { success: false, error: errorType });
      }
    );
  });
}

export async function printFile(filePath: string) {
  if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
  const win = new BrowserWindow({ show: false });
  await win.loadFile(filePath);
  return new Promise<{ success: boolean }>((resolve) => {
    win.webContents.print({ silent: false, printBackground: true }, (success) => {
      win.close();
      resolve({ success });
    });
  });
}

export function buildThermalReceipt(data: {
  workshopName: string;
  title: string;
  lines: { label: string; value: string }[];
  total: string;
  footer?: string;
}) {
  const rows = data.lines.map((l) => `<tr><td>${l.label}</td><td align="right">${l.value}</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><style>
    body { font-family: monospace; font-size: 12px; width: 280px; margin: 0; padding: 8px; }
    h1 { font-size: 14px; text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; }
    .total { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; margin-top: 8px; padding-top: 4px; }
    .footer { text-align: center; margin-top: 12px; font-size: 10px; }
  </style></head><body>
    <h1>${data.workshopName}</h1>
    <p style="text-align:center">${data.title}</p>
    <table>${rows}</table>
    <p class="total">TOTAL: ${data.total}</p>
    <p class="footer">${data.footer ?? 'Thank you!'}</p>
  </body></html>`;
}

export function buildJobCardPrintHtml(job: Record<string, unknown>) {
  return buildThermalReceipt({
    workshopName: 'Workshop Pro',
    title: `Job #${(job as { jobNumber: string }).jobNumber}`,
    lines: [
      { label: 'Customer', value: String((job as { customer?: { name: string } }).customer?.name ?? '') },
      { label: 'Vehicle', value: String((job as { vehicle?: { vehicleNumber: string } }).vehicle?.vehicleNumber ?? '') },
      { label: 'Status', value: String((job as { status: string }).status) },
      { label: 'Total', value: `₹${Number((job as { grandTotal: number }).grandTotal).toFixed(2)}` },
    ],
    total: `₹${Number((job as { grandTotal: number }).grandTotal).toFixed(2)}`,
  });
}
