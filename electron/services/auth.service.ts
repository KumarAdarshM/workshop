import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { PrismaClient, UserRole } from '@prisma/client';
import { addDays } from 'date-fns';

const SESSION_DAYS = 7;

export async function loginWithCredentials(
  prisma: PrismaClient,
  email: string,
  password: string
) {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), isActive: true },
  });
  if (!user) return { success: false, error: 'Invalid credentials' };
  const valid = await bcrypt.compare(password, user.pinHash);
  if (!valid) return { success: false, error: 'Invalid credentials' };
  return createSession(prisma, user.id);
}

export async function loginWithPin(prisma: PrismaClient, pin: string, userId?: string) {
  const users = userId
    ? await prisma.user.findMany({ where: { id: userId, isActive: true } })
    : await prisma.user.findMany({ where: { isActive: true } });

  for (const user of users) {
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (valid) return createSession(prisma, user.id);
  }
  return { success: false, error: 'Invalid PIN' };
}

export async function createSession(prisma: PrismaClient, userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = addDays(new Date(), SESSION_DAYS);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, phone: true },
  });
  return { success: true, token, user, expiresAt };
}

export async function validateSession(prisma: PrismaClient, token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, role: true, phone: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return { user: session.user, token: session.token, expiresAt: session.expiresAt };
}

export async function logout(prisma: PrismaClient, token: string) {
  await prisma.session.deleteMany({ where: { token } });
  return { success: true };
}

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

export async function createUser(
  prisma: PrismaClient,
  data: { name: string; email?: string; phone?: string; pin: string; role: UserRole }
) {
  const pinHash = await hashPin(data.pin);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email?.toLowerCase(),
      phone: data.phone,
      pinHash,
      role: data.role,
    },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
  });
}
