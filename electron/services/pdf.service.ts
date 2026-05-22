import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { PrismaClient } from '@prisma/client';

function getOutputDir() {
  const dir = path.join(app.getPath('documents'), 'WorkshopPro');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writePdf(doc: PDFKit.PDFDocument, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const filepath = path.join(getOutputDir(), filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

export async function generateJobCardPdf(prisma: PrismaClient, jobCardId: string) {
  const job = await prisma.jobCard.findUnique({
    where: { id: jobCardId },
    include: { customer: true, vehicle: true, mechanic: true, services: true, parts: true },
  });
  if (!job) throw new Error('Job card not found');

  const settings = await prisma.workshopSettings.findUnique({ where: { id: 'default' } });
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  doc.fontSize(20).text(settings?.workshopName ?? 'Workshop Pro', { align: 'center' });
  doc.fontSize(10).text(settings?.address ?? '', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text(`Job Card: ${job.jobNumber}`);
  doc.fontSize(10);
  doc.text(`Date: ${job.createdAt.toLocaleDateString()}`);
  doc.text(`Status: ${job.status.replace(/_/g, ' ')}`);
  doc.moveDown();
  doc.text(`Customer: ${job.customer.name} | ${job.customer.mobile}`);
  doc.text(`Vehicle: ${job.vehicle.vehicleNumber} - ${job.vehicle.brand} ${job.vehicle.model}`);
  if (job.mechanic) doc.text(`Mechanic: ${job.mechanic.name}`);
  doc.moveDown();

  if (job.complaint) {
    doc.text(`Complaint: ${job.complaint}`);
    doc.moveDown();
  }

  doc.fontSize(12).text('Services', { underline: true });
  job.services.forEach((s) => {
    doc.fontSize(10).text(`${s.name} x${s.quantity} - ₹${s.laborCharge.toFixed(2)}`);
  });
  doc.moveDown();

  doc.fontSize(12).text('Parts', { underline: true });
  job.parts.forEach((p) => {
    doc.fontSize(10).text(`${p.partName} x${p.quantity} - ₹${p.total.toFixed(2)}`);
  });
  doc.moveDown();

  doc.fontSize(12).text(`Labor: ₹${job.laborTotal.toFixed(2)}`);
  doc.text(`Parts: ₹${job.partsTotal.toFixed(2)}`);
  doc.text(`GST (${job.gstPercent}%): included in total`);
  doc.fontSize(14).text(`Grand Total: ₹${job.grandTotal.toFixed(2)}`, { align: 'right' });

  return writePdf(doc, `jobcard-${job.jobNumber}.pdf`);
}

export async function generateInvoicePdf(prisma: PrismaClient, invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      jobCard: { include: { vehicle: true, services: true, parts: true } },
      payments: true,
    },
  });
  if (!inv) throw new Error('Invoice not found');

  const settings = await prisma.workshopSettings.findUnique({ where: { id: 'default' } });
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
  doc.fontSize(14).text(settings?.workshopName ?? 'Workshop Pro', { align: 'center' });
  doc.fontSize(9).text(`GSTIN: ${settings?.gstNumber ?? 'N/A'}`, { align: 'center' });
  doc.fontSize(9).text(`${settings?.address ?? ''} | ${settings?.phone ?? ''}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(11).text(`Invoice No: ${inv.invoiceNumber}`);
  doc.text(`Date: ${inv.createdAt.toLocaleDateString()}`);
  doc.text(`Customer: ${inv.customer.name}`);
  doc.text(`Mobile: ${inv.customer.mobile}`);
  if (inv.jobCard) {
    doc.text(`Job: ${inv.jobCard.jobNumber} | Vehicle: ${inv.jobCard.vehicle.vehicleNumber}`);
  }
  doc.moveDown();

  if (inv.jobCard) {
    inv.jobCard.services.forEach((s) => {
      doc.text(`${s.name} - ₹${(s.laborCharge * s.quantity).toFixed(2)}`);
    });
    inv.jobCard.parts.forEach((p) => {
      doc.text(`${p.partName} - ₹${p.total.toFixed(2)}`);
    });
  }

  doc.moveDown();
  doc.text(`Subtotal: ₹${inv.subtotal.toFixed(2)}`);
  doc.text(`Discount: ₹${inv.discount.toFixed(2)}`);
  doc.text(`GST (${inv.gstPercent}%): ₹${inv.gstAmount.toFixed(2)}`);
  doc.fontSize(14).text(`Total: ₹${inv.grandTotal.toFixed(2)}`);
  doc.text(`Paid: ₹${inv.paidAmount.toFixed(2)} | Balance: ₹${(inv.grandTotal - inv.paidAmount).toFixed(2)}`);

  return writePdf(doc, `invoice-${inv.invoiceNumber}.pdf`);
}

export async function generateReportPdf(prisma: PrismaClient, title: string, lines: string[]) {
  const doc = new PDFDocument({ margin: 50 });
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();
  lines.forEach((line) => doc.fontSize(10).text(line));
  return writePdf(doc, `report-${Date.now()}.pdf`);
}
