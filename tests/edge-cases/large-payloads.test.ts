import { EventBus, createEventBus } from '../../packages/event-bus/src/event-bus';

describe('Edge Cases - Large Payloads', () => {
  test('EventBus handles 1000 events without memory leak', async () => {
    const bus = createEventBus(100);
    for (let i = 0; i < 1000; i++) {
      await bus.emit({
        type: 'test.event',
        source: 'test',
        payload: { index: i, data: 'x'.repeat(100) } as any,
      });
    }
    const history = bus.getHistory();
    expect(history.length).toBeLessThanOrEqual(100);
    const firstPayload = history[0].payload as any as { index: number };
    expect(firstPayload.index).toBeGreaterThanOrEqual(900);
  });

  test('EventBus handles concurrent subscribers', async () => {
    const bus = createEventBus();
    let callCount = 0;
    const handlers: string[] = [];
    for (let i = 0; i < 50; i++) {
      const id = bus.subscribe('test.event', async () => {
        callCount++;
      });
      handlers.push(id);
    }
    await bus.emit({ type: 'test.event', source: 'test' });
    expect(callCount).toBe(50);
    handlers.forEach((id) => bus.unsubscribe(id));
    expect(bus.subscriberCount()).toBe(0);
  });
});
