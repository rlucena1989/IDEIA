import { CacheEntry, CacheHit, LLMCacheConfig } from '../types';
import { createLogger } from '@ideia/logger';
import { createHash } from 'crypto';
const logger = createLogger('llm-cache');

const DEFAULT_CONFIG: LLMCacheConfig = {
  planCacheTtlMs: 3600000,
  decisionCacheTtlMs: 300000,
  embeddingCacheTtlMs: 600000,
  maxEntries: 1000,
};

export class LLMCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private config: LLMCacheConfig;

  constructor(config: Partial<LLMCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get<T>(key: string): CacheHit<T> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return { found: false };

    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > entry.ttlMs) {
      this.store.delete(key);
      return { found: false };
    }

    entry.accessCount++;
    entry.lastAccessed = new Date().toISOString();
    this.store.set(key, entry as CacheEntry<unknown>);

    return { found: true, value: entry.value, entry };
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: new Date().toISOString(),
      ttlMs: ttlMs ?? this.config.decisionCacheTtlMs,
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
    };

    this.store.set(key, entry as CacheEntry<unknown>);
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  getStats(): { entries: number; maxEntries: number; oldest: string | null; newest: string | null } {
    let oldest: string | null = null;
    let newest: string | null = null;

    for (const entry of this.store.values()) {
      if (!oldest || entry.createdAt < oldest) oldest = entry.createdAt;
      if (!newest || entry.createdAt > newest) newest = entry.createdAt;
    }

    return {
      entries: this.store.size,
      maxEntries: this.config.maxEntries,
      oldest,
      newest,
    };
  }

  makeKey(prefix: string, ...parts: string[]): string {
    const content = parts.join('|');
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
    return `${prefix}:${hash}`;
  }

  private evictLRU(): void {
    let oldest: { key: string; lastAccessed: string } | null = null;

    for (const [key, entry] of this.store.entries()) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = { key, lastAccessed: entry.lastAccessed };
      }
    }

    if (oldest) {
      this.store.delete(oldest.key);
    }
  }
}
