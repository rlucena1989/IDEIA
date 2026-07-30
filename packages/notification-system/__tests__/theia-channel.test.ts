import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TheiaChannel } from '../src/channels/theia-channel';
import { Notification, NotificationSeverity, NotificationLevel } from '../src/types';

describe('TheiaChannel', () => {
  let channel: TheiaChannel;
  let notification: Notification;

  beforeEach(() => {
    channel = new TheiaChannel();
    notification = {
      id: 'test-1',
      title: 'Test Title',
      message: 'Test Message',
      severity: NotificationSeverity.Info,
      level: NotificationLevel.All,
      timestamp: new Date(),
      source: 'test',
    };
  });

  it('can be constructed', () => {
    expect(channel).toBeDefined();
  });

  it('has correct type', () => {
    expect(channel.type).toBe('toast');
  });

  it('isAvailable returns false outside browser', () => {
    expect(channel.isAvailable()).toBe(false);
  });

  it('send returns false when not available', async () => {
    const result = await channel.send(notification);
    expect(result).toBe(false);
  });

  it('isAvailable returns true when document exists', () => {
    (globalThis as Record<string, unknown>).document = {} as Document;
    expect(channel.isAvailable()).toBe(true);
    delete (globalThis as Record<string, unknown>).document;
  });

  it('send dispatches CustomEvent when document available', async () => {
    const _listeners: Record<string, ((e: CustomEvent) => void)[]> = {};
    (globalThis as Record<string, unknown>).document = {
      dispatchEvent: jest.fn() as unknown,
    } as unknown as Document;

    const result = await channel.send(notification);
    expect(result).toBe(true);
    const dispatchEvent = (globalThis.document as unknown as { dispatchEvent: jest.Mock }).dispatchEvent;
    expect(dispatchEvent).toHaveBeenCalled();
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('ideia:notification:theia');
    expect(event.detail.title).toBe('Test Title');

    delete (globalThis as Record<string, unknown>).document;
  });
});
