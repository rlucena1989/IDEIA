import { createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('nats-kv-cache');

interface KvContext {
  get(key: string): Promise<{ value: Uint8Array } | null>;
  put(key: string, value: Uint8Array, opts?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export class NATSKVCache {
  private _store: Map<string, { embedding: number[]; timestamp: number }> = new Map();
  private _ttlDays: number;

  constructor(ttlDays: number = 7) {
    this._ttlDays = ttlDays;
  }

  async get(text: string, modelName: string): Promise<number[] | null> {
    const key = this._buildKey(text, modelName);
    const cached = this._store.get(key);
    if (!cached) return null;
    const age = Date.now() - cached.timestamp;
    if (age > this._ttlDays * 86400000) {
      this._store.delete(key);
      return null;
    }
    return cached.embedding;
  }

  async set(text: string, embedding: number[], modelName: string): Promise<void> {
    const key = this._buildKey(text, modelName);
    this._store.set(key, { embedding, timestamp: Date.now() });
  }

  async getBatch(texts: string[], modelName: string): Promise<Map<string, number[] | null>> {
    const results = new Map<string, number[] | null>();
    for (const text of texts) {
      results.set(text, await this.get(text, modelName));
    }
    return results;
  }

  async invalidate(text: string, modelName: string): Promise<void> {
    const key = this._buildKey(text, modelName);
    this._store.delete(key);
  }

  async purge(maxAgeDays?: number): Promise<number> {
    const age = (maxAgeDays || this._ttlDays) * 86400000;
    let purged = 0;
    for (const [key, value] of this._store) {
      if (Date.now() - value.timestamp > age) {
        this._store.delete(key);
        purged++;
      }
    }
    return purged;
  }

  getSize(): number {
    return this._store.size;
  }

  clear(): void {
    this._store.clear();
  }

  private _buildKey(text: string, modelName: string): string {
    const hash = createHash('sha256').update(text).digest('hex').substring(0, 16);
    return 'emb:' + modelName + ':' + hash;
  }
}