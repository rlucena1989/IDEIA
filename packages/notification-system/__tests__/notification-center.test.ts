import { NotificationCenter } from '../src/notification-center';
import { Notification, NotificationSeverity, NotificationLevel } from '../src/types';

describe('NotificationCenter', () => {
  let notificationCenter: NotificationCenter;
  let notification: Notification;

  beforeEach(() => {
    notificationCenter = new NotificationCenter({ maxHistory: 10 });
    notification = {
      id: 'test-1',
      title: 'Test',
      message: 'Test message',
      severity: NotificationSeverity.Info,
      level: NotificationLevel.All,
      timestamp: new Date(),
    };
  });

  describe('add', () => {
    it('should add notification to history', () => {
      const result = notificationCenter.add(notification);
      expect(result).toBe(true);
      expect(notificationCenter.getHistory()).toHaveLength(1);
    });

    it('should respect rate limit', () => {
      const config = { maxHistory: 10, rateLimit: { maxNotifications: 2, windowMs: 1000 } };
      const limitedCenter = new NotificationCenter(config);
      
      expect(limitedCenter.add(notification)).toBe(true);
      expect(limitedCenter.add(notification)).toBe(true);
      expect(limitedCenter.add(notification)).toBe(false);
    });

    it('should limit history size', () => {
      const smallCenter = new NotificationCenter({ maxHistory: 3 });
      
      for (let i = 0; i < 5; i++) {
        smallCenter.add({ ...notification, id: `test-${i}` });
      }
      
      expect(smallCenter.getHistory()).toHaveLength(3);
    });
  });

  describe('getHistory', () => {
    it('should return all history by default', () => {
      notificationCenter.add(notification);
      notificationCenter.add({ ...notification, id: 'test-2' });
      
      expect(notificationCenter.getHistory()).toHaveLength(2);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        notificationCenter.add({ ...notification, id: `test-${i}` });
      }
      
      expect(notificationCenter.getHistory(2)).toHaveLength(2);
    });
  });

  describe('getHistoryBySeverity', () => {
    it('should filter by severity', () => {
      notificationCenter.add(notification);
      notificationCenter.add({ ...notification, id: 'test-2', severity: NotificationSeverity.Error });
      notificationCenter.add({ ...notification, id: 'test-3', severity: NotificationSeverity.Error });
      
      const errors = notificationCenter.getHistoryBySeverity(NotificationSeverity.Error);
      expect(errors).toHaveLength(2);
    });
  });

  describe('getHistoryBySource', () => {
    it('should filter by source', () => {
      notificationCenter.add({ ...notification, source: 'agent' });
      notificationCenter.add({ ...notification, id: 'test-2', source: 'system' });
      notificationCenter.add({ ...notification, id: 'test-3', source: 'agent' });
      
      const agentNotifs = notificationCenter.getHistoryBySource('agent');
      expect(agentNotifs).toHaveLength(2);
    });
  });

  describe('dismiss', () => {
    it('should remove notification by id', () => {
      notificationCenter.add(notification);
      notificationCenter.add({ ...notification, id: 'test-2' });
      
      expect(notificationCenter.dismiss('test-1')).toBe(true);
      expect(notificationCenter.getHistory()).toHaveLength(1);
    });

    it('should return false for non-existent id', () => {
      expect(notificationCenter.dismiss('non-existent')).toBe(false);
    });
  });

  describe('dismissAll', () => {
    it('should clear all notifications', () => {
      notificationCenter.add(notification);
      notificationCenter.add({ ...notification, id: 'test-2' });
      
      notificationCenter.dismissAll();
      
      expect(notificationCenter.getHistory()).toHaveLength(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of notifications', () => {
      notificationCenter.add(notification);
      notificationCenter.add({ ...notification, id: 'test-2' });
      
      expect(notificationCenter.getUnreadCount()).toBe(2);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', () => {
      const status = notificationCenter.getRateLimitStatus();
      
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
      expect(typeof status.remaining).toBe('number');
      expect(status.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('configure', () => {
    it('should update maxHistory', () => {
      notificationCenter.add(notification);
      notificationCenter.add({ ...notification, id: 'test-2' });
      
      notificationCenter.configure({ maxHistory: 1 });
      
      expect(notificationCenter.getHistory()).toHaveLength(1);
    });

    it('should update rate limit', () => {
      notificationCenter.configure({ rateLimit: { maxNotifications: 1, windowMs: 1000 } });
      
      expect(notificationCenter.add(notification)).toBe(true);
      expect(notificationCenter.add(notification)).toBe(false);
    });
  });
});
