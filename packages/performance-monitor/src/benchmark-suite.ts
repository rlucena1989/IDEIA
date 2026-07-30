import { performance } from 'node:perf_hooks';
import { createLogger } from '@ideia/logger';
const logger = createLogger('benchmark-suite');

export interface BenchmarkResult {
  name: string;
  durationMs: number;
  opsPerSecond: number;
  memoryDeltaMB: number;
  percentiles: { p50: number; p95: number; p99: number };
  iterations: number;
  timestamp: string;
}

export interface BenchmarkConfig {
  name: string;
  fn: () => Promise<void> | void;
  iterations: number;
  warmupIterations?: number;
  timeout?: number;
}

export class BenchmarkSuite {
  private benchmarks: BenchmarkConfig[] = [];

  register(config: BenchmarkConfig): void {
    this.benchmarks.push(config);
  }

  async runAll(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    for (const bench of this.benchmarks) {
      results.push(await this.runSingle(bench));
    }
    return results;
  }

  async runSingle(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const warmup = config.warmupIterations ?? Math.max(1, Math.floor(config.iterations / 10));

    // Warmup
    for (let i = 0; i < warmup; i++) {
      await config.fn();
    }

    // Measurement
    const times: number[] = [];
    const memBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();
      await config.fn();
      times.push(performance.now() - start);
    }

    const memAfter = process.memoryUsage().heapUsed;
    times.sort((a, b) => a - b);

    const totalMs = times.reduce((a, b) => a + b, 0);
    const avgMs = totalMs / times.length;

    return {
      name: config.name,
      durationMs: totalMs,
      opsPerSecond: avgMs > 0 ? Math.floor(1000 / avgMs) : 0,
      memoryDeltaMB: (memAfter - memBefore) / 1024 / 1024,
      percentiles: {
        p50: times[Math.floor(times.length * 0.5)],
        p95: times[Math.floor(times.length * 0.95)],
        p99: times[Math.floor(times.length * 0.99)],
      },
      iterations: config.iterations,
      timestamp: new Date().toISOString(),
    };
  }

  async compareWithBaseline(current: BenchmarkResult[], baselinePath?: string): Promise<BenchmarkComparison[]> {
    let baseline: BenchmarkResult[] = [];
    if (baselinePath) {
      try {
        const fs = await import('node:fs');
        baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      } catch { /* no baseline available */ }
    }

    return current.map(result => {
      const base = baseline.find(b => b.name === result.name);
      const comparison: BenchmarkComparison = {
        name: result.name,
        current: result,
        baseline: base || null,
        regression: base ? ((result.percentiles.p50 - base.percentiles.p50) / base.percentiles.p50) * 100 : 0,
        status: 'new',
      };
      if (base) {
        comparison.status =
          comparison.regression > 10 ? '❌ regression' :
          comparison.regression < -5 ? '✅ improvement' :
          '✅ stable';
      }
      return comparison;
    });
  }
}

export interface BenchmarkComparison {
  name: string;
  current: BenchmarkResult;
  baseline: BenchmarkResult | null;
  regression: number;
  status: 'new' | '✅ stable' | '✅ improvement' | '❌ regression';
}
