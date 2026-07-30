interface ErrorHistoryEntry {
  timestamp: number;
  isError: boolean;
}

const WINDOW_MS = 5 * 60 * 1000;
const history: ErrorHistoryEntry[] = [];

export class ErrorRateBreaker {
  static recordError(): void {
    history.push({ timestamp: Date.now(), isError: true });
    ErrorRateBreaker.prune();
  }

  static recordSuccess(): void {
    history.push({ timestamp: Date.now(), isError: false });
    ErrorRateBreaker.prune();
  }

  static evaluate(): number {
    ErrorRateBreaker.prune();
    const windowed = history.filter(e => Date.now() - e.timestamp <= WINDOW_MS);
    if (windowed.length === 0) return 0;

    const errorCount = windowed.filter(e => e.isError).length;
    return (errorCount / windowed.length) * 100;
  }

  static reset(): void {
    history.length = 0;
  }

  private static prune(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (history.length > 0 && history[0].timestamp < cutoff) {
      history.shift();
    }
  }
}
