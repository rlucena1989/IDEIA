import { describe, it, expect } from '@jest/globals';
import { NotificationSystem } from '../src/notification-system';
import { ToastChannel, CliChannel } from '../src/channels';

describe('notification-system', () => {
  it('NotificationSystem can be constructed with no deps', () => {
    const ns = new NotificationSystem();
    expect(ns).toBeDefined();
  });

  it('NotificationSystem has expected methods', () => {
    const ns = new NotificationSystem();
    expect(typeof ns.notify).toBe('function');
    expect(typeof ns.getHistory).toBe('function');
    expect(typeof ns.getAvailableChannels).toBe('function');
  });

  it('ToastChannel can be constructed and used', () => {
    const channel = new ToastChannel();
    expect(channel).toBeDefined();
    expect(channel.isAvailable()).toBe(true);
  });

  it('CliChannel can be constructed', () => {
    const channel = new CliChannel();
    expect(channel).toBeDefined();
    expect(channel.isAvailable()).toBe(true);
  });
});
