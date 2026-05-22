import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/** Dev/CLI only — full demo including default admin (PIN 0000) and staff (PIN 1234). */
export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const pinHash = await bcrypt.hash('1234', 10);
  const adminPin = await bcrypt.hash('0000', 10);

  await prisma.user.create({
    data: {
      name: 'Workshop Owner',
      email: 'admin@workshop.local',
      phone: '9876543210',
      pinHash: adminPin,
      role: 'ADMIN',
    },
  });

  await seedDemoBusinessData(prisma, pinHash);
  console.log('Demo data seeded. Admin PIN: 0000, Staff PIN: 1234');
}

/** Sample customers, inventory, and jobs — requires an existing admin (dev setup option). */
export async function seedDemoBusinessData(prisma: PrismaClient, staffPinHash?: string): Promise<void> {
  const pinHash = staffPinHash ?? (await bcrypt.hash('1234', 10));

  const existingStaff = await prisma.user.count({ where: { role: { not: 'ADMIN' } } });
  if (existingStaff === 0) {
    await prisma.user.createMany({
      data: [
        { name: 'Rajesh Kumar', email: 'rajesh@workshop.local', pinHash, role: 'MECHANIC', phone: '9876500001' },
        { name: 'Suresh Patel', email: 'suresh@workshop.local', pinHash, role: 'MECHANIC', phone: '9876500002' },
        { name: 'Front Desk', email: 'staff@workshop.local', pinHash, role: 'STAFF', phone: '9876500003' },
      ],
    });
  }

  if ((await prisma.customer.count()) > 0) return;

  const mechanics = await prisma.user.findMany({ where: { role: 'MECHANIC' } });

  const supplier = await prisma.supplier.create({
    data: { name: 'Auto Parts Hub', phone: '9123456789', address: 'Industrial Area' },
  });

  const parts = [
    { sku: 'ENG-001', name: 'Oil Filter', category: 'ENGINE_PARTS' as const, quantity: 45, minStock: 10, purchasePrice: 120, sellingPrice: 250 },
    { sku: 'OIL-001', name: 'Engine Oil 5W30 (1L)', category: 'OIL' as const, quantity: 80, minStock: 20, purchasePrice: 350, sellingPrice: 550 },
    { sku: 'TIR-001', name: 'Tubeless Tyre 185/65 R15', category: 'TIRES' as const, quantity: 8, minStock: 4, purchasePrice: 3200, sellingPrice: 4500 },
    { sku: 'ELC-001', name: 'Spark Plug Set', category: 'ELECTRICAL' as const, quantity: 3, minStock: 5, purchasePrice: 400, sellingPrice: 750 },
    { sku: 'ACC-001', name: 'Wiper Blade Pair', category: 'ACCESSORIES' as const, quantity: 25, minStock: 8, purchasePrice: 180, sellingPrice: 350 },
  ];

  for (const p of parts) {
    await prisma.inventory.create({
      data: { ...p, supplierId: supplier.id },
    });
  }

  const customers = [
    { name: 'Amit Sharma', mobile: '9811111111', address: 'MG Road, Delhi' },
    { name: 'Priya Singh', mobile: '9822222222', address: 'Sector 18, Noida' },
    { name: 'Vikram Reddy', mobile: '9833333333', address: 'Banjara Hills, Hyderabad' },
    { name: 'Neha Gupta', mobile: '9844444444', address: 'Andheri West, Mumbai' },
    { name: 'Rahul Mehta', mobile: '9855555555', address: 'Satellite, Ahmedabad' },
  ];

  for (const c of customers) {
    const customer = await prisma.customer.create({ data: c });
    const vehicle = await prisma.vehicle.create({
      data: {
        customerId: customer.id,
        vehicleNumber: `DL${Math.floor(Math.random() * 90 + 10)}AB${Math.floor(Math.random() * 9000 + 1000)}`,
        brand: ['Maruti', 'Hyundai', 'Honda', 'Tata'][Math.floor(Math.random() * 4)],
        model: ['Swift', 'i20', 'City', 'Nexon'][Math.floor(Math.random() * 4)],
        fuelType: 'Petrol',
        kmReading: Math.floor(Math.random() * 80000 + 5000),
      },
    });

    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'] as const;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const labor = Math.floor(Math.random() * 3000 + 500);
    const partsTotal = Math.floor(Math.random() * 2000 + 200);

    const job = await prisma.jobCard.create({
      data: {
        jobNumber: `JC-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 99)}`,
        customerId: customer.id,
        vehicleId: vehicle.id,
        mechanicId: mechanics[Math.floor(Math.random() * mechanics.length)]?.id,
        status,
        complaint: 'General service and inspection',
        laborTotal: labor,
        partsTotal,
        grandTotal: labor + partsTotal,
        gstPercent: 18,
        services: {
          create: [{ name: 'General Service', laborCharge: labor, quantity: 1 }],
        },
        parts: {
          create: [{ partName: 'Oil Filter', quantity: 1, unitPrice: 250, total: 250 }],
        },
      },
    });

    if (status === 'COMPLETED' || status === 'DELIVERED') {
      const gst = (labor + partsTotal) * 0.18;
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 99)}`,
          jobCardId: job.id,
          customerId: customer.id,
          subtotal: labor + partsTotal,
          laborTotal: labor,
          partsTotal,
          gstPercent: 18,
          gstAmount: gst,
          grandTotal: labor + partsTotal + gst,
          paidAmount: status === 'DELIVERED' ? labor + partsTotal + gst : 0,
          status: status === 'DELIVERED' ? 'PAID' : 'PENDING',
        },
      });
    }
  }

  await prisma.workshopSettings.upsert({
    where: { id: 'default' },
    update: {
      workshopName: 'Pro Auto Workshop',
      address: '123 Service Lane, Industrial Area',
      phone: '1800-WORKSHOP',
      gstNumber: '29ABCDE1234F1Z5',
    },
    create: {
      id: 'default',
      workshopName: 'Pro Auto Workshop',
      address: '123 Service Lane, Industrial Area',
      phone: '1800-WORKSHOP',
      gstNumber: '29ABCDE1234F1Z5',
    },
  });
}
