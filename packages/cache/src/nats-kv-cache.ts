import type { CacheLayer, CacheOptions, CacheStats } from './cache-layer';
import { createLogger } from '@ideia/logger';

interface NatsKvEntry {
  value: unknown;
  expiresAt: number;
}

export class NatsKvCache implements CacheLayer {
  private kv: unknown;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private localCache = new Map<string, NatsKvEntry>();

  constructor(_options?: CacheOptions) {
  }

  async connect(_url?: string): Promise<void> {
    throw new Error(
      `NatsKvCache.connect not implemented. Install 'nats' package and pass a NATS KV store.\n`
      + `Usage: const sc = StringCodec(); const kv = await jetstreamClient.views.kv('cache');`
    );
  }

  async get<T>(key: string): Promise<T | undefined> {
    const local = this.localCache.get(key);
    if (local) {
      if (Date.now() > local.expiresAt) {
        this.localCache.delete(key);
        this.evictions++;
        this.misses++;
        return undefined;
      }
      this.hits++;
      return local.value as T;
    }
    this.misses++;
    return undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.localCache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? 60_000),
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.localCache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const local = this.localCache.get(key);
    if (!local) return false;
    if (Date.now() > local.expiresAt) {
      this.localCache.delete(key);
      this.evictions++;
      return false;
    }
    return true;
  }

  async clear(): Promise<void> {
    this.localCache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  async stats(): Promise<CacheStats> {
    const size = this.localCache.size;
    const totalRequests = this.hits + this.misses;
    return {
      size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
    };
  }

  async keys(): Promise<string[]> {
    return Array.from(this.localCache.keys());
  }
}
