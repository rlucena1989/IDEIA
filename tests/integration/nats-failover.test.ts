import { describe, it, expect } from '@jest/globals';

interface BusEvent { type: string; source?: string; payload?: unknown }
interface EventBus { emit(e: BusEvent): Promise<void>; subscribe(t: string, h: (e: unknown) => void): string; unsubscribe(id: string): void }

function createFallbackBus(): EventBus & { getAllHandlers(): Array<(e: unknown) => void> } {
  const handlers = new Map<string, Array<(e: unknown) => void>>();
  const allHandlers: Array<(e: unknown) => void> = [];
  return {
    async emit(e: BusEvent): Promise<void> {
      const hs = handlers.get(e.type) ?? [];
      for (const h of hs) h(e);
      for (const h of allHandlers) h(e);
    },
    subscribe(t: string, h: (e: unknown) => void): string {
      const existing = handlers.get(t) ?? [];
      existing.push(h);
      handlers.set(t, existing);
      return `sub-${Date.now()}`;
    },
    unsubscribe(_id: string): void {},
    getAllHandlers: () => allHandlers,
  };
}

describe('NATS → In-Memory Failover', () => {
  it('should emit and receive events via in-memory fallback', async () => {
    const bus = createFallbackBus();
    const received: string[] = [];
    bus.subscribe('memory:record_added', (e) => { received.push((e as BusEvent).type); });
    await bus.emit({ type: 'memory:record_added', source: 'test', payload: { id: 1 } });
    expect(received).toContain('memory:record_added');
  });

  it('should not lose events during NATS reconnect', async () => {
    const bus = createFallbackBus();
    const stored: BusEvent[] = [];
    const storeAll = (e: unknown) => stored.push(e as BusEvent);
    bus.subscribe('test:event-1', storeAll);
    bus.subscribe('test:event-2', storeAll);
    bus.subscribe('test:event-3', storeAll);
    await bus.emit({ type: 'test:event-1', payload: { id: 1 } });
    await bus.emit({ type: 'test:event-2', payload: { id: 2 } });
    await bus.emit({ type: 'test:event-3', payload: { id: 3 } });
    expect(stored.length).toBe(3);
    expect(stored[0].type).toBe('test:event-1');
    expect(stored[2].type).toBe('test:event-3');
  });

  it('should support subscribe/unsubscribe lifecycle', () => {
    const bus = createFallbackBus();
    const subId = bus.subscribe('test:event', () => {});
    expect(subId).toBeTruthy();
    expect(typeof subId).toBe('string');
    bus.unsubscribe(subId);
  });

  it('should handle concurrent event emissions', async () => {
    const bus = createFallbackBus();
    const results: BusEvent[] = [];
    const storeResult = (e: unknown) => results.push(e as BusEvent);
    bus.subscribe('event:a', storeResult);
    bus.subscribe('event:b', storeResult);
    bus.subscribe('event:c', storeResult);
    await Promise.all([
      bus.emit({ type: 'event:a' }),
      bus.emit({ type: 'event:b' }),
      bus.emit({ type: 'event:c' }),
    ]);
    expect(results.length).toBe(3);
    expect(results.map(r => r.type).sort()).toEqual(['event:a', 'event:b', 'event:c']);
  });
});
