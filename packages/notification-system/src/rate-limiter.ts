import { Notification } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('rate-limiter');

export interface RateLimitConfig {
  maxNotifications: number;
  windowMs: number;
}

export class RateLimiter {
  private notifications: Notification[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxNotifications: 5, windowMs: 60000 }) {
    this.config = config;
  }

  canSend(notification: Notification): boolean {
    const now = Date.now();
    
    // Remove notificações fora da janela de tempo
    this.notifications = this.notifications.filter(
      n => n.timestamp.getTime() > now - this.config.windowMs
    );

    if (this.notifications.length < this.config.maxNotifications) {
      this.notifications.push(notification);
      return true;
    }

    return false;
  }

  getRemainingCount(): number {
    const now = Date.now();
    this.notifications = this.notifications.filter(
      n => n.timestamp.getTime() > now - this.config.windowMs
    );
    return Math.max(0, this.config.maxNotifications - this.notifications.length);
  }

  getResetTime(): Date {
    if (this.notifications.length === 0) {
      return new Date();
    }
    const oldest = this.notifications[0].timestamp.getTime();
    return new Date(oldest + this.config.windowMs);
  }

  reset(): void {
    this.notifications = [];
  }

  configure(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
