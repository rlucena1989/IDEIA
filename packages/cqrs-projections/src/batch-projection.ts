import { createLogger } from '@ideia/logger';
import {  ProjectionData, ProjectionState, ProjectionMetadata, ProjectionType,
  ProjectionStatus, ConsistencyLevel, DomainEvent, RebuildProgress,
  RebuildStrategyType, ProjectionStore,
} from './types';
const logger = createLogger('batch-projection');

export class BatchProjection<T extends ProjectionData = ProjectionData> {
  private _state: T;

  constructor(
    public readonly name: string,
    public readonly streamName: string,
    public readonly initialState: T,
    private _store: ProjectionStore,
    private _handlers: Map<string, (s: T, e: DomainEvent) => T> = new Map()
  ) {
    this._state = { ...initialState };
  }

  handle(eventType: string, apply: (s: T, e: DomainEvent) => T): this {
    this._handlers.set(eventType, apply);
    return this;
  }

  async processBatch(events: DomainEvent[]): Promise<number> {
    let processed = 0;
    for (const event of events) {
      const handler = this._handlers.get(event.type);
      if (!handler) continue;
      this._state = handler(this._state, event);
      processed++;
    }
    const metadata: ProjectionMetadata = {
      name: this.name, type: ProjectionType.MATERIALIZED_VIEW,
      streamName: this.streamName, lastSequence: events[events.length - 1]?.version ?? 0,
      lastUpdated: Date.now(), eventCount: (await this._store.load(this.name))?.metadata.eventCount ?? 0 + processed,
      version: 1, status: ProjectionStatus.ACTIVE, consistencyLevel: ConsistencyLevel.EVENTUAL,
    };
    await this._store.save(this.name, { data: this._state as ProjectionData, metadata });
    return processed;
  }

  async buildFromEvents(events: DomainEvent[]): Promise<RebuildProgress> {
    const start = Date.now();
    const total = events.length;
    const processed = await this.processBatch(events);
    return {
      projectionName: this.name, strategy: RebuildStrategyType.FULL,
      totalEvents: total, processedEvents: processed, percentage: 100,
      startedAt: start, estimatedCompletion: Date.now(), errors: 0,
    };
  }

  async getState(): Promise<ProjectionState<T> | null> {
    return this._store.load(this.name) as Promise<ProjectionState<T> | null>;
  }

  async getStatus(): Promise<ProjectionStatus> {
    const stored = await this._store.load(this.name);
    return stored?.metadata.status ?? ProjectionStatus.BUILDING;
  }
}
