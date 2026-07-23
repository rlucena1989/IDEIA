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

export class NotificationSystem {
  private channels: Map<ChannelType, NotificationChannel> = new Map();
  private history: Notification[] = [];
  private eventBus?: EventBus;
  private logger?: Logger;
  private maxHistory: number;

  constructor(
    options?: {
      eventBus?: EventBus;
      logger?: Logger;
      maxHistory?: number;
    },
  ) {
    this.maxHistory = options?.maxHistory ?? 500;
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

  private addToHistory(notification: Notification): void {
    this.history.push(notification);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }
}
