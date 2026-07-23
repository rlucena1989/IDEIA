export interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
  trackBy: 'ip' | 'user' | 'model' | 'apikey';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  retryAfter: number;
  totalRequests: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60_000, maxRequests: 60, blockDurationMs: 120_000, trackBy: 'ip' },
  llm: { windowMs: 60_000, maxRequests: 20, blockDurationMs: 60_000, trackBy: 'user' },
  api: { windowMs: 60_000, maxRequests: 100, blockDurationMs: 120_000, trackBy: 'apikey' },
  admin: { windowMs: 60_000, maxRequests: 300, blockDurationMs: 30_000, trackBy: 'user' },
};

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private configs: Map<string, RateLimitConfig>;

  constructor(customConfigs?: Record<string, RateLimitConfig>) {
    this.configs = new Map(Object.entries(customConfigs ?? DEFAULT_CONFIGS));
  }

  check(key: string, limiterName?: string): RateLimitResult {
    const config = this.configs.get(limiterName ?? 'default') ?? this.configs.get('default') ?? null;
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry) {
      // Check if currently blocked
      if (entry.blockedUntil > now) {
        return {
          allowed: false,
          remaining: 0,
          resetIn: Math.ceil((entry.blockedUntil - now) / 1000),
          retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
          totalRequests: entry.count,
        };
      }

      // Check if window expired
      if (now - entry.windowStart > config.windowMs) {
        entry.count = 1;
        entry.windowStart = now;
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetIn: Math.ceil(config.windowMs / 1000),
          retryAfter: 0,
          totalRequests: 1,
        };
      }

      // Increment count
      entry.count++;

      if (entry.count > config.maxRequests) {
        entry.blockedUntil = now + config.blockDurationMs;
        return {
          allowed: false,
          remaining: 0,
          resetIn: Math.ceil(config.blockDurationMs / 1000),
          retryAfter: Math.ceil(config.blockDurationMs / 1000),
          totalRequests: entry.count,
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetIn: Math.ceil((config.windowMs - (now - entry.windowStart)) / 1000),
        retryAfter: 0,
        totalRequests: entry.count,
      };
    }

    // First request
    this.store.set(key, {
      count: 1,
      windowStart: now,
      blockedUntil: 0,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
      retryAfter: 0,
      totalRequests: 1,
    };
  }

  buildKey(identifier: string, config?: RateLimitConfig): string {
    const trackBy = config?.trackBy ?? 'ip';
    return `${trackBy}:${identifier}`;
  }

  setConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  getConfig(name: string): RateLimitConfig | undefined {
    return this.configs.get(name);
  }

  clear(): void {
    this.store.clear();
  }

  getStats(): { totalKeys: number; blockedKeys: number } {
    const now = Date.now();
    let blockedKeys = 0;
    for (const [, entry] of this.store) {
      if (entry.blockedUntil > now) blockedKeys++;
    }
    return {
      totalKeys: this.store.size,
      blockedKeys,
    };
  }

  resetKey(key: string): void {
    this.store.delete(key);
  }
}

export function createRateLimiter(configs?: Record<string, RateLimitConfig>): RateLimiter {
  return new RateLimiter(configs);
}
