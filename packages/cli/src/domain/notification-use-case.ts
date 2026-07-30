import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
const logger = createLogger('notification-use-case');

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationChannel = 'console' | 'file' | 'webhook' | 'desktop';

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  source: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byPriority: Record<NotificationPriority, number>;
  byChannel: Record<NotificationChannel, number>;
}

export class NotificationUseCase {
  private notifications: Map<string, Notification> = new Map();
  private maxNotifications = 500;

  send(title: string, message: string, priority: NotificationPriority, source: string, channel?: NotificationChannel): CliCommandResult<Notification> {
    try {
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title,
        message,
        priority,
        channel: channel ?? 'console',
        source,
        read: false,
        createdAt: new Date().toISOString(),
      };

      this.notifications.set(notification.id, notification);

      if (this.notifications.size > this.maxNotifications) {
        const oldest = Array.from(this.notifications.keys())
          .sort((a, b) => (this.notifications.get(a)?.createdAt ?? '').localeCompare(this.notifications.get(b)?.createdAt ?? ''))
          .slice(0, this.notifications.size - this.maxNotifications);
        for (const key of oldest) {
          this.notifications.delete(key);
        }
      }

      return success(`Notification sent: "${title}"`, notification);
    } catch (err) {
      return failure(`Failed to send notification: ${err instanceof Error ? err.message : String(err)}`) as CliCommandResult<Notification>;
    }
  }

  markAsRead(notificationId: string): CliCommandResult<Notification> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return failure(`Notification not found: ${notificationId}`, 1) as CliCommandResult<Notification>;

    notification.read = true;
    notification.readAt = new Date().toISOString();
    this.notifications.set(notificationId, notification);

    return success('Notification marked as read', notification);
  }

  markAllAsRead(): CliCommandResult<number> {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        count++;
      }
    }
    return success(`Marked ${count} notifications as read`, count);
  }

  listNotifications(unreadOnly?: boolean): CliCommandResult<Notification[]> {
    const all = Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const filtered = unreadOnly ? all.filter(n => !n.read) : all;
    return success(`Found ${filtered.length} notifications`, filtered);
  }

  getStats(): CliCommandResult<NotificationStats> {
    const all = Array.from(this.notifications.values());
    const unread = all.filter(n => !n.read);

    const byPriority: Record<NotificationPriority, number> = {
      low: 0, medium: 0, high: 0, critical: 0,
    };
    const byChannel: Record<NotificationChannel, number> = {
      console: 0, file: 0, webhook: 0, desktop: 0,
    };

    for (const n of all) {
      byPriority[n.priority]++;
      byChannel[n.channel]++;
    }

    return success('Notification stats', {
      total: all.length,
      unread: unread.length,
      byPriority,
      byChannel,
    });
  }

  clearAll(): CliCommandResult<void> {
    const count = this.notifications.size;
    this.notifications.clear();
    return success(`Cleared ${count} notifications`);
  }
}

export function createNotificationUseCase(): NotificationUseCase {
  return new NotificationUseCase();
}
