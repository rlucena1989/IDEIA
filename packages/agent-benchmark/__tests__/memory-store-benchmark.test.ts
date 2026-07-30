import { TpsBenchmark } from '../src/tps-benchmark';

describe('Memory Store Read/Write Benchmark', () => {
  it('should measure write throughput', async () => {
    const bench = new TpsBenchmark({ iterations: 10, warmup: 2, batchSize: 20 });
    const store = new Map<string, string>();
    let keyIdx = 0;

    const report = await bench.run('memory-write', async () => {
      store.set(`key-${keyIdx++}`, `value-${keyIdx}`);
    });

    expect(report.samples).toBe(10);
    expect(report.avgTps).toBeGreaterThan(0);
    expect(store.size).toBeGreaterThanOrEqual(10 * 20);
  });

  it('should measure read throughput', async () => {
    const bench = new TpsBenchmark({ iterations: 10, warmup: 2, batchSize: 50 });
    const store = new Map<string, string>();
    for (let i = 0; i < 500; i++) {
      store.set(`key-${i}`, `value-${i}`);
    }
    let reads = 0;

    const report = await bench.run('memory-read', async (idx) => {
      const k = `key-${idx % 500}`;
      reads++;
      store.get(k);
    });

    expect(report.samples).toBe(10);
    expect(report.avgTps).toBeGreaterThan(0);
    expect(reads).toBeGreaterThanOrEqual(10 * 50);
  });

  it('should measure delete throughput', async () => {
    const bench = new TpsBenchmark({ iterations: 5, warmup: 1, batchSize: 30 });
    const store = new Map<string, string>();
    for (let i = 0; i < 500; i++) {
      store.set(`key-del-${i}`, `value-${i}`);
    }
    let delIdx = 0;

    const report = await bench.run('memory-delete', async () => {
      store.delete(`key-del-${delIdx++}`);
    });

    expect(report.samples).toBe(5);
    expect(report.avgTps).toBeGreaterThan(0);
  });

  it('should measure batch write throughput', async () => {
    const bench = new TpsBenchmark({ iterations: 8, warmup: 2, batchSize: 100 });
    const store = new Map<string, string>();

    const report = await bench.run('memory-batch-write', async () => {
      for (let i = 0; i < 10; i++) {
        store.set(`batch-${i}`, `val-${i}`);
      }
    });

    expect(report.samples).toBe(8);
    expect(report.avgTps).toBeGreaterThan(0);
  });
});
