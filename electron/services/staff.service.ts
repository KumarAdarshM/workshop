import type { PrismaClient, UserRole, AttendanceStatus } from '@prisma/client';
import { startOfDay } from 'date-fns';
import * as auth from './auth.service';

export async function listStaff(prisma: PrismaClient) {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { jobCards: true } },
    },
  });
}

export async function createStaff(
  prisma: PrismaClient,
  data: { name: string; email?: string; phone?: string; pin: string; role: UserRole }
) {
  return auth.createUser(prisma, data);
}

export async function updateStaff(
  prisma: PrismaClient,
  id: string,
  data: Partial<{ name: string; email?: string; phone?: string; role: UserRole; isActive: boolean; pin?: string }>
) {
  const { pin, ...rest } = data;
  const updateData: Record<string, unknown> = { ...rest };
  if (pin) updateData.pinHash = await auth.hashPin(pin);
  return prisma.user.update({
    where: { id },
    data: updateData as never,
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
  });
}

export async function recordAttendance(
  prisma: PrismaClient,
  data: { userId: string; date: string; status: AttendanceStatus; checkIn?: string; checkOut?: string; notes?: string }
) {
  const date = startOfDay(new Date(data.date));
  return prisma.attendance.upsert({
    where: { userId_date: { userId: data.userId, date } },
    update: { status: data.status, checkIn: data.checkIn, checkOut: data.checkOut, notes: data.notes },
    create: {
      userId: data.userId,
      date,
      status: data.status,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      notes: data.notes,
    },
  });
}

export async function getAttendance(prisma: PrismaClient, date?: string) {
  const d = date ? startOfDay(new Date(date)) : startOfDay(new Date());
  return prisma.attendance.findMany({
    where: { date: d },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}

export async function getMechanicPerformance(prisma: PrismaClient) {
  const mechanics = await prisma.user.findMany({ where: { role: 'MECHANIC', isActive: true } });
  const results = [];
  for (const m of mechanics) {
    const completed = await prisma.jobCard.count({
      where: { mechanicId: m.id, status: { in: ['COMPLETED', 'DELIVERED'] } },
    });
    const active = await prisma.jobCard.count({
      where: { mechanicId: m.id, status: { in: ['IN_PROGRESS', 'PENDING', 'WAITING_PARTS'] } },
    });
    results.push({ ...m, completedJobs: completed, activeJobs: active });
  }
  return results;
}
