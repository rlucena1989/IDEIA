import { TtftBenchmark } from '../src/ttft-benchmark';

describe('LLM Latency Benchmark', () => {
  it('should measure latency across simulated LLM calls', async () => {
    const bench = new TtftBenchmark({ iterations: 10, warmup: 2 });
    const report = await bench.run('llm-latency', async (_i) => ({
      firstTokenMs: 50 + Math.random() * 30,
      totalMs: 200 + Math.random() * 100,
      tokens: 50 + Math.floor(Math.random() * 50),
    }));
    expect(report.samples).toBe(10);
    expect(report.avgTtftMs).toBeGreaterThan(0);
    expect(report.p95TtftMs).toBeGreaterThanOrEqual(report.p50TtftMs);
    expect(report.p99TtftMs).toBeGreaterThanOrEqual(report.p95TtftMs);
    expect(report.avgTokensPerSec).toBeGreaterThan(0);
  });

  it('should handle high-latency outliers', async () => {
    const bench = new TtftBenchmark({ iterations: 20, warmup: 0 });
    const report = await bench.run('llm-outliers', async (i) => ({
      firstTokenMs: i === 15 ? 5000 : 40,
      totalMs: i === 15 ? 15000 : 180,
      tokens: 100,
    }));
    expect(report.minTtftMs).toBe(40);
    expect(report.maxTtftMs).toBe(5000);
    expect(report.avgTtftMs).toBeGreaterThan(40);
    expect(report.p99TtftMs).toBeGreaterThanOrEqual(report.p95TtftMs);
  });

  it('should compute tokens per second correctly', async () => {
    const bench = new TtftBenchmark({ iterations: 5, warmup: 0 });
    const report = await bench.run('llm-tps', async () => ({
      firstTokenMs: 30,
      totalMs: 500,
      tokens: 100,
    }));
    expect(report.avgTokensPerSec).toBeCloseTo(200, -1);
  });
});
