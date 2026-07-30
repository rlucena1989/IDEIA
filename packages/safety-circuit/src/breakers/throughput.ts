interface ThroughputSample {
  timestamp: number;
  operationsPerSecond: number;
}

const BASELINE_WINDOW_MS = 10 * 60 * 1000;
const CURRENT_WINDOW_MS = 5 * 60 * 1000;
const samples: ThroughputSample[] = [];

export class ThroughputBreaker {
  static recordThroughput(opsPerSecond: number): void {
    samples.push({ timestamp: Date.now(), operationsPerSecond: opsPerSecond });
    ThroughputBreaker.prune(BASELINE_WINDOW_MS);
  }

  static evaluate(): number {
    ThroughputBreaker.prune(BASELINE_WINDOW_MS);

    const baseline = ThroughputBreaker.getBaseline();
    if (baseline === 0) return 0;

    const recent = samples.filter(
      s => Date.now() - s.timestamp <= CURRENT_WINDOW_MS
    );

    if (recent.length === 0) return 100;

    const recentAvg = recent.reduce((sum, s) => sum + s.operationsPerSecond, 0) / recent.length;
    const percentOfBaseline = (recentAvg / baseline) * 100;

    return 100 - percentOfBaseline;
  }

  static reset(): void {
    samples.length = 0;
  }

  private static getBaseline(): number {
    const older = samples.filter(
      s => Date.now() - s.timestamp > CURRENT_WINDOW_MS
    );

    if (older.length === 0) return 0;
    return older.reduce((sum, s) => sum + s.operationsPerSecond, 0) / older.length;
  }

  private static prune(windowMs: number): void {
    const cutoff = Date.now() - windowMs;
    while (samples.length > 0 && samples[0].timestamp < cutoff) {
      samples.shift();
    }
  }
}
