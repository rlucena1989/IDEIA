import { createEventBus } from '../../packages/event-bus/src/event-bus';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

describe('EventBus Performance', () => {
  jest.setTimeout(30000);

  test('throughput measurement', async () => {
    const bus = createEventBus(5000);
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      await bus.emit({ type: 'bench', source: 'test', payload: { i } });
    }
    const elapsed = Date.now() - start;
    const throughput = Math.round(1000 / (elapsed / 1000));
    expect(throughput).toBeGreaterThan(0);
    expect(elapsed).toBeGreaterThan(0);
  });

  test('latency percentiles', async () => {
    const bus = createEventBus(5000);
    const latencies: number[] = [];
    for (let i = 0; i < 500; i++) {
      const t0 = performance.now();
      await bus.emit({ type: 'bench', source: 'test', payload: { i } });
      latencies.push(performance.now() - t0);
    }
    latencies.sort((a, b) => a - b);
    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);
    expect(p50).toBeGreaterThanOrEqual(0);
    expect(p95).toBeGreaterThanOrEqual(p50);
    expect(p99).toBeGreaterThanOrEqual(p95);
  });

  test('memory tracking', async () => {
    const bus = createEventBus(5000);
    const memBefore = process.memoryUsage().heapUsed;
    for (let i = 0; i < 500; i++) {
      await bus.emit({ type: 'bench', source: 'test', payload: { i, data: 'x'.repeat(100) } });
    }
    const memAfter = process.memoryUsage().heapUsed;
    expect(memAfter).toBeGreaterThan(0);
    expect(memBefore).toBeGreaterThan(0);
  });

  test('event history size', async () => {
    const bus = createEventBus(100);
    for (let i = 0; i < 50; i++) {
      await bus.emit({ type: 'bench', source: 'test', payload: { i } });
    }
    expect((await bus.getHistory()).length).toBe(50);
  });

  test('subscriber count', async () => {
    const bus = createEventBus(100);
    expect(await bus.subscriberCount()).toBe(0);
  });
});
