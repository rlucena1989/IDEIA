import { TtftReport, TtftSample } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ttft-benchmark');

export interface TtftBenchmarkConfig {
  iterations: number;
  warmup: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: TtftBenchmarkConfig = {
  iterations: 50,
  warmup: 5,
  maxTokens: 100,
};

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export class TtftBenchmark {
  private config: TtftBenchmarkConfig;

  constructor(config?: Partial<TtftBenchmarkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async run(
    label: string,
    executor: (iteration: number) => Promise<{ firstTokenMs: number; totalMs: number; tokens: number }>,
    onSample?: (sample: TtftSample) => void,
  ): Promise<TtftReport> {
    const samples: TtftSample[] = [];
    const total = this.config.warmup + this.config.iterations;

    for (let i = 0; i < total; i++) {
      const result = await executor(i);
      if (i < this.config.warmup) continue;

      const sample: TtftSample = {
        index: i - this.config.warmup,
        ttftMs: result.firstTokenMs,
        totalLatencyMs: result.totalMs,
        tokensGenerated: result.tokens,
      };
      samples.push(sample);
      onSample?.(sample);
    }

    const ttfts = samples.map(s => s.ttftMs).sort((a, b) => a - b);
    const latencies = samples.map(s => s.totalLatencyMs);
    const tokens = samples.reduce((s, v) => s + v.tokensGenerated, 0);
    const totalTime = samples.reduce((s, v) => s + v.totalLatencyMs, 0);

    return {
      operation: label,
      samples: samples.length,
      avgTtftMs: ttfts.reduce((s, v) => s + v, 0) / ttfts.length,
      p50TtftMs: percentile(ttfts, 50),
      p95TtftMs: percentile(ttfts, 95),
      p99TtftMs: percentile(ttfts, 99),
      minTtftMs: ttfts[0],
      maxTtftMs: ttfts[ttfts.length - 1],
      avgTotalLatencyMs: latencies.reduce((s, v) => s + v, 0) / latencies.length,
      avgTokensPerSec: totalTime > 0 ? (tokens / totalTime) * 1000 : 0,
    };
  }

  getConfig(): TtftBenchmarkConfig { return { ...this.config }; }
}

export function createTtftBenchmark(config?: Partial<TtftBenchmarkConfig>): TtftBenchmark {
  return new TtftBenchmark(config);
}
