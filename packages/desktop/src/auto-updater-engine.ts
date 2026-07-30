import { createLogger } from '@ideia/logger';
import { AutoUpdateConfig, UpdateInfo } from './types';

const logger = createLogger('auto-updater');

export class AutoUpdaterEngine {
  private config: AutoUpdateConfig;
  private currentVersion: string;
  private downloadedUpdate: UpdateInfo | null;
  private updateHistory: string[];

  constructor(config: AutoUpdateConfig, currentVersion?: string) {
    this.config = config;
    this.currentVersion = currentVersion ?? '0.0.0';
    this.downloadedUpdate = null;
    this.updateHistory = [];
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  getConfig(): AutoUpdateConfig {
    return { ...this.config };
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (!this.config.enabled) {
      logger.info('Auto-update disabled, skipping check');
      return null;
    }
    logger.info('Checking for updates', { currentVersion: this.currentVersion, channel: this.config.channel });

    const update: UpdateInfo = {
      version: '1.0.0',
      releaseDate: new Date().toISOString(),
      releaseNotes: 'New version available',
      downloadUrl: `https://releases.ideia.dev/download/${this.currentVersion}`,
      mandatory: this.config.mandatory ?? false,
      checksum: '',
      checksumType: 'sha256',
    };
    return update;
  }

  async downloadUpdate(update: UpdateInfo): Promise<void> {
    logger.info('Downloading update', { version: update.version });
    this.downloadedUpdate = update;
  }

  async installUpdate(update: UpdateInfo): Promise<void> {
    if (!this.downloadedUpdate || this.downloadedUpdate.version !== update.version) {
      logger.error('Update not downloaded', { version: update.version });
      return;
    }
    logger.info('Installing update', { version: update.version });
    this.updateHistory.push(this.currentVersion);
    this.currentVersion = update.version;
    this.downloadedUpdate = null;
  }

  async rollbackTo(version: string): Promise<boolean> {
    if (!this.updateHistory.includes(version)) {
      logger.error('Version not in update history', { version });
      return false;
    }
    logger.info('Rolling back', { from: this.currentVersion, to: version });
    this.currentVersion = version;
    return true;
  }

  getUpdateHistory(): string[] {
    return [...this.updateHistory];
  }

  isDownloaded(): boolean {
    return this.downloadedUpdate !== null;
  }
}
