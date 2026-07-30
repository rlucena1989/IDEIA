import type { CacheLayer, CacheStats, WarmupEntry, BackupEntry } from './cache-layer';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cache-optimizer');

export interface CacheOptimizerConfig {
  defaultTtlMs: number;
  maxSize: number;
  compressionThreshold: number;
  enableCompression: boolean;
  enablePrediction: boolean;
}

interface CachePrediction {
  key: string;
  accessProbability: number;
  ttlMultiplier: number;
}

const DEFAULT_OPTIMIZER_CONFIG: CacheOptimizerConfig = {
  defaultTtlMs: 60000,
  maxSize: 10000,
  compressionThreshold: 10240,
  enableCompression: false,
  enablePrediction: false,
};

export class CacheOptimizer {
  private config: CacheOptimizerConfig;
  private accessLog: Map<string, { count: number; lastAccess: number; firstAccess: number }> = new Map();
  private cache: CacheLayer;
  private sweeperInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cache: CacheLayer, config?: Partial<CacheOptimizerConfig>) {
    this.cache = cache;
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
  }

  start(): void {
    this.sweeperInterval = setInterval(() => this.sweep(), 60000);
  }

  stop(): void {
    if (this.sweeperInterval) {
      clearInterval(this.sweeperInterval);
      this.sweeperInterval = null;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    this.recordAccess(key);
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (this.config.enablePrediction) {
      const prediction = this.predict(key);
      ttlMs = ttlMs ?? Math.round(this.config.defaultTtlMs * prediction.ttlMultiplier);
    }
    const effectiveTtl = ttlMs ?? this.config.defaultTtlMs;
    await this.cache.set(key, value, effectiveTtl);
  }

  async delete(key: string): Promise<boolean> {
    this.accessLog.delete(key);
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.accessLog.clear();
    return this.cache.clear();
  }

  async stats(): Promise<CacheStats & { optimizerHitRate: number }> {
    const base = await this.cache.stats();
    const totalPredictions = this.accessLog.size;
    const accuratePredictions = Array.from(this.accessLog.values()).filter(a => a.count > 1).length;
    return {
      ...base,
      optimizerHitRate: totalPredictions > 0 ? accuratePredictions / totalPredictions : 0,
    };
  }

  private recordAccess(key: string): void {
    const record = this.accessLog.get(key) || { count: 0, lastAccess: 0, firstAccess: Date.now() };
    record.count++;
    record.lastAccess = Date.now();
    this.accessLog.set(key, record);
  }

  private predict(key: string): CachePrediction {
    const record = this.accessLog.get(key);
    if (!record) {
      return { key, accessProbability: 0.5, ttlMultiplier: 1 };
    }
    const recency = Math.min(1, (Date.now() - record.lastAccess) / 3600000);
    const frequency = Math.min(1, record.count / 100);
    const accessProbability = frequency * (1 - recency * 0.5);
    const ttlMultiplier = 0.5 + accessProbability;
    return { key, accessProbability, ttlMultiplier };
  }

  async warmup(dataSource: () => Promise<WarmupEntry[]> | WarmupEntry[]): Promise<number> {
    const cacheLayer = this.cache as CacheLayer;
    if (typeof cacheLayer.warmup === 'function') {
      return cacheLayer.warmup(dataSource);
    }
    const entries = await dataSource();
    let loaded = 0;
    for (const entry of entries) {
      await this.cache.set(entry.key, entry.value, entry.ttlMs);
      this.recordAccess(entry.key);
      loaded++;
    }
    return loaded;
  }

  async backup(): Promise<BackupEntry[]> {
    const cacheLayer = this.cache as CacheLayer;
    if (typeof cacheLayer.backup === 'function') {
      return cacheLayer.backup();
    }
    throw new Error('Backup not supported by underlying cache');
  }

  async restore(entries: BackupEntry[]): Promise<void> {
    const cacheLayer = this.cache as CacheLayer;
    if (typeof cacheLayer.restore === 'function') {
      return cacheLayer.restore(entries);
    }
    for (const entry of entries) {
      const remainingTtl = (entry.expiresAt ?? 0) - Date.now();
      if (remainingTtl > 0) {
        await this.cache.set(entry.key, entry.value, remainingTtl);
        this.recordAccess(entry.key);
      }
    }
  }

  private async sweep(): Promise<void> {
    const now = Date.now();
    const staleKeys: string[] = [];
    for (const [key, record] of this.accessLog) {
      if (now - record.lastAccess > 3600000 && record.count < 3) {
        staleKeys.push(key);
      }
    }
    for (const key of staleKeys) {
      this.accessLog.delete(key);
    }
  }
}
