import { TpsReport, TpsSample } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('tps-benchmark');

export interface TpsBenchmarkConfig {
  iterations: number;
  warmup: number;
  batchSize: number;
}

const DEFAULT_CONFIG: TpsBenchmarkConfig = {
  iterations: 30,
  warmup: 3,
  batchSize: 100,
};

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export class TpsBenchmark {
  private config: TpsBenchmarkConfig;

  constructor(config?: Partial<TpsBenchmarkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async run(
    label: string,
    operation: (batchIndex: number) => Promise<void> | void,
    onSample?: (sample: TpsSample) => void,
  ): Promise<TpsReport> {
    const samples: TpsSample[] = [];
    const total = this.config.warmup + this.config.iterations;
    let totalOps = 0;

    for (let i = 0; i < total; i++) {
      const start = process.hrtime.bigint();
      for (let j = 0; j < this.config.batchSize; j++) {
        await operation(i * this.config.batchSize + j);
      }
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const elapsedMs = elapsedNs / 1_000_000;

      if (i < this.config.warmup) continue;

      const batchOps = this.config.batchSize;
      const tps = elapsedMs > 0 ? Math.round((batchOps / elapsedMs) * 1000) : batchOps * 1000;
      totalOps += batchOps;

      const sample: TpsSample = { index: i - this.config.warmup, operations: batchOps, durationMs: elapsedMs, tps };
      samples.push(sample);
      onSample?.(sample);
    }

    const tpsValues = samples.map(s => s.tps).sort((a, b) => a - b);
    const totalDurationMs = samples.reduce((s, v) => s + v.durationMs, 0);

    return {
      operation: label,
      samples: samples.length,
      totalOps,
      totalDurationMs,
      avgTps: tpsValues.reduce((s, v) => s + v, 0) / tpsValues.length,
      peakTps: tpsValues[tpsValues.length - 1],
      p50Tps: percentile(tpsValues, 50),
      p95Tps: percentile(tpsValues, 95),
    };
  }

  getConfig(): TpsBenchmarkConfig { return { ...this.config }; }
}

export function createTpsBenchmark(config?: Partial<TpsBenchmarkConfig>): TpsBenchmark {
  return new TpsBenchmark(config);
}
