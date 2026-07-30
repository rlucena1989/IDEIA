import { AggregateRoot } from './aggregate-root';
import { createLogger } from '@ideia/logger';
import { DomainEvent, EventStore } from './types';
const logger = createLogger('cqrs-separated-repository');

export interface ProjectionStore {
  load(id: string): Promise<{ data: Record<string, unknown>; metadata: Record<string, unknown> } | null>;
  save(id: string, data: { data: Record<string, unknown>; metadata: Record<string, unknown> }): Promise<void>;
  delete(id: string): Promise<void>;
}

export class CQRSSeparatedRepository {
  constructor(
    private _writeStore: EventStore,
    private _readStore: ProjectionStore,
    private _streamName: string
  ) {}

  async save(aggregate: AggregateRoot, expectedVersion: number): Promise<void> {
    const pending = aggregate.getPendingEvents();
    if (pending.length === 0) return;
    await this._writeStore.append(this._streamName, pending);
    aggregate.clearPendingEvents();
    aggregate.version = expectedVersion + pending.length;
  }

  async loadReadModel<T>(id: string): Promise<T | null> {
    const entry = await this._readStore.load(id);
    return (entry?.data as T) ?? null;
  }

  async syncReadModel(id: string): Promise<void> {
    const events = this._writeStore.readStream(this._streamName, { aggregateId: id });
    let state: Record<string, unknown> = {};
    for await (const event of events) {
      state = { ...state, ...event.data, lastVersion: event.version };
    }
    await this._readStore.save(id, { data: state, metadata: { lastSequence: state.lastVersion as number } });
  }

  async deleteReadModel(id: string): Promise<void> {
    await this._readStore.delete(id);
  }
}
