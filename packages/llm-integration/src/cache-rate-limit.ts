import { ChatResponse, SemanticCache, RateLimiter } from './types';
import { createLogger } from '@ideia/logger';

export class DefaultSemanticCache implements SemanticCache {
  private cache = new Map<string, { response: ChatResponse; expiresAt: number }>();
  private ttl = 5 * 60 * 1000;

  async get(key: string): Promise<ChatResponse | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return { ...entry.response, cached: true };
  }

  async set(key: string, response: ChatResponse): Promise<void> {
    this.cache.set(key, { response, expiresAt: Date.now() + this.ttl });
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

interface RateLimiterConfig {
  maxTokens: number;
  refillRate: number;
  refillIntervalMs: number;
}

interface BucketState {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  refillIntervalMs: number;
  lastRefill: number;
}

export class DefaultRateLimiter implements RateLimiter {
  private buckets = new Map<string, BucketState>();
  private config: RateLimiterConfig;

  constructor(config?: RateLimiterConfig) {
    this.config = config ?? { maxTokens: 100, refillRate: 10, refillIntervalMs: 1000 };
  }

  private getBucket(providerId: string): BucketState {
    let bucket = this.buckets.get(providerId);
    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens,
        maxTokens: this.config.maxTokens,
        refillRate: this.config.refillRate,
        refillIntervalMs: this.config.refillIntervalMs,
        lastRefill: Date.now(),
      };
      this.buckets.set(providerId, bucket);
    }
    this.refill(bucket);
    return bucket;
  }

  private refill(bucket: BucketState): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= bucket.refillIntervalMs) {
      const cycles = Math.floor(elapsed / bucket.refillIntervalMs);
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + cycles * bucket.refillRate);
      bucket.lastRefill += cycles * bucket.refillIntervalMs;
    }
  }

  async checkLimit(providerId: string): Promise<boolean> {
    const bucket = this.getBucket(providerId);
    return bucket.tokens > 0;
  }

  async increment(providerId: string): Promise<void> {
    const bucket = this.getBucket(providerId);
    if (bucket.tokens > 0) {
      bucket.tokens--;
    }
  }

  async getRemainingTokens(providerId: string): Promise<number> {
    const bucket = this.getBucket(providerId);
    return bucket.tokens;
  }

  async reset(providerId: string): Promise<void> {
    const bucket = this.buckets.get(providerId);
    if (bucket) {
      bucket.tokens = bucket.maxTokens;
      bucket.lastRefill = Date.now();
    }
  }
}
