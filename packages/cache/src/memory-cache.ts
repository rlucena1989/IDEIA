import type { CacheLayer, CacheEntry, CacheOptions, CacheStats, BackupEntry } from './cache-layer';
import { createLogger } from '@ideia/logger';

export class MemoryCache implements CacheLayer {
  private store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private maxSize: number;
  private defaultTtlMs: number;

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
      this.evictions++;
      this.misses++;
      return undefined;
    }
    entry.hits++;
    this.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.entries().next();
      if (oldest.value) {
        this.store.delete(oldest.value[0]);
        this.evictions++;
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      createdAt: Date.now(),
      hits: 0,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.evictions++;
      return false;
    }
    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
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
        this.evictions++;
      }
    }
    return validKeys;
  }

  async backup(): Promise<BackupEntry[]> {
    const entries: BackupEntry[] = [];
    for (const [key, entry] of this.store) {
      entries.push({
        key,
        value: entry.value,
        timestamp: entry.createdAt,
        compressed: false,
        expiresAt: entry.expiresAt,
        hits: entry.hits,
      });
    }
    return entries;
  }

  async restore(entries: BackupEntry[]): Promise<void> {
    for (const entry of entries) {
      this.store.set(entry.key, {
        value: entry.value,
        expiresAt: entry.expiresAt ?? Date.now() + this.defaultTtlMs,
        createdAt: entry.timestamp,
        hits: entry.hits ?? 0,
      });
    }
  }
}
