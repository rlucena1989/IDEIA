import { Notification, NotificationSeverity } from './types';
import { createLogger } from '@ideia/logger';
import { RateLimiter } from './rate-limiter';
export { RateLimitConfig } from './rate-limiter';
const logger = createLogger('notification-center');

export interface NotificationCenterConfig {
  maxHistory: number;
  rateLimit: {
    maxNotifications: number;
    windowMs: number;
  };
}

export class NotificationCenter {
  private history: Notification[] = [];
  private rateLimiter: RateLimiter;
  private config: NotificationCenterConfig;

  constructor(config?: Partial<NotificationCenterConfig>) {
    this.config = {
      maxHistory: config?.maxHistory ?? 100,
      rateLimit: config?.rateLimit ?? { maxNotifications: 5, windowMs: 60000 },
    };
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
  }

  add(notification: Notification): boolean {
    if (!this.rateLimiter.canSend(notification)) {
      return false;
    }

    this.history.push(notification);
    if (this.history.length > this.config.maxHistory) {
      this.history = this.history.slice(-this.config.maxHistory);
    }
    return true;
  }

  getHistory(limit?: number): Notification[] {
    const items = limit ?? this.config.maxHistory;
    return this.history.slice(-items);
  }

  getHistoryBySeverity(severity: NotificationSeverity): Notification[] {
    return this.history.filter(n => n.severity === severity);
  }

  getHistoryBySource(source: string): Notification[] {
    return this.history.filter(n => n.source === source);
  }

  clearHistory(): void {
    this.history = [];
    this.rateLimiter.reset();
  }

  dismiss(id: string): boolean {
    const index = this.history.findIndex(n => n.id === id);
    if (index !== -1) {
      this.history.splice(index, 1);
      return true;
    }
    return false;
  }

  dismissAll(): void {
    this.history = [];
  }

  getUnreadCount(): number {
    return this.history.length;
  }

  markAllRead(): void {
    const now = new Date().toISOString();
    for (const n of this.history) {
      n.metadata = { ...n.metadata, readAt: now };
    }
  }

  getBySeverity(severity: NotificationSeverity): Notification[] {
    return this.history.filter(n => n.severity === severity);
  }

  getByChannel(channel: string): Notification[] {
    return this.history.filter(n => n.source === channel || n.source?.startsWith(channel));
  }

  getRateLimitStatus(): {
    remaining: number;
    resetTime: Date;
  } {
    return {
      remaining: this.rateLimiter.getRemainingCount(),
      resetTime: this.rateLimiter.getResetTime(),
    };
  }

  configure(config: Partial<NotificationCenterConfig>): void {
    if (config.maxHistory) {
      this.config.maxHistory = config.maxHistory;
      if (this.history.length > this.config.maxHistory) {
        this.history = this.history.slice(-this.config.maxHistory);
      }
    }
    if (config.rateLimit) {
      this.config.rateLimit = config.rateLimit;
      this.rateLimiter.configure(config.rateLimit);
    }
  }
}
