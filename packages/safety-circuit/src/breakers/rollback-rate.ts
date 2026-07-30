interface RollbackEvent {
  timestamp: number;
  reason: string;
}

const WINDOW_MS = 60 * 60 * 1000;
const events: RollbackEvent[] = [];

export class RollbackRateBreaker {
  static recordRollback(reason: string): void {
    events.push({ timestamp: Date.now(), reason });
    RollbackRateBreaker.prune();
  }

  static evaluate(): number {
    RollbackRateBreaker.prune();
    return events.length;
  }

  static getRecentRollbacks(): RollbackEvent[] {
    RollbackRateBreaker.prune();
    return [...events];
  }

  static reset(): void {
    events.length = 0;
  }

  private static prune(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (events.length > 0 && events[0].timestamp < cutoff) {
      events.shift();
    }
  }
}
