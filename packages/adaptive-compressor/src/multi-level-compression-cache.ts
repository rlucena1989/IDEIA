import { CacheEntry, CacheStats } from './types';
import { createLogger } from '@ideia/logger';
import { NeuralContextCompressor } from './neural-context-compressor';
const logger = createLogger('multi-level-compression-cache');

export class MultiLevelCompressionCache {
  private _l1 = new Map<string, CacheEntry>();
  private _l2 = new Map<string, CacheEntry>();
  private _l3 = new Map<string, CacheEntry>();
  private _currentSize = new Map<number, number>([[1, 0], [2, 0], [3, 0]]);

  private _config = {
    l1MaxSize: 10 * 1024 * 1024,
    l2MaxSize: 100 * 1024 * 1024,
    l3MaxSize: 500 * 1024 * 1024,
    l1TTL: 300000,
    l2TTL: 1800000,
    l3TTL: 86400000,
    promotionThreshold: 5,
  };

  private _compressor: NeuralContextCompressor;

  constructor(config?: Partial<typeof MultiLevelCompressionCache.prototype._config>) {
    if (config) Object.assign(this._config, config);
    this._compressor = new NeuralContextCompressor();
  }

  async get(key: string): Promise<string | null> {
    const levels: Array<[Map<string, CacheEntry>, number, number]> = [
      [this._l1, 1, this._config.l1TTL],
      [this._l2, 2, this._config.l2TTL],
      [this._l3, 3, this._config.l3TTL],
    ];

    for (const [cache, level, ttl] of levels) {
      const entry = cache.get(key);
      if (entry && Date.now() - entry.createdAt < ttl) {
        entry.accessCount++;
        entry.lastAccess = Date.now();

        if (level === 2 && entry.accessCount >= this._config.promotionThreshold) {
          await this._promote(entry, 2, 1);
        } else if (level === 3 && entry.accessCount >= this._config.promotionThreshold) {
          await this._promote(entry, 3, 2);
        }

        if (level === 1) return entry.data;
        if (level === 2) return entry.compressedData ?? entry.data;
        return entry.summaryData ?? entry.data;
      }
      if (entry && Date.now() - entry.createdAt >= ttl) {
        cache.delete(key);
        const currentSize = this._currentSize.get(level) ?? 0;
        this._currentSize.set(level, Math.max(0, currentSize - entry.size));
      }
    }

    return null;
  }

  async set(key: string, data: string, contextType: string): Promise<void> {
    const compressed = await this._compressor.compress(data, contextType);
    const summary = data.length <= 100
      ? data
      : data.substring(0, Math.ceil(data.length * 0.1)) + '\n...[summarized]';

    const entry: CacheEntry = {
      key, data, level: 1,
      compressedData: compressed.compressed,
      summaryData: summary,
      accessCount: 1,
      lastAccess: Date.now(),
      createdAt: Date.now(),
      size: Buffer.byteLength(data, 'utf-8'),
      contextType,
    };

    const l1Size = (this._currentSize.get(1) ?? 0) + entry.size;
    if (l1Size <= this._config.l1MaxSize) {
      this._l1.set(key, entry);
      this._currentSize.set(1, l1Size);
    } else if ((this._currentSize.get(2) ?? 0) + (compressed.compressed.length) <= this._config.l2MaxSize) {
      entry.level = 2;
      this._l2.set(key, entry);
      this._currentSize.set(2, (this._currentSize.get(2) ?? 0) + compressed.compressed.length);
    } else {
      entry.level = 3;
      entry.data = summary;
      this._l3.set(key, entry);
      this._currentSize.set(3, (this._currentSize.get(3) ?? 0) + Buffer.byteLength(summary, 'utf-8'));
    }
  }

  private async _promote(entry: CacheEntry, from: number, to: number): Promise<void> {
    const fromCache = from === 2 ? this._l2 : this._l3;
    fromCache.delete(entry.key);

    entry.level = to as 1 | 2 | 3;
    const targetCache = to === 1 ? this._l1 : this._l2;
    const targetMax = to === 1 ? this._config.l1MaxSize : this._config.l2MaxSize;
    const entrySize = entry.data.length;

    if ((this._currentSize.get(to) ?? 0) + entrySize <= targetMax) {
      targetCache.set(entry.key, entry);
      this._currentSize.set(to, (this._currentSize.get(to) ?? 0) + entrySize);
      this._currentSize.set(from, Math.max(0, (this._currentSize.get(from) ?? 0) - entrySize));
    } else {
      this._currentSize.set(from, Math.max(0, (this._currentSize.get(from) ?? 0) - entrySize));
    }
  }

  getStats(): { l1: CacheStats; l2: CacheStats; l3: CacheStats } {
    const toStats = (map: Map<string, CacheEntry>): CacheStats => {
      const entries = Array.from(map.values());
      return {
        entries: map.size,
        size: entries.reduce((s, e) => s + e.size, 0),
        avgAccessCount: entries.length > 0
          ? entries.reduce((s, e) => s + e.accessCount, 0) / entries.length
          : 0,
      };
    };

    return { l1: toStats(this._l1), l2: toStats(this._l2), l3: toStats(this._l3) };
  }

  clear(): void {
    this._l1.clear();
    this._l2.clear();
    this._l3.clear();
    this._currentSize.set(1, 0);
    this._currentSize.set(2, 0);
    this._currentSize.set(3, 0);
  }
}
