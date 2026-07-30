export interface DockConfig {
  badge?: string | number;
  progress?: number;
  bounceEnabled?: boolean;
  recentDocuments?: string[];
}

export class DockIntegration {
  setBadge(badge: string | number): void {
    if (process.platform === 'darwin') {
      try { require('electron').app.dock?.setBadge(String(badge)); } catch {}
    }
  }

  setProgress(progress: number): void {
    if (process.platform === 'darwin') {
      try { require('electron').app.dock?.setProgressBar(progress); } catch {}
    }
  }

  bounce(): void {
    if (process.platform === 'darwin') {
      try { require('electron').app.dock?.bounce('critical'); } catch {}
    }
  }

  clearBadge(): void {
    if (process.platform === 'darwin') {
      try { require('electron').app.dock?.setBadge(''); } catch {}
    }
  }
}
