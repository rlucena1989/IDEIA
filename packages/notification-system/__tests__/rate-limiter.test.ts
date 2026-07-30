import { RateLimiter } from '../src/rate-limiter';
import { Notification, NotificationSeverity, NotificationLevel } from '../src/types';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let notification: Notification;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ maxNotifications: 3, windowMs: 1000 });
    notification = {
      id: 'test-1',
      title: 'Test',
      message: 'Test message',
      severity: NotificationSeverity.Info,
      level: NotificationLevel.All,
      timestamp: new Date(),
    };
  });

  describe('canSend', () => {
    it('should allow sending within limit', () => {
      expect(rateLimiter.canSend(notification)).toBe(true);
      expect(rateLimiter.canSend(notification)).toBe(true);
      expect(rateLimiter.canSend(notification)).toBe(true);
    });

    it('should block when limit exceeded', () => {
      rateLimiter.canSend(notification);
      rateLimiter.canSend(notification);
      rateLimiter.canSend(notification);
      
      expect(rateLimiter.canSend(notification)).toBe(false);
    });

    it('should allow after window expires', async () => {
      rateLimiter.canSend(notification);
      rateLimiter.canSend(notification);
      rateLimiter.canSend(notification);
      
      expect(rateLimiter.canSend(notification)).toBe(false);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(rateLimiter.canSend(notification)).toBe(true);
    });
  });

  describe('getRemainingCount', () => {
    it('should return remaining count', () => {
      expect(rateLimiter.getRemainingCount()).toBe(3);
      rateLimiter.canSend(notification);
      expect(rateLimiter.getRemainingCount()).toBe(2);
      rateLimiter.canSend(notification);
      expect(rateLimiter.getRemainingCount()).toBe(1);
    });
  });

  describe('getResetTime', () => {
    it('should return reset time', () => {
      rateLimiter.canSend(notification);
      const resetTime = rateLimiter.getResetTime();
      expect(resetTime).toBeInstanceOf(Date);
      expect(resetTime.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('reset', () => {
    it('should reset the limiter', () => {
      rateLimiter.canSend(notification);
      rateLimiter.canSend(notification);
      rateLimiter.canSend(notification);
      
      expect(rateLimiter.canSend(notification)).toBe(false);
      
      rateLimiter.reset();
      
      expect(rateLimiter.canSend(notification)).toBe(true);
    });
  });

  describe('configure', () => {
    it('should update configuration', () => {
      rateLimiter.configure({ maxNotifications: 5 });
      
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.canSend(notification)).toBe(true);
      }
      expect(rateLimiter.canSend(notification)).toBe(false);
    });
  });
});
