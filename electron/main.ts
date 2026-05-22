import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/handlers';
import { getPrisma, initDatabase } from './database/prisma';
import { scheduleAutoBackup } from './services/backup.service';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#faf9f5',
    title: 'Workshop Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  registerIpcHandlers(ipcMain);
  scheduleAutoBackup();

  if (app.isPackaged && process.env.WORKSHOP_UPDATE_URL) {
    try {
      const { autoUpdater } = await import('electron-updater');
      autoUpdater.autoDownload = true;
      autoUpdater.checkForUpdatesAndNotify();
    } catch (err) {
      console.warn('Auto-update check skipped:', err);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  const prisma = getPrisma();
  prisma.$disconnect();
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
