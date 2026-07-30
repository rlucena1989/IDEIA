import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { NotificationItem, NotificationManager, MessageAction } from './types';

export class DefaultNotificationManager implements NotificationManager {
  private notifications: NotificationItem[] = [];
  private onAddedEmitter = new Emitter<NotificationItem>();
  private onDismissedEmitter = new Emitter<string>();

  get onNotificationAdded() { return this.onAddedEmitter.event; }
  get onNotificationDismissed() { return this.onDismissedEmitter.event; }

  add(item: Omit<NotificationItem, 'id' | 'timestamp' | 'dismissed'>): string {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const notification: NotificationItem = {
      ...item,
      id,
      timestamp: Date.now(),
      dismissed: false,
    };
    this.notifications.push(notification);
    this.onAddedEmitter.fire(notification);
    return id;
  }

  dismiss(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.dismissed = true;
      this.onDismissedEmitter.fire(id);
    }
  }

  dismissAll(): void {
    for (const notif of this.notifications) {
      notif.dismissed = true;
    }
  }

  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.dismissed).length;
  }
}
