import { createLogger } from '@ideia/logger';
import {  DomainEvent, ProjectionData, ProjectionStore,
  ProjectionMetadata, ProjectionType, ProjectionStatus, ConsistencyLevel,
} from './types';
const logger = createLogger('competing-consumer');

export class CompetingConsumerManager {
  private _consumers = new Map<string, boolean>();
  private _state: ProjectionData = {};

  constructor(
    private _name: string,
    private _streamName: string,
    private _store: ProjectionStore,
    private _handlers: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>,
    private _groupId: string = `competing-${_name}`
  ) {}

  async start(): Promise<void> {
    this._consumers.set(this._groupId, true);
    const existing = await this._store.load(this._name);
    if (existing) {
      this._state = existing.data;
    }
  }

  async process(event: DomainEvent): Promise<void> {
    if (!this._consumers.get(this._groupId)) return;
    const handler = this._handlers.get(event.type);
    if (!handler) return;
    this._state = handler(this._state, event);
    await this._store.save(this._name, {
      data: this._state,
      metadata: {
        name: this._name, type: ProjectionType.ASYNC,
        streamName: this._streamName, lastSequence: event.version,
        lastUpdated: Date.now(), eventCount: 1,
        version: 1, status: ProjectionStatus.ACTIVE,
        consistencyLevel: ConsistencyLevel.EVENTUAL,
      },
    });
  }

  async stop(): Promise<void> {
    this._consumers.delete(this._groupId);
  }

  isRunning(): boolean {
    return this._consumers.has(this._groupId);
  }

  async getState(): Promise<ProjectionData | null> {
    const stored = await this._store.load(this._name);
    return stored?.data ?? null;
  }

  get consumerCount(): number {
    return this._consumers.size;
  }

  async addConsumer(consumerId: string): Promise<void> {
    this._consumers.set(consumerId, true);
  }

  async removeConsumer(consumerId: string): Promise<void> {
    this._consumers.delete(consumerId);
  }
}
