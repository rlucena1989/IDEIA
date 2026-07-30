import { createLogger } from '@ideia/logger';
import { TrayMenuConfig, TrayMenuItem } from './types';

const logger = createLogger('tray-manager');

export class TrayManager {
  private config: TrayMenuConfig;
  private active: boolean;

  constructor(config: TrayMenuConfig) {
    this.config = {
      tooltip: '',
      ...config,
    };
    this.active = false;
  }

  createTray(): void {
    this.active = true;
    logger.info('Tray created', { items: this.config.items.length, tooltip: this.config.tooltip });
  }

  updateMenu(items: TrayMenuItem[]): void {
    this.config.items = items;
    logger.info('Tray menu updated', { items: items.length });
  }

  showNotification(title: string, body: string): void {
    logger.info('Notification shown', { title, body });
  }

  destroy(): void {
    this.active = false;
    logger.info('Tray destroyed');
  }

  isActive(): boolean {
    return this.active;
  }

  getConfig(): TrayMenuConfig {
    return {
      items: [...this.config.items],
      tooltip: this.config.tooltip,
      icon: this.config.icon,
    };
  }
}
