import { AggregateRoot } from '../aggregate-root';
import { AggregateRepository } from '../aggregate-repository';
import { OptimisticConcurrencyManager, RetryStrategy } from '../concurrency-manager';
import { SnapshotStoreManager, FixedIntervalStrategy, AdaptiveThresholdStrategy, OnDemandStrategy, SizeBasedStrategy, HybridSnapshotStrategy, SnapshotRewriter } from '../snapshot-store';
import { EventStreamOptimizer, InMemoryEventStore } from '../event-stream-optimizer';
import { CQRSSeparatedRepository } from '../cqrs-separated-repository';
import { AvroEventSerializer } from '../avro-serializer';
import { DeltaCompressedSnapshot } from '../delta-compressed-snapshot';
import { DomainEvent, ConcurrencyError, SnapshotData, defaultRepoOptions } from '../types';

class TestAggregate extends AggregateRoot {
  items: string[] = [];
  status: string = 'pending';

  apply(event: DomainEvent): void {
    switch (event.type) {
      case 'ItemAdded': {
        this.items.push(event.data.item as string);
        this.version = event.version;
        break;
      }
      case 'StatusChanged': {
        this.status = event.data.status as string;
        this.version = event.version;
        break;
      }
    }
  }

  addItem(item: string): void {
    this.recordEvent('ItemAdded', { item });
  }

  changeStatus(status: string): void {
    this.recordEvent('StatusChanged', { status });
  }
}

describe('AggregateRoot', () => {
  it('should create with id and version 0', () => {
    const agg = new TestAggregate('agg-1');
    expect(agg.id).toBe('agg-1');
    expect(agg.version).toBe(0);
  });

  it('should record events and apply them', () => {
    const agg = new TestAggregate('agg-1');
    agg.addItem('item1');
    const events = agg.getPendingEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('ItemAdded');
    expect(events[0].data.item).toBe('item1');
    expect(agg.items).toContain('item1');
  });

  it('should clear pending events', () => {
    const agg = new TestAggregate('agg-1');
    agg.addItem('item1');
    agg.clearPendingEvents();
    expect(agg.getPendingEvents().length).toBe(0);
  });

  it('should snapshot and restore state', () => {
    const agg = new TestAggregate('agg-1');
    agg.addItem('item1');
    agg.clearPendingEvents();
    agg.addItem('item2');
    agg.clearPendingEvents();
    const snapshot = agg.toSnapshot();
    expect(snapshot.version).toBe(2);

    const restored = new TestAggregate('agg-1');
    restored.fromSnapshot(snapshot);
    expect(restored.version).toBe(2);
  });
});

describe('InMemoryEventStore', () => {
  it('should append and read events', async () => {
    const store = new InMemoryEventStore();
    const event: DomainEvent = { id: 'e1', aggregateId: 'agg-1', type: 'Test', version: 1, data: {}, timestamp: 1 };
    await store.append('test.agg-1', [event]);
    const info = await store.getStreamInfo('test.agg-1');
    expect(info.messageCount).toBe(1);
  });

  it('should read last event', async () => {
    const store = new InMemoryEventStore();
    await store.append('test.agg-1', [
      { id: 'e1', aggregateId: 'agg-1', type: 'A', version: 1, data: {}, timestamp: 1 },
      { id: 'e2', aggregateId: 'agg-1', type: 'B', version: 2, data: {}, timestamp: 2 },
    ]);
    const last = await store.readLastEvent('test.agg-1');
    expect(last?.type).toBe('B');
  });

  it('should get stream count', async () => {
    const store = new InMemoryEventStore();
    await store.ensureStream('s1');
    await store.ensureStream('s2');
    expect(store.getStreamCount()).toBe(2);
  });

  it('should calculate event count', async () => {
    const store = new InMemoryEventStore();
    await store.append('test.x', [{ id: 'a', aggregateId: 'x', type: 'A', version: 1, data: {}, timestamp: 1 }]);
    expect(store.getEventCount('test')).toBe(1);
  });

  it('should purge subject', async () => {
    const store = new InMemoryEventStore();
    await store.append('test.x', [
      { id: 'a', aggregateId: 'x', type: 'A', version: 1, data: {}, timestamp: 1 },
      { id: 'b', aggregateId: 'x', type: 'B', version: 2, data: {}, timestamp: 2 },
    ]);
    const count = await store.purgeSubject('test.x');
    expect(count).toBe(2);
    expect(store.getEventCount('test')).toBe(0);
  });
});

describe('AggregateRepository', () => {
  it('should create and load aggregate', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new SnapshotStoreManager();
    const repo = new AggregateRepository<TestAggregate>(
      'test', (id) => new TestAggregate(id), eventStore, snapshotStore, new OnDemandStrategy(), defaultRepoOptions
    );
    const agg = new TestAggregate('agg-1');
    agg.addItem('item1');
    await repo.save(agg, 0);
    const loaded = await repo.load('agg-1');
    expect(loaded.id).toBe('agg-1');
  });

  it('should return false for non-existent aggregate', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new SnapshotStoreManager();
    const repo = new AggregateRepository<TestAggregate>(
      'test', (id) => new TestAggregate(id), eventStore, snapshotStore, new OnDemandStrategy(), defaultRepoOptions
    );
    expect(await repo.exists('nonexistent')).toBe(false);
  });

  it('should throw on concurrency conflict', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new SnapshotStoreManager();
    const repo = new AggregateRepository<TestAggregate>(
      'test', (id) => new TestAggregate(id), eventStore, snapshotStore, new OnDemandStrategy(), defaultRepoOptions
    );
    const agg = new TestAggregate('conflict-1');
    agg.addItem('item1');
    await repo.save(agg, 0);
    const agg2 = new TestAggregate('conflict-1');
    agg2.addItem('item2');
    await expect(repo.save(agg2, 0)).rejects.toThrow(ConcurrencyError);
  });

  it('should save with correct expected version', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new SnapshotStoreManager();
    const repo = new AggregateRepository<TestAggregate>(
      'test', (id) => new TestAggregate(id), eventStore, snapshotStore, new OnDemandStrategy(), defaultRepoOptions
    );
    const agg = new TestAggregate('ver-test');
    agg.addItem('item1');
    await repo.save(agg, 0);
    expect(agg.version).toBe(1);
    agg.addItem('item2');
    await repo.save(agg, 1);
    expect(agg.version).toBe(2);
  });

  it('should delete aggregate', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new SnapshotStoreManager();
    await snapshotStore.save('del-test', { state: {}, version: 1, timestamp: Date.now() });
    const repo = new AggregateRepository<TestAggregate>(
      'test', (id) => new TestAggregate(id), eventStore, snapshotStore, new OnDemandStrategy(), defaultRepoOptions
    );
    await repo.delete('del-test');
    const loaded = await snapshotStore.load('del-test');
    expect(loaded).toBeNull();
  });

  it('should invalidate cache', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new SnapshotStoreManager();
    const repo = new AggregateRepository<TestAggregate>(
      'test', (id) => new TestAggregate(id), eventStore, snapshotStore, new OnDemandStrategy(), defaultRepoOptions
    );
    repo.invalidateCache('agg-1');
    repo.clearCache();
  });

  it('should register upcaster', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new SnapshotStoreManager();
    const repo = new AggregateRepository<TestAggregate>(
      'test', (id) => new TestAggregate(id), eventStore, snapshotStore, new OnDemandStrategy(), defaultRepoOptions
    );
    repo.registerUpcaster({ fromVersion: 1, toVersion: 2, upcast: (e) => e });
  });
});

describe('OptimisticConcurrencyManager', () => {
  it('should check version and throw on mismatch', async () => {
    const eventStore = new InMemoryEventStore();
    await eventStore.append('test.agg-1', [
      { id: 'e1', aggregateId: 'agg-1', type: 'T', version: 3, data: {}, timestamp: 1 },
    ]);
    const mgr = new OptimisticConcurrencyManager(eventStore, 'test');
    await expect(mgr.checkVersion('agg-1', 2)).rejects.toThrow(ConcurrencyError);
  });

  it('should pass version check on match', async () => {
    const eventStore = new InMemoryEventStore();
    await eventStore.append('test.agg-1', [
      { id: 'e1', aggregateId: 'agg-1', type: 'T', version: 3, data: {}, timestamp: 1 },
    ]);
    const mgr = new OptimisticConcurrencyManager(eventStore, 'test');
    await mgr.checkVersion('agg-1', 3);
  });

  it('should invalidate cache', () => {
    const eventStore = new InMemoryEventStore();
    const mgr = new OptimisticConcurrencyManager(eventStore, 'test');
    mgr.invalidate('agg-1');
    mgr.clearCache();
  });
});

describe('RetryStrategy', () => {
  it('should succeed on first attempt', async () => {
    let attempts = 0;
    const repo = {
      load: async (_id: string) => { attempts++; return { id: 'a', version: 1 }; },
      save: async (_agg: { id: string; version: number }, _ver: number) => { attempts++; },
      invalidateCache: (_id: string) => {},
    };
    const strategy = new RetryStrategy(repo, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
    const result = await strategy.execute('a', (_agg) => {});
    expect(result.version).toBe(1);
  });

  it('should retry on concurrency error', async () => {
    let attempts = 0;
    const repo = {
      load: async (_id: string) => { attempts++; return { id: 'a', version: attempts === 1 ? 2 : 1 }; },
      save: async (_agg: { id: string; version: number }, ver: number) => {
        if (ver !== 1) throw new ConcurrencyError('a', ver, 1);
      },
      invalidateCache: (_id: string) => {},
    };
    const strategy = new RetryStrategy(repo, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
    const result = await strategy.execute('a', (_agg) => {});
    expect(result.version).toBe(1);
    expect(attempts).toBe(2);
  });

  it('should throw after exhausting retries', async () => {
    const repo = {
      load: async (_id: string) => { return { id: 'a', version: 5 }; },
      save: async (_agg: { id: string; version: number }, _ver: number) => { throw new ConcurrencyError('a', _ver, 5); },
      invalidateCache: (_id: string) => {},
    };
    const strategy = new RetryStrategy(repo, { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10 });
    await expect(strategy.execute('a', (_agg) => {})).rejects.toThrow();
  });
});

describe('SnapshotStoreManager', () => {
  it('should save and load snapshot', async () => {
    const store = new SnapshotStoreManager();
    await store.save('agg-1', { state: { version: 5 }, version: 5, timestamp: Date.now() });
    const loaded = await store.load('agg-1');
    expect(loaded?.version).toBe(5);
  });

  it('should return null for missing snapshot', async () => {
    const store = new SnapshotStoreManager();
    expect(await store.load('missing')).toBeNull();
  });

  it('should delete snapshot', async () => {
    const store = new SnapshotStoreManager();
    await store.save('agg-1', { state: {}, version: 1, timestamp: 1 });
    await store.delete('agg-1');
    expect(await store.load('agg-1')).toBeNull();
  });

  it('should list snapshots with prefix', async () => {
    const store = new SnapshotStoreManager();
    await store.save('agg-1', { state: {}, version: 1, timestamp: 1 });
    await store.save('agg-2', { state: {}, version: 1, timestamp: 1 });
    const keys: string[] = [];
    for await (const key of store.list('agg-')) {
      keys.push(key);
    }
    expect(keys.length).toBe(2);
  });
});

describe('SnapshotStrategy', () => {
  it('FixedIntervalStrategy', () => {
    const s = new FixedIntervalStrategy(10);
    expect(s.shouldSnapshot({ version: 0 })).toBe(false);
    expect(s.shouldSnapshot({ version: 10 })).toBe(true);
    expect(s.shouldSnapshot({ version: 11 })).toBe(false);
  });

  it('AdaptiveThresholdStrategy', () => {
    const s = new AdaptiveThresholdStrategy();
    expect(s.shouldSnapshot({ version: 0 })).toBe(false);
    expect(s.shouldSnapshot({ version: 10 })).toBe(true);
    expect(s.shouldSnapshot({ version: 50 })).toBe(true);
  });

  it('OnDemandStrategy', () => {
    const s = new OnDemandStrategy();
    expect(s.shouldSnapshot({ version: 100 })).toBe(false);
  });

  it('SizeBasedStrategy', () => {
    const s = new SizeBasedStrategy(5);
    expect(s.shouldSnapshot({ id: 'a', version: 6 })).toBe(true);
    expect(s.shouldSnapshot({ id: 'a', version: 7 })).toBe(false);
  });

  it('HybridSnapshotStrategy', () => {
    const s = new HybridSnapshotStrategy(new FixedIntervalStrategy(5), new OnDemandStrategy());
    expect(s.shouldSnapshot({ version: 5 })).toBe(true);
    expect(s.shouldSnapshot({ version: 3 })).toBe(false);
  });
});

describe('SnapshotRewriter', () => {
  it('should rewrite snapshots', async () => {
    const store = new SnapshotStoreManager();
    await store.save('agg-1', { state: { key: 'old' }, version: 1, timestamp: 1 });
    const rewriter = new SnapshotRewriter(store);
    const count = await rewriter.rewriteAll((state) => ({ ...state, key: 'new' }), 2);
    expect(count).toBe(1);
    const loaded = await store.load('agg-1');
    expect(loaded?.state.key).toBe('new');
    expect(loaded?.version).toBe(2);
  });
});

describe('EventStreamOptimizer', () => {
  it('should buffer and flush events', async () => {
    let flushed: Array<{ subject: string; events: DomainEvent[] }> = [];
    const opt = new EventStreamOptimizer(async (subject, events) => {
      flushed.push({ subject, events });
    }, 10);
    const event: DomainEvent = { id: 'e1', aggregateId: 'agg-1', type: 'T', version: 1, data: {}, timestamp: 1 };
    opt.append('test.agg-1', event);
    await opt.flush('test.agg-1');
    expect(flushed.length).toBe(1);
    expect(flushed[0].events.length).toBe(1);
  });

  it('should flush based on max batch size', async () => {
    let flushed: Array<{ subject: string; events: DomainEvent[] }> = [];
    const opt = new EventStreamOptimizer(async (subject, events) => {
      flushed.push({ subject, events });
    }, 1000, 3);
    for (let i = 0; i < 3; i++) {
      opt.append('test.agg-1', { id: `e${i}`, aggregateId: 'agg-1', type: 'T', version: i, data: {}, timestamp: i });
    }
    expect(flushed.length).toBe(1);
  });

  it('should flush all buffers', async () => {
    let flushed: string[] = [];
    const opt = new EventStreamOptimizer(async (subject) => {
      flushed.push(subject);
    }, 1000);
    opt.append('s1', { id: 'e1', aggregateId: 'a', type: 'T', version: 1, data: {}, timestamp: 1 });
    opt.append('s2', { id: 'e2', aggregateId: 'b', type: 'T', version: 1, data: {}, timestamp: 1 });
    await opt.flushAll();
    expect(flushed.length).toBe(2);
  });

  it('should report buffer size', () => {
    const opt = new EventStreamOptimizer(async () => {}, 1000);
    expect(opt.bufferSize).toBe(0);
    opt.append('s1', { id: 'e1', aggregateId: 'a', type: 'T', version: 1, data: {}, timestamp: 1 });
    expect(opt.bufferSize).toBe(1);
  });
});

describe('CQRSSeparatedRepository', () => {
  it('should save and sync read model', async () => {
    const writeStore = new InMemoryEventStore();
    const readStore: { data: Map<string, Record<string, unknown>> } = { data: new Map() };
    const projectionStore = {
      load: async (id: string) => readStore.data.has(id) ? { data: readStore.data.get(id)!, metadata: {} } : null,
      save: async (id: string, entry: { data: Record<string, unknown>; metadata: Record<string, unknown> }) => { readStore.data.set(id, entry.data); },
      delete: async (id: string) => { readStore.data.delete(id); },
    };
    const repo = new CQRSSeparatedRepository(writeStore, projectionStore, 'test');
    const agg = new TestAggregate('cqrs-1');
    agg.addItem('x');
    await repo.save(agg, 0);
    await repo.syncReadModel('cqrs-1');
    const model = await repo.loadReadModel<Record<string, unknown>>('cqrs-1');
    expect(model).not.toBeNull();
  });

  it('should delete read model', async () => {
    const writeStore = new InMemoryEventStore();
    const projectionStore = { load: async () => null, save: async () => {}, delete: async () => {} };
    const repo = new CQRSSeparatedRepository(writeStore, projectionStore, 'test');
    await repo.deleteReadModel('test-id');
  });
});

describe('AvroEventSerializer', () => {
  it('should register schema', () => {
    const ser = new AvroEventSerializer();
    ser.registerSchema('Test', { type: 'record', fields: [{ name: 'a', type: 'string' }] });
  });

  it('should serialize and deserialize', () => {
    const ser = new AvroEventSerializer();
    const event: DomainEvent = { id: 'e1', aggregateId: 'a', type: 'Test', version: 1, data: { key: 'val' }, timestamp: 100 };
    const bytes = ser.serialize(event);
    const deserialized = ser.deserialize(bytes, 'Test');
    expect(deserialized.type).toBe('Test');
    expect(deserialized.version).toBe(1);
  });

  it('should detect schema evolution', () => {
    const ser = new AvroEventSerializer();
    const oldSchema = { type: 'record', name: 'T', version: 1, fields: [{ name: 'a', type: 'string' }] };
    const newSchema = { type: 'record', name: 'T', version: 2, fields: [{ name: 'a', type: 'string' }, { name: 'b', type: 'int' }] };
    const migration = ser.evolveSchema(oldSchema, newSchema);
    expect(migration.compatibility).toBe('BACKWARD');
    expect(migration.added).toContain('b');
  });

  it('should detect incompatible evolution', () => {
    const ser = new AvroEventSerializer();
    const oldSchema = { type: 'record', name: 'T', version: 1, fields: [{ name: 'a', type: 'string' }] };
    const newSchema = { type: 'record', name: 'T', version: 2, fields: [{ name: 'b', type: 'int' }] };
    const migration = ser.evolveSchema(oldSchema, newSchema);
    expect(migration.compatibility).toBe('NONE');
    expect(migration.removed).toContain('a');
  });
});

describe('DeltaCompressedSnapshot', () => {
  it('should compute delta', async () => {
    const dcs = new DeltaCompressedSnapshot();
    const result = await dcs.saveWithDelta('agg-1', { a: 1, b: 2 }, 1);
    expect(result.aggregateId).toBe('agg-1');
    expect(result.version).toBe(1);
  });

  it('should compute delta only changed fields', async () => {
    const dcs = new DeltaCompressedSnapshot();
    await dcs.saveWithDelta('agg-1', { a: 1, b: 2 }, 1);
    const result = await dcs.saveWithDelta('agg-1', { a: 1, b: 3 }, 2);
    expect(result.delta.a).toBeUndefined();
    expect(result.delta.b).toBe(3);
  });

  it('should reconstruct state from deltas', () => {
    const dcs = new DeltaCompressedSnapshot();
    const state = dcs.reconstruct('agg-1', [
      { version: 1, changes: { a: 1, b: 2 }, timestamp: 1 },
      { version: 2, changes: { b: 3 }, timestamp: 2 },
    ]);
    expect(state.a).toBe(1);
    expect(state.b).toBe(3);
  });

  it('should handle null values in delta', async () => {
    const dcs = new DeltaCompressedSnapshot();
    await dcs.saveWithDelta('agg-1', { a: 1, b: 2 }, 1);
    const result = await dcs.saveWithDelta('agg-1', { a: 1 }, 2);
    expect(result.delta.b).toBeNull();
  });

  it('should clear cache', () => {
    const dcs = new DeltaCompressedSnapshot();
    dcs.clearCache();
  });
});

describe('ConcurrencyError', () => {
  it('should create with message', () => {
    const err = new ConcurrencyError('agg-1', 1, 3);
    expect(err.message).toContain('agg-1');
    expect(err.expectedVersion).toBe(1);
    expect(err.actualVersion).toBe(3);
  });
});
