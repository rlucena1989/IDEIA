import { createLogger } from '@ideia/logger';
import {  ProjectionData, ProjectionState, ProjectionMetadata, ProjectionType,
  ProjectionStatus, ConsistencyLevel, DomainEvent, ProjectionHandler,
  BuildOptions, ProjectionStore,
} from './types';
const logger = createLogger('live-projection');

export class LiveProjection<T extends ProjectionData = ProjectionData> {
  private _state: T;
  private _handlers = new Map<string, (s: T, e: DomainEvent) => T>();
  private _metadata: ProjectionMetadata;

  constructor(
    public readonly name: string,
    public readonly streamName: string,
    public readonly initialState: T,
    private _store: ProjectionStore
  ) {
    this._state = { ...initialState };
    this._metadata = this._createInitialMetadata();
  }

  handle(eventType: string, apply: (s: T, e: DomainEvent) => T): this {
    this._handlers.set(eventType, apply);
    return this;
  }

  async process(event: DomainEvent): Promise<void> {
    const handler = this._handlers.get(event.type);
    if (!handler) return;

    this._state = handler(this._state, event);
    this._metadata.lastSequence = event.version;
    this._metadata.lastUpdated = Date.now();
    this._metadata.eventCount++;

    await this._store.save(this.name, {
      data: this._state as ProjectionData,
      metadata: this._metadata,
    });
  }

  async build(_opts?: BuildOptions): Promise<ProjectionState<T>> {
    return { data: this._state, metadata: this._metadata };
  }

  async getState(): Promise<ProjectionState<T> | null> {
    const stored = await this._store.load(this.name);
    if (stored) return stored as ProjectionState<T>;
    return { data: this._state, metadata: this._metadata };
  }

  async getStatus(): Promise<ProjectionStatus> {
    return this._metadata.status;
  }

  private _createInitialMetadata(): ProjectionMetadata {
    return {
      name: this.name,
      type: ProjectionType.INLINE,
      streamName: this.streamName,
      lastSequence: 0,
      lastUpdated: Date.now(),
      eventCount: 0,
      version: 1,
      status: ProjectionStatus.ACTIVE,
      consistencyLevel: ConsistencyLevel.STRONG,
    };
  }
}
