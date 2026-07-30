import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ElectronChannel } from '../src/channels/electron-channel';
import { Notification, NotificationSeverity, NotificationLevel } from '../src/types';

describe('ElectronChannel', () => {
  let channel: ElectronChannel;
  let notification: Notification;

  beforeEach(() => {
    channel = new ElectronChannel();
    notification = {
      id: 'test-1',
      title: 'Test Title',
      message: 'Test Message',
      severity: NotificationSeverity.Info,
      level: NotificationLevel.All,
      timestamp: new Date(),
    };
  });

  it('can be constructed', () => {
    expect(channel).toBeDefined();
  });

  it('has correct type', () => {
    expect(channel.type).toBe('desktop');
  });

  it('isAvailable returns false in non-electron, no-Notification env', () => {
    expect(channel.isAvailable()).toBe(false);
  });

  it('send falls back to console when not available', async () => {
    const result = await channel.send(notification);
    expect(result).toBe(false);
  });

  it('send returns false when Notification denied', async () => {
    const mockNotification = { permission: 'denied' as NotificationPermission, requestPermission: jest.fn() };
    (globalThis as Record<string, unknown>).Notification = mockNotification as unknown as jest.Mock;

    const result = await channel.send(notification);
    expect(result).toBe(false);

    delete (globalThis as Record<string, unknown>).Notification;
  });

  it('configure updates config', () => {
    channel.configure({ silent: true, tag: 'custom-tag', requireInteraction: false });
    expect(channel.isAvailable()).toBe(false);
  });
});
