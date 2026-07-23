import {
  ChannelType,
  ChannelConfig,
  Notification,
  NotificationChannel,
  NotificationSeverity,
  ToastConfig,
  BannerConfig,
  BadgeConfig,
  DesktopConfig,
  WebhookConfig,
  CliConfig,
  DEFAULT_TOAST_CONFIG,
  DEFAULT_BANNER_CONFIG,
  DEFAULT_BADGE_CONFIG,
  DEFAULT_DESKTOP_CONFIG,
  DEFAULT_WEBHOOK_CONFIG,
  DEFAULT_CLI_CONFIG,
  SEVERITY_DURATION,
  SEVERITY_COLOR,
} from './types';

let notificationCounter = 0;

function _nextId(): string {
  notificationCounter++;
  return `n-${Date.now()}-${notificationCounter}`;
}

abstract class BaseChannel implements NotificationChannel {
  abstract readonly type: ChannelType;
  protected enabled = true;

  abstract send(notification: Notification): Promise<boolean>;
  abstract configure(config: ChannelConfig): void;

  isAvailable(): boolean {
    return this.enabled;
  }
}

export class ToastChannel extends BaseChannel {
  readonly type = ChannelType.Toast;
  private config: ToastConfig = { ...DEFAULT_TOAST_CONFIG };

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<ToastConfig>) };
    this.enabled = true;
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.enabled) return false;

    const duration = SEVERITY_DURATION[notification.severity] ?? this.config.autoDismissMs;
    const color = this.getColorClass(notification.severity);

    if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
      const event = new CustomEvent('ideia:toast', {
        detail: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          color,
          duration,
          position: this.config.position,
          action: notification.action,
        },
      });
      document.dispatchEvent(event);
    }

    return true;
  }

  private getColorClass(severity: NotificationSeverity): string {
    switch (severity) {
      case NotificationSeverity.Success:
        return '#4caf50';
      case NotificationSeverity.Warning:
        return '#ff9800';
      case NotificationSeverity.Error:
      case NotificationSeverity.Critical:
        return '#f44336';
      default:
        return '#2196f3';
    }
  }
}

export class BannerChannel extends BaseChannel {
  readonly type = ChannelType.Banner;
  private config: BannerConfig = { ...DEFAULT_BANNER_CONFIG };

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<BannerConfig>) };
    this.enabled = true;
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.enabled) return false;

    if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
      const event = new CustomEvent('ideia:banner', {
        detail: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          persistent: this.config.persistent,
          dismissible: this.config.dismissible,
          priority: this.config.priority,
          action: notification.action,
          metadata: notification.metadata,
        },
      });
      document.dispatchEvent(event);
    }

    return true;
  }
}

export class BadgeChannel extends BaseChannel {
  readonly type = ChannelType.Badge;
  private config: BadgeConfig = { ...DEFAULT_BADGE_CONFIG };
  private counts: Record<string, number> = {};

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<BadgeConfig>) };
    this.enabled = true;
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.enabled) return false;

    const category = notification.source ?? 'general';
    this.counts[category] = (this.counts[category] ?? 0) + 1;

    if (this.config.showCount) {
      const total = Object.values(this.counts).reduce((a, b) => a + b, 0);
      const displayCount = Math.min(total, this.config.maxCount);

      if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
        const event = new CustomEvent('ideia:badge', {
          detail: {
            id: notification.id,
            counts: { ...this.counts },
            total: displayCount,
            color: this.config.color,
            severity: notification.severity,
          },
        });
        document.dispatchEvent(event);
      }

      if (typeof __VSCODE_BADGE__ !== 'undefined') {
        __VSCODE_BADGE__({ badge: `IDEIA: ${displayCount}`, tooltip: notification.title });
      }
    }

    return true;
  }

  resetCount(category?: string): void {
    if (category) {
      delete this.counts[category];
    } else {
      this.counts = {};
    }
  }
}

export class DesktopChannel extends BaseChannel {
  readonly type = ChannelType.Desktop;
  private config: DesktopConfig = { ...DEFAULT_DESKTOP_CONFIG };
  private permissionGranted = false;

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<DesktopConfig>) };
    this.enabled = true;
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.enabled) return false;

    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        this.showNotification(notification);
        return true;
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.showNotification(notification);
          return true;
        }
      }
    }

    if (typeof process !== 'undefined' && process.versions?.electron) {
      this.sendElectronNotification(notification);
      return true;
    }

    return false;
  }

  private showNotification(notification: Notification): void {
    const options: globalThis.NotificationOptions = {
      body: notification.message,
      tag: this.config.tag,
      silent: this.config.silent,
      requireInteraction:
        this.config.requireInteraction ||
        notification.severity === NotificationSeverity.Critical,
    };

    if (this.config.icon) {
      options.icon = this.config.icon;
    }

    const n = new globalThis.Notification(notification.title, options);

    if (notification.action) {
      n.onclick = () => {
        n.close();
      };
    }
  }

  private sendElectronNotification(notification: Notification): void {
    try {
      const { Notification: ElectronNotification } = require('electron');
      new ElectronNotification({
        title: notification.title,
        body: notification.message,
        urgency: notification.severity === NotificationSeverity.Critical ? 'critical' : 'normal',
      });
    } catch {
    }
  }
}

export class WebhookChannel extends BaseChannel {
  readonly type = ChannelType.Webhook;
  private config: WebhookConfig = { ...DEFAULT_WEBHOOK_CONFIG };

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<WebhookConfig>) };
    if (this.config.url) {
      this.enabled = true;
    }
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.enabled || !this.config.url) return false;

    const payload = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      level: notification.level,
      timestamp: notification.timestamp.toISOString(),
      source: notification.source,
      action: notification.action,
      metadata: notification.metadata,
    };

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(this.config.url, {
          method: this.config.method,
          headers: this.config.headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) return true;
      } catch {
        if (attempt === this.config.retries) return false;
      }
    }

    return false;
  }
}

export class CliChannel extends BaseChannel {
  readonly type = ChannelType.Cli;
  private config: CliConfig = { ...DEFAULT_CLI_CONFIG };

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<CliConfig>) };
    this.enabled = true;
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.enabled) return false;

    const parts: string[] = [];

    if (this.config.showTimestamp) {
      parts.push(`[${notification.timestamp.toISOString()}]`);
    }

    parts.push(this.config.prefix);

    if (this.config.useColors) {
      const color = SEVERITY_COLOR[notification.severity] ?? '\x1b[0m';
      const icon = this.getSeverityIcon(notification.severity);
      parts.push(`${color}${icon}${notification.title}\x1b[0m`);
    } else {
      const icon = this.getSeverityIcon(notification.severity);
      parts.push(`${icon}${notification.title}`);
    }

    parts.push(notification.message);

    console.log(parts.join(' '));
    return true;
  }

  private getSeverityIcon(severity: NotificationSeverity): string {
    switch (severity) {
      case NotificationSeverity.Success:
        return '✓ ';
      case NotificationSeverity.Warning:
        return '⚠ ';
      case NotificationSeverity.Error:
        return '✗ ';
      case NotificationSeverity.Critical:
        return '‼ ';
      case NotificationSeverity.Info:
        return 'ℹ ';
    }
  }
}

declare const __VSCODE_BADGE__: ((opts: { badge: string; tooltip: string }) => void) | undefined;
