import { createHash } from 'node:crypto';

interface CacheSlot {
  inputHash: string;
  result: unknown;
  timestamp: number;
  dirty: boolean;
}

export class IncrementalEngine {
  private cache = new Map<string, CacheSlot>();
  private _hits = 0;
  private _misses = 0;
  private _dirtyCount = 0;

  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }
  get dirtyCount(): number { return this._dirtyCount; }
  get size(): number { return this.cache.size; }

  private hashInputs(inputs: unknown[]): string {
    const hash = createHash('sha256');
    for (const inp of inputs) {
      hash.update(typeof inp === 'string' ? inp : JSON.stringify(inp));
    }
    return hash.digest('hex');
  }

  compute<T>(key: string, inputs: unknown[], fn: (...args: unknown[]) => T): T {
    const inputHash = this.hashInputs(inputs);
    const existing = this.cache.get(key);

    if (existing && !existing.dirty && existing.inputHash === inputHash) {
      this._hits++;
      return existing.result as T;
    }

    this._misses++;
    if (existing?.dirty) this._dirtyCount++;

    const result = fn(...inputs);
    this.cache.set(key, {
      inputHash,
      result,
      timestamp: Date.now(),
      dirty: false,
    });
    return result;
  }

  markDirty(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.dirty = true;
      this._dirtyCount++;
    }
  }

  markAllDirty(): void {
    for (const entry of this.cache.values()) {
      entry.dirty = true;
    }
    this._dirtyCount = this.cache.size;
  }

  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        const entry = this.cache.get(key);
        if (entry) entry.dirty = true;
        this._dirtyCount++;
      }
    }
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this._hits = 0;
    this._misses = 0;
    this._dirtyCount = 0;
  }

  getStats(): { entries: number; hits: number; misses: number; dirtyCount: number; hitRate: number } {
    const total = this._hits + this._misses;
    return {
      entries: this.cache.size,
      hits: this._hits,
      misses: this._misses,
      dirtyCount: this._dirtyCount,
      hitRate: total === 0 ? 0 : Math.round((this._hits / total) * 10000) / 100,
    };
  }
}
