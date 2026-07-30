import path from 'node:path';
import { createLogger } from '@ideia/logger';
import type { FileSystem } from '../io/interfaces';
import { getIO } from '../io/index';
const logger = createLogger('storage-provider');

export interface StorageEntry {
  key: string;
  value: unknown;
  timestamp: number;
  ttl?: number;
}

export interface StorageConfig {
  basePath?: string;
  defaultTtl?: number;
}

export interface StorageProvider {
  get(key: string): Promise<StorageEntry | undefined>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(prefix: string): Promise<StorageEntry[]>;
  clear(): Promise<void>;
}

export class LocalFileSystemStorage implements StorageProvider {
  private basePath: string;
  private fs_: FileSystem;

  constructor(config: StorageConfig = {}) {
    this.basePath = config.basePath || path.join(process.cwd(), '.ai', 'storage');
    this.fs_ = getIO().fs;
    this.fs_.ensureDir(this.basePath);
  }

  async get(key: string): Promise<StorageEntry | undefined> {
    const filePath = this.resolvePath(key);
    if (!this.fs_.exists(filePath)) return undefined;
    try {
      const raw = this.fs_.read(filePath);
      const entry = JSON.parse(raw) as StorageEntry;
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.fs_.remove(filePath);
        return undefined;
      }
      return entry;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const filePath = this.resolvePath(key);
    const entry: StorageEntry = { key, value, timestamp: Date.now(), ttl };
    this.fs_.ensureDir(path.dirname(filePath));
    this.fs_.write(filePath, JSON.stringify(entry));
  }

  async delete(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    if (!this.fs_.exists(filePath)) return false;
    this.fs_.remove(filePath);
    return true;
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    const dir = path.dirname(this.resolvePath(prefix));
    if (!this.fs_.exists(dir)) return [];
    const entries: StorageEntry[] = [];
    const files = this.fs_.readDir(dir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const fullPath = path.join(dir, file);
      try {
        const raw = this.fs_.read(fullPath);
        const entry = JSON.parse(raw) as StorageEntry;
        if (entry.key.startsWith(prefix)) {
          entries.push(entry);
        }
      } catch {
        continue;
      }
    }
    return entries;
  }

  async clear(): Promise<void> {
    if (this.fs_.exists(this.basePath)) {
      this.fs_.remove(this.basePath, { recursive: true, force: true });
      this.fs_.ensureDir(this.basePath);
    }
  }

  private resolvePath(key: string): string {
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.basePath, `${sanitized}.json`);
  }
}

export class InMemoryStorage implements StorageProvider {
  private store = new Map<string, StorageEntry>();

  async get(key: string): Promise<StorageEntry | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    this.store.set(key, { key, value, timestamp: Date.now(), ttl });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    return Array.from(this.store.values()).filter(e => e.key.startsWith(prefix));
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
