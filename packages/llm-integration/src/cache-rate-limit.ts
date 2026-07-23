import { ChatResponse, SemanticCache, RateLimiter } from './types';

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

export class DefaultRateLimiter implements RateLimiter {
  private counters = new Map<string, { requests: number; tokens: number; resetAt: number }>();

  async checkLimit(providerId: string): Promise<boolean> {
    return true;
  }

  async increment(providerId: string): Promise<void> {}

  async getRemainingTokens(providerId: string): Promise<number> {
    return 100000;
  }
}
