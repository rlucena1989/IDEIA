import {
  ChannelType,
  ChannelConfig,
  Notification,
  NotificationChannel,
  NotificationSeverity,
  DesktopConfig,
  DEFAULT_DESKTOP_CONFIG,
} from '../types';
import { createLogger } from '@ideia/logger';

const logger = createLogger('notification-system:electron-channel');

export class ElectronChannel implements NotificationChannel {
  readonly type = ChannelType.Desktop;
  private config: DesktopConfig = { ...DEFAULT_DESKTOP_CONFIG };

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<DesktopConfig>) };
  }

  isAvailable(): boolean {
    if (typeof process !== 'undefined' && process.versions?.electron) {
      return true;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return true;
    }
    return false;
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.info('ElectronChannel not available, falling back to console');
      this.fallbackToConsole(notification);
      return false;
    }

    try {
      if (typeof process !== 'undefined' && process.versions?.electron) {
        this.sendElectronNotification(notification);
        return true;
      }

      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          this.sendBrowserNotification(notification);
          return true;
        }
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            this.sendBrowserNotification(notification);
            return true;
          }
        }
      }

      this.fallbackToConsole(notification);
      return false;
    } catch (err) {
      logger.error('Failed to send desktop notification', { error: err });
      this.fallbackToConsole(notification);
      return false;
    }
  }

  private sendElectronNotification(notification: Notification): void {
    try {
      const { Notification: ElectronNotification } = require('electron');
      new ElectronNotification({
        title: notification.title,
        body: notification.message,
        urgency: notification.severity === NotificationSeverity.Critical ? 'critical' : 'normal',
        silent: this.config.silent,
      });
    } catch {
      this.fallbackToConsole(notification);
    }
  }

  private sendBrowserNotification(notification: Notification): void {
    const options: globalThis.NotificationOptions = {
      body: notification.message,
      tag: this.config.tag,
      silent: this.config.silent,
      requireInteraction:
        this.config.requireInteraction ||
        notification.severity === NotificationSeverity.Critical,
    };

    const n = new globalThis.Notification(notification.title, options);

    if (notification.action) {
      n.onclick = () => {
        n.close();
      };
    }
  }

  private fallbackToConsole(notification: Notification): void {
    const icon = this.getSeverityIcon(notification.severity);
    logger.info(`[IDEIA] ${icon} ${notification.title}: ${notification.message}`);
  }

  private getSeverityIcon(severity: NotificationSeverity): string {
    switch (severity) {
      case NotificationSeverity.Success: return '✓';
      case NotificationSeverity.Warning: return '⚠';
      case NotificationSeverity.Error: return '✗';
      case NotificationSeverity.Critical: return '‼';
      case NotificationSeverity.Info: return 'ℹ';
    }
  }
}
