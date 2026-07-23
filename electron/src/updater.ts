import { BrowserWindow } from 'electron';

interface UpdateInfo {
  version: string;
  files: Array<{ url: string }>;
  path: string;
  sha512: string;
  releaseDate: string;
}

interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export class AppUpdater {
  private mainWindow?: BrowserWindow;
  private autoCheck: boolean;
  private autoUpdater: any = null;

  constructor(autoCheck = true) {
    this.autoCheck = autoCheck;
    this.loadAutoUpdater();
  }

  private loadAutoUpdater(): void {
    try {
      this.autoUpdater = require('electron-updater')?.autoUpdater || null;
    } catch {
      console.log('[updater] electron-updater not available — updates disabled');
    }
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    if (this.mainWindow) {
      this.mainWindow.webContents.on('did-finish-load', () => {
        this.mainWindow?.webContents.send('updater-status', this.autoUpdater ? 'ready' : 'unavailable');
      });
    }
  }

  check(): void {
    if (!this.autoUpdater) {
      console.log('[updater] Skipping update check — electron-updater not available');
      return;
    }
    this.autoUpdater.checkForUpdates().catch(() => {});
  }

  init(): void {
    if (!this.autoUpdater || !this.autoCheck) return;

    try {
      this.autoUpdater.logger = console;
      this.autoUpdater.autoDownload = false;
    } catch {}

    this.autoUpdater.on('checking-for-update', () => {
      console.log('[updater] Checking for updates...');
    });

    this.autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log(`[updater] Update available: ${info.version}`);
      this.mainWindow?.webContents.send('update-available', info.version);
    });

    this.autoUpdater.on('update-not-available', () => {
      console.log('[updater] No updates available');
    });

    this.autoUpdater.on('error', (err: Error) => {
      console.log(`[updater] Update error: ${err.message}`);
    });

    this.autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.mainWindow?.webContents.send('update-progress', progress.percent);
    });

    this.autoUpdater.on('update-downloaded', () => {
      console.log('[updater] Update downloaded');
      this.mainWindow?.webContents.send('update-downloaded');
    });

    this.check();
  }

  downloadAndInstall(): void {
    if (!this.autoUpdater) return;
    this.autoUpdater.downloadUpdate().catch(() => {});
  }

  quitAndInstall(): void {
    if (!this.autoUpdater) return;
    setImmediate(() => {
      this.autoUpdater.quitAndInstall();
    });
  }
}
