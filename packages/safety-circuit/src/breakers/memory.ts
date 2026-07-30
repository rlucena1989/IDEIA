interface MemorySample {
  timestamp: number;
  rssPercent: number;
}

const WINDOW_MS = 60 * 1000;
const samples: MemorySample[] = [];

export class MemoryBreaker {
  static recordMemoryUsage(rssPercent: number): void {
    samples.push({ timestamp: Date.now(), rssPercent });
    MemoryBreaker.prune();
  }

  static evaluate(): number {
    MemoryBreaker.prune();

    const mem = process.memoryUsage();
    const rssMb = mem.rss / 1024 / 1024;
    const limitMb = MemoryBreaker.getMemoryLimit();

    if (limitMb === 0) return 0;

    const percent = (rssMb / limitMb) * 100;
    samples.push({ timestamp: Date.now(), rssPercent: percent });

    return Math.round(percent * 100) / 100;
  }

  static reset(): void {
    samples.length = 0;
  }

  private static getMemoryLimit(): number {
    if (typeof process !== 'undefined' && process.env.NODE_OPTIONS) {
      const match = process.env.NODE_OPTIONS.match(/--max-old-space-size=(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 2048;
  }

  private static prune(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (samples.length > 0 && samples[0].timestamp < cutoff) {
      samples.shift();
    }
  }
}
