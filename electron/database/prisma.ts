import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let prisma: PrismaClient | null = null;

export function getDbPath(): string {
  const userData = app.getPath('userData');
  const dbDir = path.join(userData, 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  return path.join(dbDir, 'workshop.db');
}

export function getUploadsPath(): string {
  const uploads = path.join(app.getPath('userData'), 'uploads');
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
  return uploads;
}

export function getBackupsPath(): string {
  const backups = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(backups)) fs.mkdirSync(backups, { recursive: true });
  return backups;
}

async function runDbPush(): Promise<void> {
  const { execSync } = await import('child_process');
  const dbPath = getDbPath();
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    cwd: app.isPackaged ? app.getAppPath() : process.cwd(),
    stdio: 'pipe',
  });
}

async function ensureSchema(client: PrismaClient): Promise<void> {
  let needsPush = false;
  for (const table of ['User', 'DismissedNotification', 'Inventory']) {
    try {
      await client.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`);
    } catch {
      needsPush = true;
      break;
    }
  }
  if (needsPush) await runDbPush();
}

export async function initDatabase(): Promise<void> {
  const dbPath = getDbPath();
  process.env.DATABASE_URL = `file:${dbPath}`;
  prisma = new PrismaClient();
  await ensureSchema(prisma);

  const settings = await prisma.workshopSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    await prisma.workshopSettings.create({ data: { id: 'default' } });
  }

}

export function getPrisma(): PrismaClient {
  if (!prisma) throw new Error('Database not initialized');
  return prisma;
}
