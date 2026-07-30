import { describe, it, expect, beforeEach } from '@jest/globals';
import { NotificationManager } from '../src/notification-manager';
import { NotificationSeverity} from '../src/types';

describe('NotificationManager', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    manager = new NotificationManager();
  });

  it('can be constructed with no deps', () => {
    expect(manager).toBeDefined();
  });

  it('has expected methods', () => {
    expect(typeof manager.send).toBe('function');
    expect(typeof manager.getHistory).toBe('function');
    expect(typeof manager.getHistoryBySeverity).toBe('function');
    expect(typeof manager.getHistoryBySource).toBe('function');
    expect(typeof manager.dismiss).toBe('function');
    expect(typeof manager.dismissAll).toBe('function');
    expect(typeof manager.clear).toBe('function');
    expect(typeof manager.getRateLimitStatus).toBe('function');
    expect(typeof manager.registerChannel).toBe('function');
    expect(typeof manager.configure).toBe('function');
  });

  it('send creates a notification and adds to history', async () => {
    const result = await manager.send('Test Title', 'Test Message', NotificationSeverity.Info);
    expect(result).toBeDefined();
    expect(result!.title).toBe('Test Title');
    expect(result!.message).toBe('Test Message');
    expect(result!.severity).toBe(NotificationSeverity.Info);
    expect(result!.id).toBeDefined();
    expect(result!.timestamp).toBeInstanceOf(Date);

    const history = manager.getHistory();
    expect(history).toHaveLength(1);
  });

  it('getHistory returns recent notifications', async () => {
    await manager.send('First', 'Message 1', NotificationSeverity.Info);
    await manager.send('Second', 'Message 2', NotificationSeverity.Warning);

    const history = manager.getHistory();
    expect(history).toHaveLength(2);
  });

  it('getHistory respects limit parameter', async () => {
    await manager.send('A', 'Msg A', NotificationSeverity.Info);
    await manager.send('B', 'Msg B', NotificationSeverity.Warning);
    await manager.send('C', 'Msg C', NotificationSeverity.Error);

    const limited = manager.getHistory(2);
    expect(limited).toHaveLength(2);
  });

  it('getHistoryBySeverity filters correctly', async () => {
    await manager.send('Info', 'Info msg', NotificationSeverity.Info);
    await manager.send('Warning', 'Warning msg', NotificationSeverity.Warning);
    await manager.send('Error', 'Error msg', NotificationSeverity.Error);

    const warnings = manager.getHistoryBySeverity(NotificationSeverity.Warning);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].title).toBe('Warning');
  });

  it('dismiss removes a notification by id', async () => {
    const result = await manager.send('Test', 'Message', NotificationSeverity.Info);

    expect(manager.dismiss(result!.id)).toBe(true);
    expect(manager.getHistory()).toHaveLength(0);
  });

  it('dismiss returns false for unknown id', () => {
    expect(manager.dismiss('nonexistent-id')).toBe(false);
  });

  it('dismissAll removes all notifications', async () => {
    await manager.send('A', 'Msg A', NotificationSeverity.Info);
    await manager.send('B', 'Msg B', NotificationSeverity.Warning);

    manager.dismissAll();
    expect(manager.getHistory()).toHaveLength(0);
  });

  it('clear removes all history', async () => {
    await manager.send('Test', 'Message', NotificationSeverity.Info);
    manager.clear();
    expect(manager.getHistory()).toHaveLength(0);
  });

  it('getRateLimitStatus returns remaining and reset time', () => {
    const status = manager.getRateLimitStatus();
    expect(status).toBeDefined();
    expect(typeof status.remaining).toBe('number');
    expect(status.remaining).toBeGreaterThan(0);
    expect(status.resetTime).toBeInstanceOf(Date);
  });

  it('configure updates config and applies to center', () => {
    manager.configure({ maxHistory: 10 });
    manager.send('A', 'Msg', NotificationSeverity.Info);
    manager.send('B', 'Msg', NotificationSeverity.Info);
    expect(manager.getHistory(50)).toHaveLength(2);
  });
});
