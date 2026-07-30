interface RequestEntry {
  timestamp: number;
}

const WINDOW_MS = 60 * 1000;

export class RateLimiterBreaker {
  private static requests: RequestEntry[] = [];

  static recordRequest(): void {
    RateLimiterBreaker.requests.push({ timestamp: Date.now() });
    RateLimiterBreaker.prune();
  }

  static evaluate(): number {
    RateLimiterBreaker.prune();
    return RateLimiterBreaker.requests.length;
  }

  static reset(): void {
    RateLimiterBreaker.requests.length = 0;
  }

  private static prune(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (RateLimiterBreaker.requests.length > 0 && RateLimiterBreaker.requests[0].timestamp < cutoff) {
      RateLimiterBreaker.requests.shift();
    }
  }
}
