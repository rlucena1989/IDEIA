import { TtftBenchmark } from '../src/ttft-benchmark';

describe('TtftBenchmark', () => {
  it('should measure TTFT with increasing latency', async () => {
    const bench = new TtftBenchmark({ iterations: 5, warmup: 1 });
    const report = await bench.run('test', async (i) => ({
      firstTokenMs: 10 + i * 2,
      totalMs: 50 + i * 5,
      tokens: 10 + i,
    }));
    expect(report.samples).toBe(5);
    expect(report.avgTtftMs).toBeGreaterThan(0);
    expect(report.minTtftMs).toBeLessThanOrEqual(report.avgTtftMs);
    expect(report.avgTtftMs).toBeLessThanOrEqual(report.maxTtftMs);
  });

  it('should compute percentiles correctly', async () => {
    const bench = new TtftBenchmark({ iterations: 10, warmup: 0 });
    const report = await bench.run('test', async (i) => ({
      firstTokenMs: i * 10,
      totalMs: i * 20,
      tokens: 5,
    }));
    expect(report.p50TtftMs).toBeGreaterThanOrEqual(report.minTtftMs);
    expect(report.p95TtftMs).toBeGreaterThanOrEqual(report.p50TtftMs);
    expect(report.p99TtftMs).toBeGreaterThanOrEqual(report.p95TtftMs);
  });

  it('should report tokens per second', async () => {
    const bench = new TtftBenchmark({ iterations: 3, warmup: 0 });
    const report = await bench.run('test', async () => ({
      firstTokenMs: 10,
      totalMs: 100,
      tokens: 50,
    }));
    expect(report.avgTokensPerSec).toBeGreaterThan(0);
  });
});
