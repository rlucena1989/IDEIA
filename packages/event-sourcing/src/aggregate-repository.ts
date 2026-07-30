import { AggregateRoot } from './aggregate-root';
import {
  DomainEvent, EventStore, SnapshotStore, SnapshotStrategy, RepositoryOptions,
  defaultRepoOptions, CacheEntry, ConcurrencyError, Upcaster,
} from './types';
import { OptimisticConcurrencyManager } from './concurrency-manager';
import { createLogger } from '@ideia/logger';

const _logger = createLogger('event-sourcing:repo');

export class UpcastChain {
  private _upcasters: Upcaster[] = [];

  register(upcaster: Upcaster): void {
    this._upcasters.push(upcaster);
    this._upcasters.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  upcast(event: DomainEvent): DomainEvent {
    let result = event;
    for (const upcaster of this._upcasters) {
      if (result.version >= upcaster.fromVersion && result.version < upcaster.toVersion) {
        result = upcaster.upcast(result);
      }
    }
    return result;
  }
}

export class AggregateRepository<T extends AggregateRoot> {
  private _identityMap = new Map<string, CacheEntry<T>>();
  private _concurrencyManager: OptimisticConcurrencyManager;
  private _upcastChain = new UpcastChain();

  constructor(
    private _streamName: string,
    private _factory: (id: string) => T,
    private _eventStore: EventStore,
    private _snapshotStore: SnapshotStore,
    private _snapshotStrategy: SnapshotStrategy,
    private _options: RepositoryOptions = defaultRepoOptions
  ) {
    this._concurrencyManager = new OptimisticConcurrencyManager(_eventStore, _streamName);
  }

  async load(id: string): Promise<T> {
    const cached = this._identityMap.get(id);
    if (cached && cached.isValid(this._options.cacheTTL)) return cached.aggregate;

    let aggregate = this._factory(id);
    let startVersion = 0;

    const snapshot = await this._snapshotStore.load(id);
    if (snapshot) {
      aggregate.fromSnapshot(snapshot.state);
      startVersion = snapshot.version;
    }

    const events = this._eventStore.readStream(this._streamName, {
      aggregateId: id,
      startSeq: startVersion > 0 ? startVersion + 1 : undefined,
    });

    for await (const event of events) {
      const upcasted = this._upcastChain.upcast(event);
      aggregate.apply(upcasted);
    }

    this._identityMap.set(id, { aggregate, storedAt: Date.now(), isValid(ttl: number): boolean { return Date.now() - this.storedAt < ttl; } });
    return aggregate;
  }

  async save(aggregate: T, expectedVersion: number): Promise<void> {
    const pending = aggregate.getPendingEvents();
    if (pending.length === 0) return;

    await this._concurrencyManager.checkVersion(aggregate.id, expectedVersion);
    await this._eventStore.append(this._streamName, pending);
    aggregate.clearPendingEvents();
    aggregate.version = expectedVersion + pending.length;

    if (this._snapshotStrategy.shouldSnapshot(aggregate)) {
      await this._snapshotStore.save(aggregate.id, {
        state: aggregate.toSnapshot(),
        version: aggregate.version,
        timestamp: Date.now(),
      });
    }

    this._identityMap.set(aggregate.id, { aggregate, storedAt: Date.now(), isValid(ttl: number): boolean { return Date.now() - this.storedAt < ttl; } });
    this._concurrencyManager.invalidate(aggregate.id);
  }

  async exists(id: string): Promise<boolean> {
    try {
      const info = await this._eventStore.getStreamInfo(`${this._streamName}.${id}`);
      return info.messageCount > 0;
    } catch {
      return false;
    }
  }

  async delete(id: string): Promise<void> {
    this._identityMap.delete(id);
    this._concurrencyManager.invalidate(id);
    await this._snapshotStore.delete(id);
  }

  invalidateCache(id: string): void {
    this._identityMap.delete(id);
  }

  clearCache(): void {
    this._identityMap.clear();
  }

  registerUpcaster(upcaster: Upcaster): void {
    this._upcastChain.register(upcaster);
  }
}
