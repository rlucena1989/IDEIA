import * as crypto from 'crypto';
import { NotificationSystem } from './notification-system';
import { NotificationCenter } from './notification-center';
import {
  Notification,
  NotificationSeverity,
  NotificationLevel,
  ChannelType,
  NotificationChannel,
  NotificationStats,
} from './types';
import { createLogger } from '@ideia/logger';

const logger = createLogger('notification-system:manager');

export interface NotificationManagerConfig {
  maxHistory: number;
  rateLimit: {
    maxNotifications: number;
    windowMs: number;
  };
  defaultChannels: ChannelType[];
}

const DEFAULT_CONFIG: NotificationManagerConfig = {
  maxHistory: 500,
  rateLimit: { maxNotifications: 5, windowMs: 60000 },
  defaultChannels: [ChannelType.Toast, ChannelType.Cli],
};

export class NotificationManager {
  private system: NotificationSystem;
  private center: NotificationCenter;
  private config: NotificationManagerConfig;

  constructor(
    system?: NotificationSystem,
    center?: NotificationCenter,
    config?: Partial<NotificationManagerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.system = system ?? new NotificationSystem();
    this.center = center ?? new NotificationCenter({
      maxHistory: this.config.maxHistory,
      rateLimit: this.config.rateLimit,
    });
  }

  async send(
    title: string,
    message: string,
    severity: NotificationSeverity = NotificationSeverity.Info,
    options?: {
      level?: NotificationLevel;
      source?: string;
      channels?: ChannelType[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<Notification | null> {
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      title,
      message,
      severity,
      level: options?.level ?? NotificationLevel.All,
      source: options?.source,
      metadata: options?.metadata,
    };

    const withId: Notification = { ...notification, id: crypto.randomUUID(), timestamp: new Date() };

    if (!this.center.add(withId)) {
      logger.warn('Rate limit exceeded, notification dropped', { title, severity });
      return null;
    }

    await this.system.notify(
      notification,
      options?.channels ?? this.config.defaultChannels,
    );

    return withId;
  }

  getHistory(limit?: number): Notification[] {
    return this.center.getHistory(limit);
  }

  getHistoryBySeverity(severity: NotificationSeverity): Notification[] {
    return this.center.getHistoryBySeverity(severity);
  }

  getHistoryBySource(source: string): Notification[] {
    return this.center.getHistoryBySource(source);
  }

  dismiss(id: string): boolean {
    return this.center.dismiss(id);
  }

  dismissAll(): void {
    this.center.dismissAll();
  }

  clear(): void {
    this.center.clearHistory();
  }

  getRateLimitStatus(): { remaining: number; resetTime: Date } {
    return this.center.getRateLimitStatus();
  }

  registerChannel(type: ChannelType, channel: NotificationChannel): void {
    this.system.registerChannel(type, channel);
  }

  configure(config: Partial<NotificationManagerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.maxHistory || config.rateLimit) {
      this.center.configure({
        maxHistory: config.maxHistory,
        rateLimit: config.rateLimit,
      });
    }
  }

  getUnreadCount(): number {
    return this.center.getUnreadCount();
  }

  markAllRead(): void {
    this.system.markAllRead();
  }

  registerDefaultChannels(): void {
    this.registerChannel(ChannelType.Toast, new (require('./channels').ToastChannel)());
    this.registerChannel(ChannelType.Banner, new (require('./channels').BannerChannel)());
    this.registerChannel(ChannelType.Badge, new (require('./channels').BadgeChannel)());
    this.registerChannel(ChannelType.Desktop, new (require('./channels').DesktopChannel)());
    this.registerChannel(ChannelType.Webhook, new (require('./channels').WebhookChannel)());
    this.registerChannel(ChannelType.Cli, new (require('./channels').CliChannel)());
  }

  getStats(): NotificationStats {
    return this.system.getStats();
  }
}
