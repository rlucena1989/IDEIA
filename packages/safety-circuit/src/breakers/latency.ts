interface LatencySample {
  timestamp: number;
  latencyMs: number;
}

const WINDOW_MS = 5 * 60 * 1000;
const samples: LatencySample[] = [];

export class LatencyBreaker {
  static recordLatency(latencyMs: number): void {
    samples.push({ timestamp: Date.now(), latencyMs });
    LatencyBreaker.prune();
  }

  static evaluate(): number {
    LatencyBreaker.prune();

    if (samples.length === 0) return 0;

    const sorted = [...samples].sort((a, b) => a.latencyMs - b.latencyMs);
    const p99Index = Math.ceil(0.99 * sorted.length) - 1;
    return sorted[Math.max(0, p99Index)].latencyMs;
  }

  static reset(): void {
    samples.length = 0;
  }

  private static prune(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (samples.length > 0 && samples[0].timestamp < cutoff) {
      samples.shift();
    }
  }
}
