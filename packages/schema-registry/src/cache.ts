import { ValidationResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cache');

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

export class SchemaCache {
  private store: Map<string, CacheEntry<ValidationResult>> = new Map();
  private maxSize: number;
  private ttlMs: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxSize = 500, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(schemaName: string, dataHash: string): ValidationResult | undefined {
    const key = `${schemaName}:${dataHash}`;
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
    this.hits++;
    return entry.value;
  }

  set(schemaName: string, dataHash: string, result: ValidationResult): void {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next();
      if (firstKey.value) {
        this.store.delete(firstKey.value);
        this.evictions++;
      }
    }
    const key = `${schemaName}:${dataHash}`;
    this.store.set(key, {
      value: result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(schemaName?: string): void {
    if (!schemaName) {
      this.store.clear();
      return;
    }
    const prefix = `${schemaName}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}

export function createSchemaCache(maxSize?: number, ttlMs?: number): SchemaCache {
  return new SchemaCache(maxSize, ttlMs);
}
