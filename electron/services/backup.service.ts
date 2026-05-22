import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDbPath, getBackupsPath } from '../database/prisma';
import { format } from 'date-fns';

export function createBackup(): { success: boolean; path?: string; error?: string } {
  try {
    const dbPath = getDbPath();
    const backupsDir = getBackupsPath();
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const backupPath = path.join(backupsDir, `workshop-backup-${timestamp}.db`);

    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Database file not found' };
    }

    fs.copyFileSync(dbPath, backupPath);
    return { success: true, path: backupPath };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export function restoreBackup(backupPath: string): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup file not found' };
    const dbPath = getDbPath();
    fs.copyFileSync(backupPath, dbPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export function listBackups(): { name: string; path: string; size: number; date: Date }[] {
  const backupsDir = getBackupsPath();
  if (!fs.existsSync(backupsDir)) return [];

  return fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith('.db'))
    .map((name) => {
      const fullPath = path.join(backupsDir, name);
      const stat = fs.statSync(fullPath);
      return { name, path: fullPath, size: stat.size, date: stat.mtime };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

let backupTimer: ReturnType<typeof setInterval> | null = null;

export function scheduleAutoBackup() {
  const intervalMs = 24 * 60 * 60 * 1000;
  if (backupTimer) clearInterval(backupTimer);
  backupTimer = setInterval(() => {
    createBackup();
  }, intervalMs);
}
