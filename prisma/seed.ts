import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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

  await prisma.user.createMany({
    data: [
      { name: 'Rajesh Kumar', email: 'rajesh@workshop.local', pinHash, role: 'MECHANIC', phone: '9876500001' },
      { name: 'Suresh Patel', email: 'suresh@workshop.local', pinHash, role: 'MECHANIC', phone: '9876500002' },
      { name: 'Front Desk', email: 'staff@workshop.local', pinHash, role: 'STAFF', phone: '9876500003' },
    ],
  });

  await prisma.workshopSettings.upsert({
    where: { id: 'default' },
    update: { workshopName: 'Pro Auto Workshop' },
    create: { id: 'default', workshopName: 'Pro Auto Workshop' },
  });

  console.log('Seed complete. Admin PIN: 0000, Staff PIN: 1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
