import type { CacheLayer, CacheEntry, CacheOptions, CacheStats } from './cache-layer';
import { createLogger } from '@ideia/logger';
const logger = createLogger('memory-cache-lru');

export class LRUCache implements CacheLayer {
  private store = new Map<string, CacheEntry<unknown>>();
  private accessOrder = new Map<string, number>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private maxSize: number;
  private defaultTtlMs: number;
  private accessCounter = 0;

  constructor(options?: CacheOptions) {
    this.maxSize = options?.maxSize ?? 10_000;
    this.defaultTtlMs = options?.ttlMs ?? 60_000;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.accessOrder.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }
    this.accessOrder.set(key, ++this.accessCounter);
    entry.hits++;
    this.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (this.store.has(key)) {
      this.accessOrder.set(key, ++this.accessCounter);
    } else {
      this.evictIfNeeded();
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      createdAt: Date.now(),
      hits: 0,
    });
    this.accessOrder.set(key, ++this.accessCounter);
  }

  async delete(key: string): Promise<boolean> {
    this.accessOrder.delete(key);
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.accessOrder.delete(key);
      this.evictions++;
      return false;
    }
    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.accessOrder.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  async stats(): Promise<CacheStats> {
    const size = this.store.size;
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
    const validKeys: string[] = [];
    for (const [key, entry] of this.store) {
      if (Date.now() <= entry.expiresAt) {
        validKeys.push(key);
      } else {
        this.store.delete(key);
        this.accessOrder.delete(key);
        this.evictions++;
      }
    }
    return validKeys;
  }

  private evictIfNeeded(): void {
    if (this.store.size < this.maxSize) return;
    let lruKey: string | null = null;
    let lruAccess = Infinity;
    for (const [key, access] of this.accessOrder) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }
    if (lruKey) {
      this.store.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.evictions++;
    }
  }
}
