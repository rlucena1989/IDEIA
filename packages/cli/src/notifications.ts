import { createLogger } from '@ideia/logger';
const logger = createLogger('notifications');

export type NotificationChannel = 'console' | 'webhook' | 'slack' | 'email';
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';
export type NotificationEvent = 'deploy.started' | 'deploy.completed' | 'deploy.failed'
  | 'agent.task.completed' | 'agent.task.failed' | 'policy.violated'
  | 'checkpoint.approved' | 'checkpoint.rejected' | 'quality.gate.failed'
  | 'system.error' | 'system.maintenance';

export interface Notification {
  id: string;
  event: NotificationEvent;
  title: string;
  message: string;
  severity: NotificationSeverity;
  channel: NotificationChannel;
  timestamp: string;
  metadata?: Record<string, unknown>;
  read: boolean;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: NotificationEvent[];
  retries?: number;
  timeout?: number;
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  events: NotificationEvent[];
  minSeverity?: NotificationSeverity;
}

export interface NotificationChannelConfig {
  webhooks?: WebhookConfig[];
  slack?: SlackConfig[];
}

export class NotificationService {
  private notifications: Notification[] = [];
  private maxHistory = 1000;
  private config: NotificationChannelConfig;
  private listeners: Array<(n: Notification) => void> = [];

  constructor(config?: NotificationChannelConfig) {
    this.config = config ?? {};
  }

  setConfig(config: NotificationChannelConfig): void { this.config = config; }

  onNotification(listener: (n: Notification) => void): void { this.listeners.push(listener); }

  async send(event: NotificationEvent, title: string, message: string, severity: NotificationSeverity = 'info', metadata?: Record<string, unknown>): Promise<Notification> {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event, title, message, severity, channel: 'console',
      timestamp: new Date().toISOString(), metadata, read: false,
    };

    this.notifications.push(notification);
    if (this.notifications.length > this.maxHistory) this.notifications.shift();

    logger.info('[${severity.toUpperCase()}] ${title}: ${message}');

    for (const listener of this.listeners) listener(notification);

    await this.deliverWebhooks(notification);
    await this.deliverSlack(notification);

    return notification;
  }

  private async deliverWebhooks(n: Notification): Promise<void> {
    if (!this.config.webhooks) return;
    for (const wh of this.config.webhooks) {
      if (!wh.events.includes(n.event)) continue;
      try {
        await fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: n.event, title: n.title, message: n.message,
            severity: n.severity, timestamp: n.timestamp, metadata: n.metadata,
          }),
          signal: AbortSignal.timeout(wh.timeout ?? 5000),
        });
      } catch {}
    }
  }

  private async deliverSlack(n: Notification): Promise<void> {
    if (!this.config.slack) return;
    const severityEmoji: Record<NotificationSeverity, string> = { info: 'ℹ️', warning: '⚠️', error: '❌', critical: '🚨' };
    const emoji = severityEmoji[n.severity] ?? 'ℹ️';

    for (const sl of this.config.slack) {
      if (!sl.events.includes(n.event)) continue;
      if (sl.minSeverity) {
        const levels: NotificationSeverity[] = ['info', 'warning', 'error', 'critical'];
        if (levels.indexOf(n.severity) < levels.indexOf(sl.minSeverity)) continue;
      }
      try {
        const blocks = [
          { type: 'header', text: { type: 'plain_text', text: `${emoji} ${n.title}` } },
          { type: 'section', text: { type: 'mrkdwn', text: n.message } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `*Evento:* ${n.event} • *Severidade:* ${n.severity}` }] },
        ];
        await fetch(sl.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: sl.channel, blocks, text: n.title }),
        });
      } catch {}
    }
  }

  list(severity?: NotificationSeverity): Notification[] {
    if (severity) return this.notifications.filter(n => n.severity === severity);
    return [...this.notifications];
  }

  markRead(id: string): boolean {
    const n = this.notifications.find(n => n.id === id);
    if (!n) return false;
    n.read = true;
    return true;
  }

  markAllRead(): void { this.notifications.forEach(n => n.read = true); }
  clear(): void { this.notifications = []; }
  count(): number { return this.notifications.length; }
  unreadCount(): number { return this.notifications.filter(n => !n.read).length; }
}

export function createNotificationService(config?: NotificationChannelConfig): NotificationService {
  return new NotificationService(config);
}
