interface CacheEntry<V> { value: V; timestamp: number }
interface CacheStats { size: number; hits: number; misses: number; hitRate: number }

export class LRUCache<K, V> {
  private _cache: Map<K, CacheEntry<V>>;
  private _hits = 0;
  private _misses = 0;

  constructor(private _config: { maxSize: number; ttl: number }) {
    this._cache = new Map();
  }

  get(key: K): V | null {
    const entry = this._cache.get(key);
    if (!entry) { this._misses++; return null; }
    if (Date.now() - entry.timestamp > this._config.ttl) { this._cache.delete(key); this._misses++; return null; }
    this._hits++; this._cache.delete(key); this._cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this._cache.has(key)) this._cache.delete(key);
    else if (this._cache.size >= this._config.maxSize) {
      const lruKey = this._cache.keys().next().value;
      if (lruKey !== undefined) this._cache.delete(lruKey);
    }
    this._cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void { this._cache.clear(); this._hits = 0; this._misses = 0; }

  getStats(): CacheStats {
    const total = this._hits + this._misses;
    return { size: this._cache.size, hits: this._hits, misses: this._misses, hitRate: total > 0 ? this._hits / total : 0 };
  }
}
