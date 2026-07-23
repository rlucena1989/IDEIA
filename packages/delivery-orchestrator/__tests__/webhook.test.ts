import { describe, it, expect, jest } from '@jest/globals';
import { WebhookManager, createWebhookManager, WebhookPayload } from '../src/webhook';

describe('WebhookManager', () => {
  it('should create webhook manager', () => {
    const wm = createWebhookManager();
    expect(wm).toBeDefined();
  });

  it('should register and list webhooks', () => {
    const wm = createWebhookManager();
    wm.registerWebhook('test', { url: 'http://example.com/hook' });
    const hooks = wm.listWebhooks();
    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe('test');
    expect(hooks[0].config.url).toBe('http://example.com/hook');
  });

  it('should remove webhook', () => {
    const wm = createWebhookManager();
    wm.registerWebhook('test', { url: 'http://example.com/hook' });
    expect(wm.removeWebhook('test')).toBe(true);
    expect(wm.listWebhooks()).toHaveLength(0);
  });

  it('should return false removing non-existent webhook', () => {
    const wm = createWebhookManager();
    expect(wm.removeWebhook('non-existent')).toBe(false);
  });

  it('should dispatch to local handlers', async () => {
    const wm = createWebhookManager();
    const handler = jest.fn<(payload: WebhookPayload) => Promise<void>>().mockResolvedValue(undefined);
    wm.registerHandler('deploy.completed', handler);

    await wm.dispatch('deploy.completed', {
      event: 'deploy.completed',
      version: '1.0.0',
      environment: 'production',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const payload: WebhookPayload = handler.mock.calls[0][0];
    expect(payload.event).toBe('deploy.completed');
    expect(payload.version).toBe('1.0.0');
    expect(payload.id).toBeDefined();
    expect(payload.timestamp).toBeDefined();
  });

  it('should handle multiple events', async () => {
    const wm = createWebhookManager();
    const handler1 = jest.fn<(payload: WebhookPayload) => Promise<void>>().mockResolvedValue(undefined);
    const handler2 = jest.fn<(payload: WebhookPayload) => Promise<void>>().mockResolvedValue(undefined);

    wm.registerHandler('deploy.started', handler1);
    wm.registerHandler('deploy.completed', handler2);

    await wm.dispatch('deploy.started', {
      event: 'deploy.started', version: '1.0.0', environment: 'staging',
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });
});
