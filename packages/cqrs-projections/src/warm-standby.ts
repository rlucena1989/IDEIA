import { DomainEvent, ProjectionData, ProjectionStore } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('warm-standby');

export class WarmStandbyProjection {
  private _active: string;
  private _standby: string;

  constructor(
    private _store: ProjectionStore,
    private _name: string,
    private _streamName: string,
    private _handlerMap: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>
  ) {
    this._active = _name;
    this._standby = `${_name}__standby`;
  }

  async warmUp(): Promise<void> {
    let state: ProjectionData = {};
    const initial = await this._store.load(this._standby);
    if (initial) {
      state = initial.data;
    }
    await this._store.save(this._standby, {
      data: state,
      metadata: { name: this._standby, lastSequence: Date.now() } as any,
    });
  }

  async process(event: DomainEvent): Promise<void> {
    const activeEntry = await this._store.load(this._active);
    const standbyEntry = await this._store.load(this._standby);

    const activeState: ProjectionData = activeEntry?.data ?? {};
    const standbyState: ProjectionData = standbyEntry?.data ?? {};

    const handler = this._handlerMap.get(event.type);
    if (handler) {
      const newActive = handler({ ...activeState }, event);
      const newStandby = handler({ ...standbyState }, event);
      await this._store.save(this._active, {
        data: newActive,
        metadata: { name: this._active, lastSequence: event.version, lastUpdated: Date.now() } as any,
      });
      await this._store.save(this._standby, {
        data: newStandby,
        metadata: { name: this._standby, lastSequence: event.version, lastUpdated: Date.now() } as any,
      });
    }
  }

  async switchover(): Promise<void> {
    const temp = this._active;
    this._active = this._standby;
    this._standby = temp;
  }

  async getActiveState<T>(): Promise<T | null> {
    const entry = await this._store.load(this._active);
    return (entry?.data as T) ?? null;
  }

  async getStandbyState<T>(): Promise<T | null> {
    const entry = await this._store.load(this._standby);
    return (entry?.data as T) ?? null;
  }

  get active(): string { return this._active; }
  get standby(): string { return this._standby; }
}
