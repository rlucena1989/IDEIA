import {
  ChannelType,
  ChannelConfig,
  Notification,
  NotificationChannel,
  NotificationSeverity,
  ToastConfig,
  DEFAULT_TOAST_CONFIG,
  SEVERITY_DURATION,
} from '../types';
import { createLogger } from '@ideia/logger';

const logger = createLogger('notification-system:theia-channel');

export class TheiaChannel implements NotificationChannel {
  readonly type = ChannelType.Toast;
  private config: ToastConfig = { ...DEFAULT_TOAST_CONFIG };

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...(config as Partial<ToastConfig>) };
  }

  isAvailable(): boolean {
    return typeof document !== 'undefined';
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.isAvailable()) return false;

    const duration = SEVERITY_DURATION[notification.severity] ?? this.config.autoDismissMs;

    try {
      if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
        document.dispatchEvent(new CustomEvent('ideia:notification:theia', {
          detail: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            severity: notification.severity,
            source: notification.source,
            duration,
            position: this.config.position,
            action: notification.action,
            metadata: notification.metadata,
          },
        }));
      }

      if (typeof (globalThis as Record<string, unknown>).IDEIA_NotificationService !== 'undefined') {
        const service = (globalThis as Record<string, unknown>).IDEIA_NotificationService as {
          show: (opts: Record<string, unknown>) => void;
        };
        service.show({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          duration,
        });
      }

      return true;
    } catch (err) {
      logger.error('TheiaChannel send failed', { error: err });
      return false;
    }
  }

  private getSeverityColor(severity: NotificationSeverity): string {
    switch (severity) {
      case NotificationSeverity.Success: return 'var(--theia-successForeground)';
      case NotificationSeverity.Warning: return 'var(--theia-warningForeground)';
      case NotificationSeverity.Error:
      case NotificationSeverity.Critical: return 'var(--theia-errorForeground)';
      default: return 'var(--theia-infoForeground)';
    }
  }
}
