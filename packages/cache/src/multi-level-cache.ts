interface CacheLevel<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs: number): void;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  hits: number;
  misses: number;
  hitRatio(): number;
}

export class MemoryCacheLevel<T> implements CacheLevel<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  hits = 0;
  misses = 0;

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  hitRatio(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 1 : this.hits / total;
  }
}

export interface MultiLevelCacheConfig {
  l1TtlMs: number;
  l2TtlMs: number;
  l3TtlMs: number;
  l1MaxSize: number;
}

export class MultiLevelCache<T> {
  private l1: MemoryCacheLevel<T>;
  private stats = { l1Hits: 0, l2Hits: 0, l3Hits: 0, misses: 0, total: 0 };

  constructor(
    private l2?: CacheLevel<T>,
    private l3?: CacheLevel<T>,
    private config: MultiLevelCacheConfig = { l1TtlMs: 60000, l2TtlMs: 300000, l3TtlMs: 3600000, l1MaxSize: 1000 },
  ) {
    this.l1 = new MemoryCacheLevel<T>();
  }

  async get(key: string, fetcher?: () => Promise<T>): Promise<T | undefined> {
    this.stats.total++;

    const l1Val = this.l1.get(key);
    if (l1Val !== undefined) { this.stats.l1Hits++; return l1Val; }

    if (this.l2) {
      const l2Val = this.l2.get(key);
      if (l2Val !== undefined) {
        this.stats.l2Hits++;
        this.l1.set(key, l2Val, this.config.l1TtlMs);
        return l2Val;
      }
    }

    if (this.l3) {
      const l3Val = this.l3.get(key);
      if (l3Val !== undefined) {
        this.stats.l3Hits++;
        this.l2?.set(key, l3Val, this.config.l2TtlMs);
        this.l1.set(key, l3Val, this.config.l1TtlMs);
        return l3Val;
      }
    }

    if (fetcher) {
      try {
        const value = await fetcher();
        await this.set(key, value);
        return value;
      } catch { /* fetcher failed, return undefined */ }
    }

    this.stats.misses++;
    return undefined;
  }

  async set(key: string, value: T): Promise<void> {
    this.l1.set(key, value, this.config.l1TtlMs);
    this.l2?.set(key, value, this.config.l2TtlMs);
    this.l3?.set(key, value, this.config.l3TtlMs);

    if (this.l1.size() > this.config.l1MaxSize) {
      this.l1.clear();
      this.l1.set(key, value, this.config.l1TtlMs);
    }
  }

  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    this.l2?.delete(key);
    this.l3?.delete(key);
  }

  async clear(): Promise<void> {
    this.l1.clear();
    this.l2?.clear();
    this.l3?.clear();
    this.stats = { l1Hits: 0, l2Hits: 0, l3Hits: 0, misses: 0, total: 0 };
  }

  getStats() {
    const total = this.stats.total || 1;
    return {
      l1HitRatio: this.l1.hitRatio(),
      overallHitRatio: (this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits) / total,
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      l3Hits: this.stats.l3Hits,
      misses: this.stats.misses,
      total: this.stats.total,
      l1Size: this.l1.size(),
    };
  }
}
