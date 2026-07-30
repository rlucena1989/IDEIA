import { TpsBenchmark } from '../src/tps-benchmark';

describe('Event Bus Throughput Benchmark', () => {
  it('should measure publish throughput', async () => {
    const bench = new TpsBenchmark({ iterations: 10, warmup: 2, batchSize: 50 });
    let eventCount = 0;
    const report = await bench.run('event-bus-publish', async () => {
      eventCount++;
      await Promise.resolve();
    });
    expect(report.samples).toBe(10);
    expect(report.avgTps).toBeGreaterThan(0);
    expect(report.peakTps).toBeGreaterThanOrEqual(report.avgTps);
    expect(eventCount).toBeGreaterThanOrEqual(10 * 50);
  });

  it('should measure subscribe and dispatch throughput', async () => {
    const bench = new TpsBenchmark({ iterations: 8, warmup: 1, batchSize: 25 });
    const handlers: Array<() => void> = [];
    const subscribe = (h: () => void) => handlers.push(h);
    const publish = (_msg: string) => handlers.forEach(h => h());
    let handled = 0;

    subscribe(() => { handled++; });

    const report = await bench.run('event-bus-dispatch', async () => {
      publish('test-event');
    });

    expect(report.samples).toBe(8);
    expect(report.totalOps).toBe(8 * 25);
    expect(handled).toBeGreaterThanOrEqual(8 * 25);
  });

  it('should handle concurrent subscribers', async () => {
    const bench = new TpsBenchmark({ iterations: 5, warmup: 1, batchSize: 10 });
    const subscribers: Array<() => void> = [];
    for (let i = 0; i < 5; i++) {
      subscribers.push(() => {});
    }
    const report = await bench.run('event-bus-concurrent', async () => {
      subscribers.forEach(s => s());
    });
    expect(report.avgTps).toBeGreaterThan(0);
  });
});
