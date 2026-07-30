import { createLogger } from '@ideia/logger';
import {  ProjectionData, ProjectionState, ProjectionMetadata, ProjectionType,
  ProjectionStatus, ConsistencyLevel, DomainEvent, ProjectionHandler,
  BuildOptions, RebuildStrategy, RebuildProgress, ProjectionStore,
  ProjectionDefinition, CacheInvalidationStrategy, ConsistencyReport,
  DeduplicationStore,
} from './types';
const logger = createLogger('projection-engine');

class InMemoryProjectionStore implements ProjectionStore {
  private _store = new Map<string, ProjectionState>();

  async load(name: string): Promise<ProjectionState | null> {
    return this._store.get(name) ?? null;
  }

  async save(name: string, state: ProjectionState): Promise<void> {
    this._store.set(name, state);
  }

  async delete(name: string): Promise<void> {
    this._store.delete(name);
  }

  async swap(tempName: string, targetName: string): Promise<void> {
    const temp = this._store.get(tempName);
    if (temp) {
      this._store.set(targetName, temp);
      this._store.delete(tempName);
    }
  }

  async list(): Promise<ProjectionMetadata[]> {
    return Array.from(this._store.values()).map(s => s.metadata as ProjectionMetadata);
  }
}

export class ProjectionEngine<T extends ProjectionData = ProjectionData> {
  private _projections = new Map<string, { state: T; metadata: ProjectionMetadata; handlers: Map<string, (s: T, e: DomainEvent) => T> }>();

  constructor(
    private _store: ProjectionStore = new InMemoryProjectionStore(),
    private _cacheStrategy?: CacheInvalidationStrategy
  ) {}

  async register(name: string, streamName: string, initialState: T): Promise<void> {
    const existing = await this._store.load(name);
    if (existing) {
      this._projections.set(name, {
        state: existing.data as T,
        metadata: existing.metadata as ProjectionMetadata,
        handlers: new Map(),
      });
      return;
    }
    const metadata: ProjectionMetadata = {
      name,
      type: ProjectionType.INLINE,
      streamName,
      lastSequence: 0,
      lastUpdated: Date.now(),
      eventCount: 0,
      version: 1,
      status: ProjectionStatus.ACTIVE,
      consistencyLevel: ConsistencyLevel.EVENTUAL,
    };
    this._projections.set(name, { state: { ...initialState }, metadata, handlers: new Map() });
    await this._store.save(name, { data: { ...initialState } as ProjectionData, metadata });
  }

  handle(eventType: string, apply: (s: ProjectionData, e: DomainEvent) => ProjectionData): void {
    for (const [, proj] of this._projections) {
      proj.handlers.set(eventType, apply as (s: T, e: DomainEvent) => T);
    }
  }

  async process(name: string, event: DomainEvent): Promise<void> {
    const proj = this._projections.get(name);
    if (!proj) throw new Error(`Projection '${name}' not registered`);

    if (this._cacheStrategy?.isExpired(name, proj.metadata.lastUpdated)) {
      return;
    }

    const handler = proj.handlers.get(event.type) as ((s: T, e: DomainEvent) => T) | undefined;
    if (!handler) return;

    proj.state = handler(proj.state, event);
    proj.metadata.lastSequence = event.version;
    proj.metadata.lastUpdated = Date.now();
    proj.metadata.eventCount++;

    await this._store.save(name, {
      data: proj.state as ProjectionData,
      metadata: { ...proj.metadata },
    });
  }

  async getState(name: string): Promise<ProjectionState<T> | null> {
    const proj = this._projections.get(name);
    if (proj) {
      return { data: proj.state, metadata: proj.metadata };
    }
    return this._store.load(name) as Promise<ProjectionState<T> | null>;
  }

  async getStatus(name: string): Promise<ProjectionStatus | null> {
    const p = this._projections.get(name);
    return p?.metadata.status ?? null;
  }

  async rebuild(name: string, strategy: RebuildStrategy, streamName: string, initialState: T, handlerMap: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>, signal?: AbortSignal): Promise<RebuildProgress> {
    return strategy.execute(name, streamName, initialState as ProjectionData, handlerMap, signal);
  }

  async listProjections(): Promise<string[]> {
    const fromStore = (await this._store.list()).map(m => m.name);
    const fromMemory = Array.from(this._projections.keys());
    return Array.from(new Set([...fromMemory, ...fromStore]));
  }

  async deleteProjection(name: string): Promise<void> {
    this._projections.delete(name);
    await this._store.delete(name);
  }
}

export class FullRebuild implements RebuildStrategy {
  constructor(private _store: ProjectionStore) {}

  async execute(
    name: string, _streamName: string, initialState: ProjectionData,
    handlerMap: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>,
    signal?: AbortSignal
  ): Promise<RebuildProgress> {
    const start = Date.now();
    await this._store.delete(name);
    let processed = 0;
    for (const [, handler] of handlerMap) {
      if (signal?.aborted) break;
      initialState = handler(initialState, {
        id: `rebuild-${processed}`, aggregateId: '', type: 'rebuild',
        version: processed + 1, data: {}, timestamp: Date.now(),
      });
      processed++;
    }
    await this._store.save(name, {
      data: initialState,
      metadata: {
        name, type: 'materialized_view' as any, streamName: _streamName,
        lastSequence: processed, lastUpdated: Date.now(), eventCount: processed,
        version: 1, status: ProjectionStatus.ACTIVE, consistencyLevel: ConsistencyLevel.STRONG,
      },
    });
    return {
      projectionName: name, strategy: 'full', totalEvents: processed,
      processedEvents: processed, percentage: 100, startedAt: start,
      estimatedCompletion: Date.now(), errors: 0,
    };
  }
}

export class WarmRebuild implements RebuildStrategy {
  constructor(private _store: ProjectionStore) {}

  async execute(
    name: string, _streamName: string, _initialState: ProjectionData,
    _handlerMap: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>,
    _signal?: AbortSignal,
    buildFn?: (name: string) => Promise<ProjectionState>
  ): Promise<RebuildProgress> {
    const oldState = await this._store.load(name);
    const tempName = `${name}__warm`;
    if (!buildFn) throw new Error('buildFn required for warm rebuild');
    const result = await buildFn(tempName);
    await this._store.swap(tempName, name);
    return {
      projectionName: name, strategy: 'warm',
      totalEvents: result.metadata.eventCount,
      processedEvents: result.metadata.eventCount,
      percentage: 100, startedAt: Date.now(),
      estimatedCompletion: Date.now(), errors: 0,
    };
  }
}

export class ConsistencyMonitor {
  private _metrics = new Map<string, { lastCheck: number; lag: number }>();

  constructor(
    private _store: ProjectionStore,
    private _getStreamLastSeq: (streamName: string) => Promise<number>,
    private _alertThreshold = 1000
  ) {}

  async checkProjection(name: string): Promise<ConsistencyReport> {
    const state = await this._store.load(name);
    if (!state) return { name, lag: -1, status: 'unknown', detectedAt: Date.now() };
    const streamSeq = await this._getStreamLastSeq(state.metadata.streamName);
    const lag = streamSeq - state.metadata.lastSequence;
    this._metrics.set(name, { lastCheck: Date.now(), lag });
    return {
      name, lag,
      status: lag === 0 ? 'consistent' : lag > this._alertThreshold ? 'critical' : 'lagging',
      detectedAt: Date.now(), lastSequence: state.metadata.lastSequence, streamSequence: streamSeq,
    };
  }

  async checkAll(): Promise<ConsistencyReport[]> {
    const projections = await this._store.list();
    const reports: ConsistencyReport[] = [];
    for (const p of projections) {
      reports.push(await this.checkProjection(p.name));
    }
    return reports;
  }

  getLagHistory(name: string): Array<{ time: number; lag: number }> {
    const m = this._metrics.get(name);
    return m ? [{ time: m.lastCheck, lag: m.lag }] : [];
  }
}

export class AtLeastOnceProcessor {
  constructor(
    private _handler: (event: DomainEvent) => Promise<void>
  ) {}

  async process(event: DomainEvent): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await this._handler(event);
        return;
      } catch {
        retries--;
        if (retries === 0) throw new Error('Processing exhausted');
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }
}

export class ExactlyOnceProcessor {
  private _processed = new Map<string, number>();

  constructor(
    private _handler: (event: DomainEvent) => Promise<void>,
    private _dedupStore: DeduplicationStore,
    private _ttlMs = 86400000
  ) {}

  async process(event: DomainEvent): Promise<void> {
    const dedupKey = `${event.aggregateId}-${event.id}`;
    const alreadyProcessed = await this._dedupStore.exists(dedupKey);
    if (alreadyProcessed) return;
    await this._handler(event);
    await this._dedupStore.record(dedupKey, Date.now(), this._ttlMs);
  }
}
