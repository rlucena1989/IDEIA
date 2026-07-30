import { EdgeNatsBridge, BridgeStatusEvent } from '../edge-nats-bridge';

describe('EdgeNatsBridge', () => {
  it('should create with default config', () => {
    const bridge = new EdgeNatsBridge();
    expect(bridge.getStatus()).toBe('offline');
    expect(bridge.isOnline()).toBe(false);
  });

  it('should create with custom config', () => {
    const bridge = new EdgeNatsBridge({ natsUrl: 'nats://custom:4222', maxReconnectAttempts: 3 });
    expect(bridge.getStatus()).toBe('offline');
    expect(bridge.isOnline()).toBe(false);
  });

  it('should queue messages when offline', () => {
    const bridge = new EdgeNatsBridge();
    bridge.publish('test', { data: 1 });
    expect(bridge.getQueuedMessageCount()).toBe(1);
    const msgs = bridge.getQueuedMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.topic).toBe('test');
  });

  it('should queue multiple messages when offline', () => {
    const bridge = new EdgeNatsBridge();
    bridge.publish('a', 1);
    bridge.publish('b', 2);
    bridge.publish('c', 3);
    expect(bridge.getQueuedMessageCount()).toBe(3);
  });

  it('should emit status events', done => {
    const bridge = new EdgeNatsBridge({ maxReconnectAttempts: 1, reconnectIntervalMs: 1 });
    const events: BridgeStatusEvent[] = [];
    const unsub = bridge.onStatus(e => {
      events.push(e);
      if (events.length >= 2) {
        expect(events.some(e => e.status === 'connecting')).toBe(true);
        expect(events.some(e => e.status === 'offline' || e.status === 'error')).toBe(true);
        unsub();
        done();
      }
    });
    bridge.connect().catch(() => {});
  });

  it('should emit offline status when connection fails', done => {
    const bridge = new EdgeNatsBridge({ natsUrl: 'invalid', maxReconnectAttempts: 0, reconnectIntervalMs: 1 });
    const unsub = bridge.onStatus(e => {
      if (e.status === 'offline' || e.status === 'error') {
        expect(e.error).toBeDefined();
        unsub();
        done();
      }
    });
    bridge.connect().catch(() => {});
  });

  it('should flush queued messages only when online', async () => {
    const bridge = new EdgeNatsBridge({ natsUrl: 'nats://localhost:4222', maxReconnectAttempts: 0, reconnectIntervalMs: 1 });
    bridge.publish('test', 'offline-msg');
    expect(bridge.getQueuedMessageCount()).toBe(1);
    const flushed = await bridge.flush();
    expect(flushed).toBe(0);
  });

  it('should allow disconnect gracefully', async () => {
    const bridge = new EdgeNatsBridge();
    await bridge.disconnect();
    expect(bridge.getStatus()).toBe('offline');
  });

  it('should return correct queue count', () => {
    const bridge = new EdgeNatsBridge();
    expect(bridge.getQueuedMessageCount()).toBe(0);
    bridge.publish('x', 1);
    bridge.publish('y', 2);
    expect(bridge.getQueuedMessageCount()).toBe(2);
  });
});
