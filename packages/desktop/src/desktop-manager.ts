import { createLogger } from '@ideia/logger';
import {
  AppConfig, DesktopPlatform, DesktopShellType,
} from './types';

const logger = createLogger('desktop-manager');

export class DesktopManager {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    logger.info('DesktopManager initialized', { shell: config.shell, version: config.version });
  }

  initialize(): void {
    logger.info('Initializing desktop shell', { shell: this.config.shell });
    if (this.config.autoUpdate?.enabled) {
      logger.info('Auto-update enabled', { provider: this.config.autoUpdate.provider });
    }
  }

  launch(): void {
    logger.info('Launching application', { name: this.config.name, version: this.config.version });
  }

  quit(): void {
    logger.info('Quitting application');
  }

  restart(): void {
    logger.info('Restarting application');
    this.quit();
    this.launch();
  }

  getShellRecommendation(): DesktopShellType {
    return 'electron';
  }

  getPlatformConfig(): DesktopPlatform {
    const platformRaw = typeof process !== 'undefined' ? process.platform : 'win32';
    if (platformRaw === 'darwin') return 'darwin';
    if (platformRaw === 'linux') return 'linux';
    return 'win32';
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<AppConfig>): void {
    this.config = { ...this.config, ...partial };
    logger.info('Config updated', { shell: this.config.shell });
  }
}
