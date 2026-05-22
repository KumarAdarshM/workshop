import { app } from 'electron';
import type { PrismaClient } from '@prisma/client';
import * as auth from './auth.service';
import { seedDemoBusinessData } from './seed.service';

const WEAK_PINS = new Set(['0000', '1111', '1234', '1212', '4321', '9999']);

export interface SetupStatus {
  needsSetup: boolean;
  demoDataAvailable: boolean;
}

export interface SetupInput {
  workshopName: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  defaultGst?: number;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPin: string;
  confirmPin: string;
  acceptEula: boolean;
  includeDemoData?: boolean;
}

export async function getSetupStatus(prisma: PrismaClient): Promise<SetupStatus> {
  const userCount = await prisma.user.count();
  return {
    needsSetup: userCount === 0,
    demoDataAvailable: !app.isPackaged,
  };
}

function validateSetupInput(input: SetupInput): void {
  if (!input.acceptEula) throw new Error('You must accept the license agreement to continue');
  if (!input.workshopName?.trim()) throw new Error('Workshop name is required');
  if (!input.adminName?.trim()) throw new Error('Admin name is required');
  if (!input.adminEmail?.trim()) throw new Error('Admin email is required');

  const pin = input.adminPin?.trim();
  const confirm = input.confirmPin?.trim();
  if (!pin || pin.length < 4) throw new Error('PIN must be at least 4 digits');
  if (!/^\d+$/.test(pin)) throw new Error('PIN must contain only numbers');
  if (pin !== confirm) throw new Error('PINs do not match');
  if (app.isPackaged && WEAK_PINS.has(pin)) {
    throw new Error('This PIN is too common. Choose a unique PIN for your workshop');
  }
}

export async function completeSetup(prisma: PrismaClient, input: SetupInput) {
  const status = await getSetupStatus(prisma);
  if (!status.needsSetup) throw new Error('Setup has already been completed');

  validateSetupInput(input);

  if (input.includeDemoData && !status.demoDataAvailable) {
    throw new Error('Sample data is only available in development builds');
  }

  await prisma.workshopSettings.update({
    where: { id: 'default' },
    data: {
      workshopName: input.workshopName.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      gstNumber: input.gstNumber?.trim() || null,
      defaultGst: input.defaultGst ?? 18,
    },
  });

  const admin = await auth.createUser(prisma, {
    name: input.adminName.trim(),
    email: input.adminEmail.trim().toLowerCase(),
    phone: input.adminPhone?.trim(),
    pin: input.adminPin.trim(),
    role: 'ADMIN',
  });

  if (input.includeDemoData) {
    await seedDemoBusinessData(prisma);
  }

  return auth.createSession(prisma, admin.id);
}
