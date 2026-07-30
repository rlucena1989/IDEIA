import { EventStore, ConcurrencyError } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('concurrency-manager');

export class OptimisticConcurrencyManager {
  private _versionCache = new Map<string, { version: number; expiresAt: number }>();

  constructor(
    private _eventStore: EventStore,
    private _streamName: string,
    private _cacheTTL = 1000
  ) {}

  async checkVersion(aggregateId: string, expectedVersion: number): Promise<void> {
    const current = await this.getCurrentVersion(aggregateId);
    if (expectedVersion !== current) {
      throw new ConcurrencyError(aggregateId, expectedVersion, current);
    }
  }

  async getCurrentVersion(aggregateId: string): Promise<number> {
    const cached = this._versionCache.get(aggregateId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.version;
    }

    const lastEvent = await this._eventStore.readLastEvent(`${this._streamName}.${aggregateId}`);
    const version = lastEvent?.version ?? 0;

    this._versionCache.set(aggregateId, {
      version,
      expiresAt: Date.now() + this._cacheTTL,
    });
    return version;
  }

  invalidate(aggregateId: string): void {
    this._versionCache.delete(aggregateId);
  }

  clearCache(): void {
    this._versionCache.clear();
  }
}

export class RetryStrategy {
  constructor(
    private _repository: { load: (id: string) => Promise<{ id: string; version: number }>; save: (agg: { id: string; version: number }, expectedVersion: number) => Promise<void>; invalidateCache: (id: string) => void },
    private _options: {
      maxRetries: number;
      baseDelayMs: number;
      maxDelayMs: number;
    } = { maxRetries: 3, baseDelayMs: 50, maxDelayMs: 2000 }
  ) {}

  async execute<T extends { id: string; version: number }>(
    aggregateId: string,
    operation: (aggregate: T) => void
  ): Promise<{ aggregate: T; version: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this._options.maxRetries; attempt++) {
      try {
        const aggregate = await this._repository.load(aggregateId) as T;
        const expectedVersion = aggregate.version;
        operation(aggregate);
        await this._repository.save(aggregate, expectedVersion);
        return { aggregate, version: aggregate.version };
      } catch (err) {
        if (err instanceof ConcurrencyError) {
          lastError = err;
          const delay = Math.min(
            this._options.baseDelayMs * Math.pow(2, attempt - 1),
            this._options.maxDelayMs
          );
          this._repository.invalidateCache(aggregateId);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    throw lastError ?? new Error(`Retry exhausted for ${aggregateId}`);
  }
}

export class PessimisticLock {
  constructor(
    private _kv: { get: (key: string) => Promise<{ value: Uint8Array } | null>; put: (key: string, value: Uint8Array) => Promise<void>; delete: (key: string) => Promise<void> },
    private _lockTTL = 30000
  ) {}

  async acquire(aggregateId: string, ownerId: string): Promise<boolean> {
    const key = `lock:${aggregateId}`;
    const existing = await this._kv.get(key);
    if (existing) {
      const lock = JSON.parse(new TextDecoder().decode(existing.value)) as { ownerId: string; acquiredAt: number; ttl: number };
      if (Date.now() - lock.acquiredAt < this._lockTTL) return false;
      await this._kv.delete(key);
    }

    await this._kv.put(key, new TextEncoder().encode(JSON.stringify({
      ownerId,
      acquiredAt: Date.now(),
      ttl: this._lockTTL,
    })));
    return true;
  }

  async release(aggregateId: string, ownerId: string): Promise<void> {
    const key = `lock:${aggregateId}`;
    const entry = await this._kv.get(key);
    if (entry) {
      const lock = JSON.parse(new TextDecoder().decode(entry.value)) as { ownerId: string };
      if (lock.ownerId === ownerId) await this._kv.delete(key);
    }
  }
}
