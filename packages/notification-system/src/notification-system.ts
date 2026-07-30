import { EventBus } from '@ideia/event-bus';
import { Logger } from '@ideia/logger';
import {
  ChannelType,
  ChannelConfig as _ChannelConfig,
  ChannelConfigMap,
  Notification,
  NotificationChannel,
  NotificationLevel,
  NotificationSeverity,
} from './types';
import {
  ToastChannel,
  BannerChannel,
  BadgeChannel,
  DesktopChannel,
  WebhookChannel,
  CliChannel,
} from './channels';

const SEVERITY_LEVEL_MAP: Record<NotificationLevel, NotificationSeverity[]> = {
  [NotificationLevel.All]: [
    NotificationSeverity.Info,
    NotificationSeverity.Success,
    NotificationSeverity.Warning,
    NotificationSeverity.Error,
    NotificationSeverity.Critical,
  ],
  [NotificationLevel.Important]: [
    NotificationSeverity.Warning,
    NotificationSeverity.Error,
    NotificationSeverity.Critical,
  ],
  [NotificationLevel.Critical]: [
    NotificationSeverity.Critical,
  ],
};

import { NotificationStats, NotificationFilter } from './types';

export class NotificationSystem {
  private channels: Map<ChannelType, NotificationChannel> = new Map();
  private history: Notification[] = [];
  private eventBus?: EventBus;
  private logger?: Logger;
  private maxHistory: number;
  private level: NotificationLevel = NotificationLevel.All;
  private dedupWindowMs: number = 5000;
  private recentMessages: Map<string, number> = new Map();

  constructor(
    options?: {
      eventBus?: EventBus;
      logger?: Logger;
      maxHistory?: number;
      dedupWindowMs?: number;
    },
  ) {
    this.maxHistory = options?.maxHistory ?? 500;
    this.dedupWindowMs = options?.dedupWindowMs ?? 5000;
    this.eventBus = options?.eventBus;
    this.logger = options?.logger;

    this.registerDefaultChannels();
  }

  private registerDefaultChannels(): void {
    this.channels.set(ChannelType.Toast, new ToastChannel());
    this.channels.set(ChannelType.Banner, new BannerChannel());
    this.channels.set(ChannelType.Badge, new BadgeChannel());
    this.channels.set(ChannelType.Desktop, new DesktopChannel());
    this.channels.set(ChannelType.Webhook, new WebhookChannel());
    this.channels.set(ChannelType.Cli, new CliChannel());
  }

  private shouldSend(notification: Notification): boolean {
    const severities = SEVERITY_LEVEL_MAP[notification.level] ?? SEVERITY_LEVEL_MAP[NotificationLevel.All];
    return severities.includes(notification.severity);
  }

  private isDuplicate(notification: Notification, channel: ChannelType): boolean {
    const key = `${channel}:${notification.message}`;
    const lastSent = this.recentMessages.get(key);
    const now = Date.now();
    if (lastSent && (now - lastSent) < this.dedupWindowMs) return true;
    this.recentMessages.set(key, now);
    return false;
  }

  async notify(
    notification: Omit<Notification, 'id' | 'timestamp'>,
    channels?: ChannelType[],
  ): Promise<Notification> {
    const full: Notification = {
      ...notification,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    };

    if (!this.shouldSend(full)) {
      return full;
    }

    this.addToHistory(full);

    const targetChannels = channels ?? [ChannelType.Toast, ChannelType.Cli];

    const results = await Promise.allSettled(
      targetChannels.map(async (ch) => {
        const channel = this.channels.get(ch);
        if (!channel || !channel.isAvailable()) return;
        if (this.isDuplicate(full, ch)) return;
        return channel.send(full);
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger?.error('Notification channel failed', { error: result.reason });
      }
    }

    if (this.eventBus) {
      await this.eventBus.emit({ type: 'notification.sent', source: 'notification-system', payload: { notification: full, channels: targetChannels } });
    }

    return full;
  }

  configureChannel<T extends ChannelType>(
    channel: T,
    config: ChannelConfigMap[T],
  ): void {
    const instance = this.channels.get(channel);
    if (instance) {
      instance.configure(config);
      this.logger?.info(`Channel ${channel} configured`, { config });
    }
  }

  getHistory(limit?: number): Notification[] {
    const items = limit ?? this.maxHistory;
    return this.history.slice(-items);
  }

  registerChannel(type: ChannelType, channel: NotificationChannel): void {
    this.channels.set(type, channel);
  }

  getChannel(type: ChannelType): NotificationChannel | undefined {
    return this.channels.get(type);
  }

  getAvailableChannels(): ChannelType[] {
    return Array.from(this.channels.entries())
      .filter(([, ch]) => ch.isAvailable())
      .map(([type]) => type);
  }

  clearHistory(): void {
    this.history = [];
  }

  getUnreadCount(): number {
    return this.history.length;
  }

  markAllRead(): void {
    const now = new Date();
    for (const n of this.history) {
      n.metadata = { ...n.metadata, readAt: now.toISOString() };
    }
  }

  dismiss(id: string): boolean {
    const idx = this.history.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.history.splice(idx, 1);
      return true;
    }
    return false;
  }

  setLevel(level: NotificationLevel): void {
    this.level = level;
  }

  getLevel(): NotificationLevel {
    return this.level;
  }

  getStats(): NotificationStats {
    const bySeverity: Record<NotificationSeverity, number> = {
      [NotificationSeverity.Info]: 0,
      [NotificationSeverity.Success]: 0,
      [NotificationSeverity.Warning]: 0,
      [NotificationSeverity.Error]: 0,
      [NotificationSeverity.Critical]: 0,
    };
    const byChannel: Record<ChannelType, number> = {
      [ChannelType.Toast]: 0,
      [ChannelType.Banner]: 0,
      [ChannelType.Badge]: 0,
      [ChannelType.Desktop]: 0,
      [ChannelType.Webhook]: 0,
      [ChannelType.Cli]: 0,
    };
    for (const n of this.history) {
      bySeverity[n.severity] = (bySeverity[n.severity] || 0) + 1;
    }
    for (const [ch] of this.channels) {
      byChannel[ch] = this.history.filter(n => n.source?.startsWith(ch)).length;
    }
    return {
      total: this.history.length,
      unread: this.getUnreadCount(),
      bySeverity,
      byChannel,
    };
  }

  getFilteredNotifications(filter: NotificationFilter): Notification[] {
    return this.history.filter(n => {
      if (filter.severity && n.severity !== filter.severity) return false;
      if (filter.source && n.source !== filter.source) return false;
      if (filter.startDate && n.timestamp < filter.startDate) return false;
      if (filter.endDate && n.timestamp > filter.endDate) return false;
      if (filter.searchText && !n.message.toLowerCase().includes(filter.searchText.toLowerCase())) return false;
      return true;
    });
  }

  private addToHistory(notification: Notification): void {
    this.history.push(notification);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }
}
