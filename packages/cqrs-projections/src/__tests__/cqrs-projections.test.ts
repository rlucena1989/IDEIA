import { ProjectionEngine, FullRebuild, WarmRebuild, ConsistencyMonitor, AtLeastOnceProcessor, ExactlyOnceProcessor } from '../projection-engine';
import { LiveProjection } from '../live-projection';
import { BatchProjection } from '../batch-projection';
import { MaterializedViewManager } from '../materialized-view';
import { CompetingConsumerManager } from '../competing-consumer';
import { CacheInvalidator, VersionStampCache } from '../cache-invalidator';
import { IncrementalMaterializer } from '../incremental-materializer';
import { WarmStandbyProjection } from '../warm-standby';
import { MultiRegionProjectionReplicator } from '../multi-region-replicator';
import { DomainEvent, ProjectionData, ProjectionStatus, ProjectionStore, ProjectionState, ProjectionType, ConsistencyLevel, RebuildStrategyType } from '../types';

const testEvent = (type: string, version = 1): DomainEvent => ({
  id: `e-${version}`, aggregateId: 'agg-1', type,
  version, data: { key: `val-${version}` }, timestamp: Date.now(),
});

class InMemoryTestStore implements ProjectionStore {
  private _data = new Map<string, ProjectionState>();

  async load(name: string): Promise<ProjectionState | null> {
    return this._data.get(name) ?? null;
  }
  async save(name: string, state: ProjectionState): Promise<void> {
    this._data.set(name, state);
  }
  async delete(name: string): Promise<void> {
    this._data.delete(name);
  }
  async swap(tempName: string, targetName: string): Promise<void> {
    const temp = this._data.get(tempName);
    if (temp) {
      this._data.set(targetName, temp);
      this._data.delete(tempName);
    }
  }
  async list(): Promise<any[]> {
    return Array.from(this._data.values()).map(s => s.metadata);
  }
}

describe('ProjectionEngine', () => {
  it('should register and process events', async () => {
    const engine = new ProjectionEngine();
    await engine.register('test-proj', 'stream-1', { count: 0 });
    engine.handle('INCREMENT', (state, _event) => ({ count: (state.count as number) + 1 }));
    await engine.process('test-proj', testEvent('INCREMENT'));
    const state = await engine.getState('test-proj');
    expect(state?.data.count).toBe(1);
  });

  it('should return null status for unregistered', async () => {
    const engine = new ProjectionEngine();
    expect(await engine.getStatus('nonexistent')).toBeNull();
  });

  it('should list projections', async () => {
    const engine = new ProjectionEngine();
    await engine.register('p1', 's1', {});
    await engine.register('p2', 's2', {});
    const list = await engine.listProjections();
    expect(list).toContain('p1');
    expect(list).toContain('p2');
  });

  it('should delete projection', async () => {
    const engine = new ProjectionEngine();
    await engine.register('del-proj', 's1', {});
    await engine.deleteProjection('del-proj');
    expect(await engine.getState('del-proj')).toBeNull();
  });

  it('should rebuild via strategy', async () => {
    const store = new InMemoryTestStore();
    const engine = new ProjectionEngine(store);
    const handlerMap = new Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>();
    handlerMap.set('EVENT', (s) => ({ ...s, rebuilt: true }));
    const strategy = new FullRebuild(store);
    const progress = await engine.rebuild('rebuild-test', strategy, 'stream', {}, handlerMap);
    expect(progress.strategy).toBe('full');
    expect(progress.processedEvents).toBeGreaterThanOrEqual(0);
  });
});

describe('LiveProjection', () => {
  it('should process events and update state', async () => {
    const store = new InMemoryTestStore();
    const proj = new LiveProjection('live-1', 'stream', { count: 0 }, store);
    proj.handle('ADD', (s) => ({ count: (s.count as number) + 1 }));
    await proj.process(testEvent('ADD'));
    const state = await proj.getState();
    expect(state?.data.count).toBe(1);
  });

  it('should return status', async () => {
    const proj = new LiveProjection('live-2', 'stream', {}, new InMemoryTestStore());
    expect(await proj.getStatus()).toBe(ProjectionStatus.ACTIVE);
  });

  it('should return initial state on build', async () => {
    const proj = new LiveProjection('live-3', 'stream', { x: 1 }, new InMemoryTestStore());
    const result = await proj.build();
    expect(result.data.x).toBe(1);
  });
});

describe('BatchProjection', () => {
  it('should process batch of events', async () => {
    const store = new InMemoryTestStore();
    const proj = new BatchProjection('batch-1', 'stream', { count: 0 }, store);
    proj.handle('INC', (s) => ({ count: (s.count as number) + 1 }));
    const events = [testEvent('INC', 1), testEvent('INC', 2)];
    const processed = await proj.processBatch(events);
    expect(processed).toBe(2);
  });

  it('should return building status when no state', async () => {
    const proj = new BatchProjection('batch-2', 'stream', {}, new InMemoryTestStore());
    expect(await proj.getStatus()).toBe(ProjectionStatus.BUILDING);
  });

  it('should build from events', async () => {
    const store = new InMemoryTestStore();
    const proj = new BatchProjection('batch-3', 'stream', { v: 0 }, store);
    proj.handle('INC', (s) => ({ v: (s.v as number) + 1 }));
    const progress = await proj.buildFromEvents([testEvent('INC', 1), testEvent('INC', 2)]);
    expect(progress.strategy).toBe(RebuildStrategyType.FULL);
  });
});

describe('MaterializedViewManager', () => {
  it('should create view', () => {
    const mgr = new MaterializedViewManager();
    const view = mgr.create('orders', { total: 0 }, { total: 'number' });
    expect(view.name).toBe('orders');
    expect(view.version).toBe(1);
  });

  it('should update view', () => {
    const mgr = new MaterializedViewManager();
    mgr.create('orders', { total: 0 }, { total: 'number' });
    const updated = mgr.update('orders', (d) => ({ total: (d.total as number) + 10 }));
    expect(updated?.data.total).toBe(10);
    expect(updated?.version).toBe(2);
  });

  it('should return null for missing view', () => {
    const mgr = new MaterializedViewManager();
    expect(mgr.get('missing')).toBeNull();
  });

  it('should delete view', () => {
    const mgr = new MaterializedViewManager();
    mgr.create('v1', {}, {});
    expect(mgr.delete('v1')).toBe(true);
    expect(mgr.delete('v1')).toBe(false);
  });

  it('should list views', () => {
    const mgr = new MaterializedViewManager();
    mgr.create('a', {}, {});
    mgr.create('b', {}, {});
    expect(mgr.list().length).toBe(2);
  });

  it('should snapshot data', () => {
    const mgr = new MaterializedViewManager();
    mgr.create('v', { x: 1 }, { x: 'number' });
    expect(mgr.snapshot('v')).toEqual({ x: 1 });
  });
});

describe('CompetingConsumerManager', () => {
  it('should start and process events', async () => {
    const store = new InMemoryTestStore();
    const handlers = new Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>();
    handlers.set('EVT', (s) => ({ ...s, processed: true }));
    const mgr = new CompetingConsumerManager('cc-1', 'stream', store, handlers, 'group-1');
    await mgr.start();
    expect(mgr.isRunning()).toBe(true);
    await mgr.process(testEvent('EVT'));
    const state = await mgr.getState();
    expect(state?.processed).toBe(true);
  });

  it('should stop', async () => {
    const mgr = new CompetingConsumerManager('cc-2', 'stream', new InMemoryTestStore(), new Map());
    await mgr.start();
    await mgr.stop();
    expect(mgr.isRunning()).toBe(false);
  });

  it('should manage consumers', async () => {
    const mgr = new CompetingConsumerManager('cc-3', 'stream', new InMemoryTestStore(), new Map());
    await mgr.addConsumer('c1');
    await mgr.addConsumer('c2');
    expect(mgr.consumerCount).toBe(2);
    await mgr.removeConsumer('c1');
    expect(mgr.consumerCount).toBe(1);
  });
});

describe('CacheInvalidator', () => {
  it('should determine expiry', () => {
    const ci = new CacheInvalidator(100);
    expect(ci.isExpired('never-refreshed', Date.now())).toBe(true);
    ci.refresh('test', 10000);
    expect(ci.isExpired('test', Date.now())).toBe(false);
  });

  it('should invalidate', () => {
    const ci = new CacheInvalidator();
    ci.refresh('test', 10000);
    ci.invalidate('test');
    expect(ci.isExpired('test', Date.now())).toBe(true);
  });

  it('should register and invalidate on event', () => {
    const ci = new CacheInvalidator();
    ci.register('proj-1', ['UserUpdated', 'UserDeleted']);
    ci.refresh('proj-1', 10000);
    ci.onEvent('UserUpdated');
    expect(ci.isExpired('proj-1', Date.now())).toBe(true);
  });

  it('should clear', () => {
    const ci = new CacheInvalidator();
    ci.refresh('test', 10000);
    ci.clear();
    expect(ci.isExpired('test', Date.now())).toBe(true);
  });
});

describe('VersionStampCache', () => {
  it('should store and retrieve', () => {
    const cache = new VersionStampCache<string>(5000);
    cache.set('key', 'value', 1);
    expect(cache.get('key', 1)).toBe('value');
  });

  it('should reject on version mismatch', () => {
    const cache = new VersionStampCache<string>();
    cache.set('key', 'value', 1);
    expect(cache.get('key', 2)).toBeNull();
  });

  it('should reject on expiry', async () => {
    const cache = new VersionStampCache<string>(1);
    cache.set('key', 'value', 1);
    await new Promise(r => setTimeout(r, 5));
    expect(cache.get('key', 1)).toBeNull();
  });

  it('should invalidate', () => {
    const cache = new VersionStampCache<string>();
    cache.set('key', 'value', 1);
    cache.invalidate('key');
    expect(cache.get('key', 1)).toBeNull();
  });

  it('should clear and report size', () => {
    const cache = new VersionStampCache<string>();
    cache.set('a', '1', 1);
    cache.set('b', '2', 1);
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe('IncrementalMaterializer', () => {
  it('should register and process', async () => {
    const store = new InMemoryTestStore();
    const mat = new IncrementalMaterializer(store);
    const handlerMap = new Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>();
    handlerMap.set('EVT', (s, e) => ({ ...s, lastEvent: e.version }));
    await mat.register('inc-1', 'stream', handlerMap);
    await mat.process(testEvent('EVT', 1));
    const state = await mat.getState('inc-1');
    expect(state?.lastEvent).toBe(1);
  });

  it('should return 0 for missing sequence', () => {
    const mat = new IncrementalMaterializer(new InMemoryTestStore());
    expect(mat.getLastSequence('unknown')).toBe(0);
  });
});

describe('WarmStandbyProjection', () => {
  it('should warm up and switchover', async () => {
    const store = new InMemoryTestStore();
    const handlers = new Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>();
    handlers.set('EVT', (s, e) => ({ ...s, ver: e.version }));
    const wsp = new WarmStandbyProjection(store, 'ws-1', 'stream', handlers);
    await wsp.warmUp();
    await wsp.process(testEvent('EVT', 1));
    const active = wsp.active;
    const standby = wsp.standby;
    await wsp.switchover();
    expect(wsp.active).toBe(standby);
    expect(wsp.standby).toBe(active);
  });

  it('should get active state', async () => {
    const store = new InMemoryTestStore();
    await store.save('ws-2', { data: { initialized: true }, metadata: { name: 'ws-2', lastSequence: 1, lastUpdated: Date.now() } as any });
    const wsp = new WarmStandbyProjection(store, 'ws-2', 'stream', new Map());
    const state = await wsp.getActiveState<ProjectionData>();
    expect(state).not.toBeNull();
  });
});

describe('MultiRegionProjectionReplicator', () => {
  it('should add regions and replicate', async () => {
    const replicator = new MultiRegionProjectionReplicator();
    replicator.addRegion('us-east', new InMemoryTestStore(), 5);
    replicator.addRegion('eu-west', new InMemoryTestStore(), 40);
    expect(replicator.getRegions().length).toBe(2);
    await replicator.replicate('orders', { total: 100 });
  });

  it('should read from nearest', async () => {
    const replicator = new MultiRegionProjectionReplicator();
    const store1 = new InMemoryTestStore();
    const store2 = new InMemoryTestStore();
    replicator.addRegion('us-east', store1, 5);
    replicator.addRegion('eu-west', store2, 40);
    await replicator.replicate('data', { val: 42 });
    const result = await replicator.readFromNearest('data', 'us-east');
    expect(result?.data.val).toBe(42);
  });

  it('should resolve conflicts last-write-wins', async () => {
    const replicator = new MultiRegionProjectionReplicator();
    replicator.addRegion('us-east', new InMemoryTestStore(), 5);
    replicator.addRegion('eu-west', new InMemoryTestStore(), 40);
    const resolved = await replicator.resolveConflicts('data', 'last-write-wins');
    expect(resolved).toBeNull();
  });

  it('should resolve conflicts majority', async () => {
    const replicator = new MultiRegionProjectionReplicator();
    replicator.addRegion('us-east', new InMemoryTestStore(), 5);
    replicator.addRegion('eu-west', new InMemoryTestStore(), 40);
    const resolved = await replicator.resolveConflicts('data', 'majority');
    expect(resolved).toBeNull();
  });

  it('should get region status', async () => {
    const replicator = new MultiRegionProjectionReplicator();
    replicator.addRegion('us-east', new InMemoryTestStore(), 5);
    const status = await replicator.getRegionStatus();
    expect(status.length).toBe(1);
    expect(status[0].healthy).toBe(true);
  });

  it('should repair region', async () => {
    const replicator = new MultiRegionProjectionReplicator();
    const sourceStore = new InMemoryTestStore();
    const targetStore = new InMemoryTestStore();
    replicator.addRegion('us-east', sourceStore, 5);
    replicator.addRegion('eu-west', targetStore, 40);
    await replicator.replicate('orders', { total: 200 });
    await replicator.repairRegion('eu-west', 'us-east', 'orders');
  });

  it('should throw on invalid region repair', async () => {
    const replicator = new MultiRegionProjectionReplicator();
    await expect(replicator.repairRegion('invalid', 'source', 'x')).rejects.toThrow('Region not found');
  });

  it('should remove region', () => {
    const replicator = new MultiRegionProjectionReplicator();
    replicator.addRegion('us-east', new InMemoryTestStore(), 5);
    replicator.removeRegion('us-east');
    expect(replicator.getRegions().length).toBe(0);
  });
});

describe('ConsistencyMonitor', () => {
  it('should check projection consistency', async () => {
    const store = new InMemoryTestStore();
    await store.save('proj-1', {
      data: {}, metadata: { name: 'proj-1', type: ProjectionType.INLINE, streamName: 'stream', lastSequence: 5, lastUpdated: Date.now(), eventCount: 5, version: 1, status: ProjectionStatus.ACTIVE, consistencyLevel: ConsistencyLevel.EVENTUAL },
    });
    const monitor = new ConsistencyMonitor(store, async () => 10);
    const report = await monitor.checkProjection('proj-1');
    expect(report.lag).toBe(5);
    expect(report.status).toBe('lagging');
  });

  it('should report unknown for missing projection', async () => {
    const monitor = new ConsistencyMonitor(new InMemoryTestStore(), async () => 0);
    const report = await monitor.checkProjection('missing');
    expect(report.status).toBe('unknown');
  });

  it('should check all projections', async () => {
    const store = new InMemoryTestStore();
    await store.save('p1', { data: {}, metadata: { name: 'p1', type: ProjectionType.INLINE, streamName: 's', lastSequence: 5, lastUpdated: Date.now(), eventCount: 1, version: 1, status: ProjectionStatus.ACTIVE, consistencyLevel: ConsistencyLevel.EVENTUAL } });
    const monitor = new ConsistencyMonitor(store, async () => 5);
    const reports = await monitor.checkAll();
    expect(reports.length).toBe(1);
  });

  it('should return lag history', () => {
    const monitor = new ConsistencyMonitor(new InMemoryTestStore(), async () => 0);
    expect(monitor.getLagHistory('x').length).toBe(0);
  });
});

describe('AtLeastOnceProcessor', () => {
  it('should process event successfully', async () => {
    let processed = false;
    const proc = new AtLeastOnceProcessor(async () => { processed = true; });
    await proc.process(testEvent('T'));
    expect(processed).toBe(true);
  });
});

describe('ExactlyOnceProcessor', () => {
  it('should deduplicate events', async () => {
    let count = 0;
    const dedupStore = {
      exists: async () => false,
      record: async () => { count++; },
      purge: async () => 0,
    };
    const proc = new ExactlyOnceProcessor(async () => { count++; }, dedupStore);
    await proc.process(testEvent('T'));
    expect(count).toBe(2);
  });
});

describe('FullRebuild', () => {
  it('should execute rebuild', async () => {
    const store = new InMemoryTestStore();
    const strategy = new FullRebuild(store);
    const handlerMap = new Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>();
    handlerMap.set('E', (s) => ({ ...s, done: true }));
    const progress = await strategy.execute('full-test', 'stream', {}, handlerMap);
    expect(progress.percentage).toBe(100);
  });
});

describe('WarmRebuild', () => {
  it('should execute warm rebuild', async () => {
    const store = new InMemoryTestStore();
    const strategy = new WarmRebuild(store);
    const progress = await strategy.execute('warm-test', 'stream', {}, new Map(), undefined,
      async (name: string) => ({ data: { done: true }, metadata: { name, eventCount: 1, lastSequence: 1, lastUpdated: Date.now() } as any })
    );
    expect(progress.strategy).toBe('warm');
  });

  it('should throw without buildFn', async () => {
    const strategy = new WarmRebuild(new InMemoryTestStore());
    await expect(strategy.execute('warm-test', 'stream', {}, new Map())).rejects.toThrow('buildFn required');
  });
});
