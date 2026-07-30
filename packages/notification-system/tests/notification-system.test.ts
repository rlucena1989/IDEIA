import { describe, it, expect, beforeEach } from '@jest/globals';
import { NotificationSystem } from '../src/notification-system';
import { NotificationSeverity, NotificationLevel, ChannelType } from '../src/types';

describe('NotificationSystem', () => {
  let system: NotificationSystem;

  beforeEach(() => {
    system = new NotificationSystem();
  });

  describe('constructor', () => {
    it('should create notification system', () => {
      expect(system).toBeInstanceOf(NotificationSystem);
    });
  });

  describe('notify', () => {
    it('should create notification', async () => {
      const notification = await system.notify({
        title: 'Test',
        message: 'Test message',
        severity: NotificationSeverity.Info,
        level: NotificationLevel.All,
      });
      expect(notification).toBeDefined();
      expect(notification.title).toBe('Test');
    });

    it('should set default level', async () => {
      const notification = await system.notify({
        title: 'Test',
        message: 'Test message',
        severity: NotificationSeverity.Warning,
        level: NotificationLevel.All,
      });
      expect(notification.level).toBeDefined();
    });
  });

  describe('setLevel', () => {
    it('should set notification level', () => {
      system.setLevel(NotificationLevel.Critical);
      expect(system['level']).toBe(NotificationLevel.Critical);
    });
  });

  describe('getHistory', () => {
    it('should return notification history', async () => {
      await system.notify({
        title: 'Test',
        message: 'Test message',
        severity: NotificationSeverity.Info,
        level: NotificationLevel.All,
      });
      const history = system.getHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    it('should clear notification history', async () => {
      await system.notify({
        title: 'Test',
        message: 'Test message',
        severity: NotificationSeverity.Info,
        level: NotificationLevel.All,
      });
      system.clearHistory();
      const history = system.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return notification stats', async () => {
      await system.notify({
        title: 'Test',
        message: 'Test message',
        severity: NotificationSeverity.Info,
        level: NotificationLevel.All,
      });
      const stats = system.getStats();
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
    });
  });
});
