export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

export interface CacheOptions {
  ttlMs?: number;
  maxSize?: number;
  namespace?: string;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export interface CacheLayer {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  stats(): Promise<CacheStats>;
  keys(): Promise<string[]>;
  warmup?(dataSource: () => Promise<WarmupEntry[]> | WarmupEntry[]): Promise<number>;
  backup?(): Promise<BackupEntry[]>;
  restore?(entries: BackupEntry[]): Promise<void>;
}

export interface WarmupEntry {
  key: string;
  value: unknown;
  priority: number;
  ttlMs?: number;
}

export interface BackupEntry {
  key: string;
  value: unknown;
  timestamp: number;
  compressed: boolean;
  expiresAt?: number;
  hits?: number;
}
