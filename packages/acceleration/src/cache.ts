import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface CacheEntry {
  key: string;
  value: unknown;
  createdAt: string;
  ttlMs: number;
  accessOrder?: number;
}

export class JsonCache {
  private data: CacheEntry[] = [];
  private accessCounter = 0;
  private _hits = 0;
  private _misses = 0;

  constructor(
    private file: string,
    private maxEntries = 1000,
    private inMemoryOnly = false
  ) {
    if (!inMemoryOnly) this.load();
  }

  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }
  get size(): number { return this.data.length; }

  private load(): void {
    try {
      if (!existsSync(this.file)) return;
      this.loadFrom(JSON.parse(readFileSync(this.file, 'utf8')));
    } catch {
      this.data = [];
    }
  }

  private saveIfPersistent(): void {
    if (this.inMemoryOnly) return;
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {
    }
  }

  loadFrom(data: CacheEntry[]): void {
    this.data = data.map(e => ({ ...e, accessOrder: e.accessOrder ?? ++this.accessCounter }));
  }

  get<T>(key: string): T | undefined {
    const now = Date.now();
    const entry = this.data.find(item => item.key === key);
    if (!entry) { this._misses++; return undefined; }
    const age = now - new Date(entry.createdAt).getTime();
    if (age > entry.ttlMs) { this._misses++; return undefined; }
    entry.accessOrder = ++this.accessCounter;
    this._hits++;
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs = 1000 * 60 * 30): void {
    this.data = this.data.filter(item => item.key !== key);
    this.data.push({ key, value, createdAt: new Date().toISOString(), ttlMs, accessOrder: ++this.accessCounter });
    if (this.data.length > this.maxEntries) this.evictLRU();
    this.saveIfPersistent();
  }

  getOrCompute<T>(key: string, fn: () => T, ttlMs = 1000 * 60 * 30): T {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = fn();
    this.set(key, value, ttlMs);
    return value;
  }

  private evictLRU(): void {
    this.data.sort((a, b) => (a.accessOrder ?? 0) - (b.accessOrder ?? 0));
    while (this.data.length > this.maxEntries) this.data.shift();
  }

  cleanup(): void {
    const now = Date.now();
    this.data = this.data.filter(item => now - new Date(item.createdAt).getTime() <= item.ttlMs);
    this.saveIfPersistent();
  }

  clear(): void {
    this.data = [];
    this._hits = 0;
    this._misses = 0;
    this.accessCounter = 0;
    this.saveIfPersistent();
  }

  stats(): { entries: number; hits: number; misses: number; hitRate: number; maxEntries: number } {
    const total = this._hits + this._misses;
    return {
      entries: this.data.length,
      hits: this._hits,
      misses: this._misses,
      hitRate: total === 0 ? 0 : Math.round((this._hits / total) * 10000) / 100,
      maxEntries: this.maxEntries,
    };
  }
}
