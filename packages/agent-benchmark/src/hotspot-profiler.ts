import { HotspotReport, HotspotSample } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('hotspot-profiler');

export interface HotspotProfilerConfig {
  thresholdPct: number;
}

const DEFAULT_CONFIG: HotspotProfilerConfig = {
  thresholdPct: 5,
};

export interface ProfiledStep {
  name: string;
  fn: () => Promise<unknown>;
}

export class HotspotProfiler {
  private config: HotspotProfilerConfig;

  constructor(config?: Partial<HotspotProfilerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async profile(operation: string, steps: ProfiledStep[]): Promise<HotspotReport> {
    const totalStart = Date.now();
    const hotspots: HotspotSample[] = [];

    for (const step of steps) {
      const start = Date.now();
      let calls = 0;
      try {
        await step.fn();
        calls = 1;
      } catch {
        calls = 0;
      }
      const elapsed = Date.now() - start;
      hotspots.push({ location: step.name, durationMs: elapsed, calls, selfTimeMs: elapsed, share: 0 });
    }

    const totalDuration = Date.now() - totalStart;
    for (const h of hotspots) {
      h.share = totalDuration > 0 ? Math.round((h.durationMs / totalDuration) * 10000) / 100 : 0;
    }

    hotspots.sort((a, b) => b.durationMs - a.durationMs);
    const recommendations = this.generateRecommendations(hotspots, totalDuration);

    return { operation, totalDurationMs: totalDuration, hotspots, recommendations };
  }

  private generateRecommendations(hotspots: HotspotSample[], _totalMs: number): string[] {
    const recs: string[] = [];
    const threshold = this.config.thresholdPct;

    for (const h of hotspots) {
      if (h.share >= threshold) {
        recs.push(`${h.location}: ${h.share}% of total (${h.durationMs}ms) — consider caching, batching, or parallelization`);
      }
    }

    if (hotspots.length > 0 && hotspots[0].share > 50) {
      recs.push(`Critical hotspot in ${hotspots[0].location}: consumes >50% of execution time`);
    }

    const largeCount = hotspots.filter(h => h.share >= threshold).length;
    if (largeCount > 3) {
      recs.push(`${largeCount} steps exceed ${threshold}% threshold — consider architectural simplification`);
    }

    if (recs.length === 0) {
      recs.push('No significant hotspots detected — execution profile is well-balanced');
    }

    return recs;
  }

  getConfig(): HotspotProfilerConfig { return { ...this.config }; }
}

export function createHotspotProfiler(config?: Partial<HotspotProfilerConfig>): HotspotProfiler {
  return new HotspotProfiler(config);
}
