import { TpsBenchmark } from '../src/tps-benchmark';

describe('TpsBenchmark', () => {
  it('should measure throughput', async () => {
    const bench = new TpsBenchmark({ iterations: 5, warmup: 1, batchSize: 10 });
    const report = await bench.run('test', async () => {});
    expect(report.samples).toBe(5);
    expect(report.avgTps).toBeGreaterThan(0);
    expect(report.totalOps).toBe(50);
  });

  it('should report peak TPS', async () => {
    const bench = new TpsBenchmark({ iterations: 3, warmup: 0, batchSize: 10 });
    const report = await bench.run('test', async () => {});
    expect(report.peakTps).toBeGreaterThanOrEqual(report.avgTps);
    expect(report.p50Tps).toBeGreaterThan(0);
    expect(report.p95Tps).toBeGreaterThan(0);
  });
});
