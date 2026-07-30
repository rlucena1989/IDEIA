import { MemoryReport, MemorySample } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('memory-profiler');

export interface MemoryProfilerConfig {
  samples: number;
  gcBetweenSamples: boolean;
}

const DEFAULT_CONFIG: MemoryProfilerConfig = {
  samples: 10,
  gcBetweenSamples: false,
};

function mb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

export class MemoryProfiler {
  private config: MemoryProfilerConfig;

  constructor(config?: Partial<MemoryProfilerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async profile(
    label: string,
    setup: () => void,
    operation: () => void | Promise<void>,
    onSample?: (sample: MemorySample) => void,
  ): Promise<MemoryReport> {
    setup();
    const memBefore = process.memoryUsage();
    const samples: MemorySample[] = [];
    let prevRss = mb(memBefore.rss);

    for (let i = 0; i < this.config.samples; i++) {
      if (this.config.gcBetweenSamples && typeof globalThis.gc === 'function') {
        (globalThis as { gc?: () => void }).gc?.();
      }

      await operation();

      const mem = process.memoryUsage();
      const currentRss = mb(mem.rss);
      const delta = currentRss - prevRss;
      prevRss = currentRss;

      const sample: MemorySample = {
        index: i,
        heapUsedMB: mb(mem.heapUsed),
        heapTotalMB: mb(mem.heapTotal),
        rssMB: currentRss,
        externalMB: mb(mem.external),
        arrayBuffersMB: mb(mem.arrayBuffers || 0),
        deltaMB: Math.round(delta * 100) / 100,
      };
      samples.push(sample);
      onSample?.(sample);
    }

    const heapValues = samples.map(s => s.heapUsedMB);
    const rssValues = samples.map(s => s.rssMB);
    const deltas = samples.map(s => s.deltaMB);

    return {
      label,
      samples: samples.length,
      avgHeapUsedMB: heapValues.reduce((s, v) => s + v, 0) / heapValues.length,
      peakHeapUsedMB: Math.max(...heapValues),
      avgRssMB: rssValues.reduce((s, v) => s + v, 0) / rssValues.length,
      peakRssMB: Math.max(...rssValues),
      avgDeltaMB: deltas.reduce((s, v) => s + v, 0) / deltas.length,
      totalAllocatedMB: deltas.reduce((s, v) => s + Math.max(0, v), 0),
    };
  }

  getConfig(): MemoryProfilerConfig { return { ...this.config }; }
}

export function createMemoryProfiler(config?: Partial<MemoryProfilerConfig>): MemoryProfiler {
  return new MemoryProfiler(config);
}
