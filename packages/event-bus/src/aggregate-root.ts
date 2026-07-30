import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import type { DomainEvent } from './types-event-sourcing';
const logger = createLogger('aggregate-root');

export abstract class AggregateRoot<TState> {
  public id: string;
  public version: number = 0;
  private pendingEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  abstract apply(event: DomainEvent): void;
  abstract toState(): TState;

  protected addEvent(
    type: string,
    data: Record<string, unknown>,
    metadata?: Partial<Pick<DomainEvent['metadata'], 'correlationId' | 'causationId' | 'agentId'>>,
  ): void {
    const event: DomainEvent = {
      id: randomUUID(),
      aggregateId: this.id,
      aggregateType: this.constructor.name,
      type,
      version: this.version + 1,
      data,
      metadata: {
        correlationId: metadata?.correlationId ?? randomUUID(),
        agentId: metadata?.agentId ?? 'system',
        timestamp: Date.now(),
        causationId: metadata?.causationId,
      },
    };
    this.pendingEvents.push(event);
    this.apply(event);
    this.version += 1;
  }

  getPendingEvents(): DomainEvent[] {
    return [...this.pendingEvents];
  }

  clearPendingEvents(): void {
    this.pendingEvents = [];
  }

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.apply(event);
      this.version = event.version;
    }
  }
}
