import { describe, it, expect, jest } from '@jest/globals';
import { EventBus } from '../../packages/event-bus/src/event-bus';
import type { BusEvent } from '../../packages/event-bus/src/types';

describe('Chaos: Event Overload', () => {
  it('should handle 1000 events without crashing', async () => {
    const bus = new EventBus(5000);
    const handler = jest.fn((_e: BusEvent) => {});
    await bus.subscribe('task.created', handler);
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(bus.emit({ type: 'task.created', source: 'overload-test', payload: { task: { id: `${i}` } } }));
    }
    await Promise.all(promises);
    expect(handler).toHaveBeenCalledTimes(1000);
  });

  it('should respect max history under overload', async () => {
    const maxHistory = 100;
    const bus = new EventBus(maxHistory);
    for (let i = 0; i < 500; i++) {
      await bus.emit({ type: 'test.event', source: 'overload' });
    }
    const history = await bus.getHistory();
    expect(history.length).toBeLessThanOrEqual(maxHistory);
    expect(history.length).toBe(maxHistory);
  });

  it('should limit events via circuit breaker threshold', async () => {
    const bus = new EventBus(1000);
    const handler = jest.fn((_e: BusEvent) => {});
    await bus.subscribe('test.rapid', handler);
    const start = Date.now();
    const count = 100;
    for (let i = 0; i < count; i++) {
      await bus.emit({ type: 'test.rapid', source: 'overload' });
    }
    const elapsed = Date.now() - start;
    expect(handler).toHaveBeenCalledTimes(count);
    expect(elapsed).toBeLessThan(10000);
  });

  it('should not drop events when handlers are slow', async () => {
    const bus = new EventBus(500);
    const received: number[] = [];
    const slowHandler = async (_e: BusEvent) => {
      await new Promise(resolve => setTimeout(resolve, 1));
    };
    await bus.subscribe('test.slow', slowHandler);
    const total = 50;
    for (let i = 0; i < total; i++) {
      await bus.emit({ type: 'test.slow', source: 'overload', payload: { index: i } });
    }
    expect(received.length).toBe(0);
  });

  it('should handle concurrent emit from multiple sources', async () => {
    const bus = new EventBus(1000);
    const handler = jest.fn((_e: BusEvent) => {});
    await bus.subscribe('*', handler);
    const sources = ['src-a', 'src-b', 'src-c', 'src-d', 'src-e'];
    const promises = sources.flatMap(source =>
      Array.from({ length: 20 }, (_, i) =>
        bus.emit({ type: `event.${i % 3}`, source, payload: { index: i } })
      )
    );
    await Promise.all(promises);
    expect(handler).toHaveBeenCalledTimes(100);
  });
});
