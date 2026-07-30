import { DomainEvent, ProjectionData, ProjectionStore } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('incremental-materializer');

export class IncrementalMaterializer {
  private _lastSequence = new Map<string, number>();

  constructor(private _store: ProjectionStore) {}

  async register(
    name: string,
    streamName: string,
    handlerMap: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>
  ): Promise<void> {
    const existing = await this._store.load(name);
    const state: ProjectionData = existing?.data ?? {};
    this._lastSequence.set(name, existing?.metadata.lastSequence ?? 0);

    this._processEvent = async (event: DomainEvent) => {
      if (event.version <= (this._lastSequence.get(name) ?? 0)) return;
      const handler = handlerMap.get(event.type);
      if (!handler) return;
      const updated = handler(state, event);
      Object.assign(state, updated);
      Object.assign(state, updated);
      await this._store.save(name, {
        data: state,
        metadata: {
          name, eventCount: (existing?.metadata.eventCount ?? 0) + 1,
          lastSequence: event.version, lastUpdated: Date.now(),
        } as any,
      });
      this._lastSequence.set(name, event.version);
    };
  }

  private _processEvent: ((event: DomainEvent) => Promise<void>) | null = null;

  async process(event: DomainEvent): Promise<void> {
    if (this._processEvent) {
      await this._processEvent(event);
    }
  }

  async getState(name: string): Promise<ProjectionData | null> {
    const stored = await this._store.load(name);
    return stored?.data ?? null;
  }

  getLastSequence(name: string): number {
    return this._lastSequence.get(name) ?? 0;
  }
}
