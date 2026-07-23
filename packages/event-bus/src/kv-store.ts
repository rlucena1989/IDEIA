import { NatsConnectionManager } from './nats-connection';
import { createLogger } from '@ideia/logger';

const log = createLogger('kv-store');

export interface KVEntry {
  key: string;
  value: unknown;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface KVStoreConfig {
  maxAge?: number;
  maxEntries?: number;
  natsBucket?: string;
}

const DEFAULT_KV_CONFIG: KVStoreConfig = {
  maxAge: 24 * 60 * 60 * 1000,
  maxEntries: 10000,
  natsBucket: 'ideia_kv',
};

export class KVStore {
  private connectionManager: NatsConnectionManager;
  private config: KVStoreConfig;
  private store: Map<string, KVEntry> = new Map();
  private versionCounter: number = 0;
  private natsConnected = false;

  constructor(connectionManager: NatsConnectionManager, config: KVStoreConfig = {}) {
    this.connectionManager = connectionManager;
    this.config = { ...DEFAULT_KV_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    try {
      await this.connectionManager.connect();
      this.natsConnected = await this.connectionManager.hasJetStream();
    } catch (_err) {
      log.info(`Initialized (offline mode): ${err}`);
      return;
    }
    log.info(`Initialized (NATS: ${this.natsConnected ? 'connected' : 'offline'})`);
  }

  private async natsOp<T>(op: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (!this.natsConnected) return fallback();
    try { return await op(); } catch { this.natsConnected = false; return fallback(); }
  }

  async put(key: string, value: unknown): Promise<number> {
    const now = Date.now();
    this.versionCounter++;
    const entry: KVEntry = { key, value, version: this.versionCounter, createdAt: now, updatedAt: now };
    this.store.set(key, entry);
    await this.cleanup();
    log.info(`Put key: ${key} (version ${entry.version})`);
    return entry.version;
  }

  async get(key: string): Promise<KVEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.config.maxAge && (Date.now() - entry.updatedAt) > this.config.maxAge) {
      await this.delete(key);
      return null;
    }
    return entry;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.store.delete(key);
    if (deleted) log.info(`Deleted key: ${key}`);
    return deleted;
  }

  async update(key: string, value: unknown, expectedVersion?: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) throw new Error(`Key ${key} not found`);
    if (expectedVersion !== undefined && entry.version !== expectedVersion) {
      throw new Error(`Version mismatch for key ${key}: expected ${expectedVersion}, got ${entry.version}`);
    }
    return await this.put(key, value);
  }

  async keys(): Promise<string[]> { return Array.from(this.store.keys()); }
  async entries(): Promise<KVEntry[]> { return Array.from(this.store.values()); }
  async has(key: string): Promise<boolean> { return this.store.has(key); }

  async clear(): Promise<void> {
    const count = this.store.size;
    this.store.clear();
    log.info(`Cleared ${count} entries`);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    if (this.config.maxAge) {
      for (const [key, entry] of this.store.entries()) {
        if ((now - entry.updatedAt) > this.config.maxAge) {
          this.store.delete(key);
        }
      }
    }
    if (this.config.maxEntries && this.store.size > this.config.maxEntries) {
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const toRemove = entries.slice(0, this.store.size - this.config.maxEntries);
      for (const [key] of toRemove) { this.store.delete(key); }
    }
  }

  async getStats(): Promise<{ totalEntries: number; totalVersions: number }> {
    return { totalEntries: this.store.size, totalVersions: this.versionCounter };
  }
}

export function createKVStore(
  connectionManager: NatsConnectionManager,
  config?: KVStoreConfig
): KVStore {
  return new KVStore(connectionManager, config);
}
