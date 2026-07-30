import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
const logger = createLogger('app-updater');

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  notes: string;
  url: string;
  signature: string;
  mandatory: boolean;
  channel: string;
  rolloutPercent?: number;
}

export type UpdateEvent = 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'installing';

export class AppUpdater extends EventEmitter {
  private currentVersion: string;
  private updateUrl: string;
  private channel: string;

  constructor(currentVersion: string, updateUrl: string, channel: string = 'stable') {
    super();
    this.currentVersion = currentVersion;
    this.updateUrl = updateUrl;
    this.channel = channel;
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    this.emit('checking');
    try {
      const response = await fetch(`${this.updateUrl}/update/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentVersion: this.currentVersion, channel: this.channel }),
      });
      if (!response.ok) throw new Error(`Update check failed: ${response.status}`);
      const data = await response.json() as UpdateInfo;
      if (data.version && data.version !== this.currentVersion) {
        this.emit('available', data);
        return data;
      }
      this.emit('not-available');
      return null;
    } catch (err) {
      this.emit('error', err);
      return null;
    }
  }

  async downloadUpdate(info: UpdateInfo, dest: string, onProgress?: (percent: number) => void): Promise<string> {
    this.emit('downloading');
    const downloader = new (require('./resumable-download').ResumableDownload)();
    await downloader.download({ url: info.url, dest, onProgress });
    this.emit('downloaded', dest);
    return dest;
  }

  async verifyUpdate(filePath: string, signature: string): Promise<boolean> {
    const verifier = new (require('./update-verifier').UpdateVerifier)();
    const result = await verifier.verifySha512(filePath, signature);
    return result;
  }

  async installUpdate(filePath: string): Promise<void> {
    this.emit('installing');
    const { execSync } = await import('child_process');
    execSync(`"${filePath}"`, { timeout: 300000 });
  }
}
