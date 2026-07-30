import { DomainEvent } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('aggregate-root');

export abstract class AggregateRoot {
  public readonly id: string;
  public version = 0;
  private _pendingEvents: DomainEvent[] = [];
  private _appliedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  abstract apply(event: DomainEvent): void;

  protected recordEvent(type: string, data: Record<string, unknown>): void {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      aggregateId: this.id,
      type,
      version: this.version + this._pendingEvents.length + 1,
      data,
      timestamp: Date.now(),
    };
    this._pendingEvents.push(event);
    this.apply(event);
  }

  getPendingEvents(): DomainEvent[] {
    return [...this._pendingEvents];
  }

  clearPendingEvents(): void {
    this._appliedEvents.push(...this._pendingEvents);
    this._pendingEvents = [];
  }

  toSnapshot(): Record<string, unknown> {
    return {
      id: this.id,
      version: this.version,
    };
  }

  fromSnapshot(state: Record<string, unknown>): void {
    this.version = (state.version as number) || 0;
  }
}
