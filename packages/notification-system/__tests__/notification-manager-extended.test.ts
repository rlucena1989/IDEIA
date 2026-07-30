import { NotificationManager } from '../src/notification-manager';
import { NotificationSystem } from '../src/notification-system';
import { NotificationCenter } from '../src/notification-center';
import {  NotificationSeverity, NotificationLevel, ChannelType, NotificationChannel } from '../src/types';

describe('NotificationManager Extended', () => {
  let manager: NotificationManager;
  let system: NotificationSystem;
  let center: NotificationCenter;

  beforeEach(() => {
    system = new NotificationSystem();
    center = new NotificationCenter({ maxHistory: 100, rateLimit: { maxNotifications: 50, windowMs: 60000 } });
    manager = new NotificationManager(system, center);
  });

  it('should send a notification and return it with id', async () => {
    const notification = await manager.send('Test Title', 'Test message', NotificationSeverity.Info);
    expect(notification).not.toBeNull();
    expect(notification!.id).toBeTruthy();
    expect(notification!.title).toBe('Test Title');
    expect(notification!.message).toBe('Test message');
  });

  it('should return null when rate limited', async () => {
    const strictCenter = new NotificationCenter({ maxHistory: 100, rateLimit: { maxNotifications: 0, windowMs: 60000 } });
    const strictManager = new NotificationManager(system, strictCenter);
    const result = await strictManager.send('Limited', 'Should be null');
    expect(result).toBeNull();
  });

  it('should retrieve notification history', async () => {
    await manager.send('First', 'msg1', NotificationSeverity.Info);
    await manager.send('Second', 'msg2', NotificationSeverity.Warning);
    const history = manager.getHistory();
    expect(history.length).toBe(2);
  });

  it('should retrieve filtered history by severity', async () => {
    await manager.send('Info', 'msg', NotificationSeverity.Info);
    await manager.send('Error', 'msg', NotificationSeverity.Error);
    const errors = manager.getHistoryBySeverity(NotificationSeverity.Error);
    expect(errors).toHaveLength(1);
    expect(errors[0].title).toBe('Error');
  });

  it('should retrieve filtered history by source', async () => {
    await manager.send('Src1', 'msg', NotificationSeverity.Info, { source: 'module-a' });
    await manager.send('Src2', 'msg', NotificationSeverity.Info, { source: 'module-b' });
    const fromModuleA = manager.getHistoryBySource('module-a');
    expect(fromModuleA).toHaveLength(1);
    expect(fromModuleA[0].title).toBe('Src1');
  });

  it('should dismiss a notification by id', async () => {
    const n = await manager.send('To Dismiss', 'msg', NotificationSeverity.Info);
    expect(manager.dismiss(n!.id)).toBe(true);
  });

  it('should dismiss all notifications', async () => {
    await manager.send('A', 'msg', NotificationSeverity.Info);
    await manager.send('B', 'msg', NotificationSeverity.Info);
    manager.dismissAll();
    const history = manager.getHistory();
    expect(history.length).toBe(0);
  });

  it('should clear history', async () => {
    await manager.send('X', 'msg', NotificationSeverity.Info);
    manager.clear();
    expect(manager.getHistory()).toHaveLength(0);
  });

  it('should return rate limit status', () => {
    const status = manager.getRateLimitStatus();
    expect(status).toHaveProperty('remaining');
    expect(status).toHaveProperty('resetTime');
  });

  it('should register and use custom channels', async () => {
    const customChannel: NotificationChannel = {
      type: ChannelType.Toast,
      send: async (_notification) => { /* custom */ return true; },
      configure: () => {},
      isAvailable: () => true,
    };
    manager.registerChannel(ChannelType.Toast, customChannel);
    const n = await manager.send('Custom', 'msg', NotificationSeverity.Info);
    expect(n).not.toBeNull();
  });

  it('should allow dynamic configuration update', async () => {
    manager.configure({ maxHistory: 10, rateLimit: { maxNotifications: 20, windowMs: 30000 } });
    const n = await manager.send('After config', 'msg', NotificationSeverity.Info);
    expect(n).not.toBeNull();
  });

  it('should handle notification with level filter', async () => {
    const n = await manager.send('Level test', 'msg', NotificationSeverity.Info, { level: NotificationLevel.Important });
    expect(n).not.toBeNull();
    expect(n!.level).toBe(NotificationLevel.Important);
  });

  it('should handle metadata in notifications', async () => {
    const meta = { userId: '123', action: 'deploy' };
    const n = await manager.send('Meta test', 'msg', NotificationSeverity.Info, { metadata: meta });
    expect(n!.metadata).toEqual(meta);
  });
});