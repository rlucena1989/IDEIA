import { IMessageBus } from './command-bus';
import { createLogger } from '@ideia/logger';
const logger = createLogger('event-sourced-repository');

export class Aggregate {
  public version = 0;
  private events: Record<string, unknown>[] = [];

  constructor(public id: string) {}

  getUncommittedEvents(): Record<string, unknown>[] {
    return [...this.events];
  }

  markEventsCommitted(): void {
    this.events = [];
  }

  applyEvent(event: Record<string, unknown>): void {
    this.events.push(event);
    this.version++;
  }

  raiseEvent(type: string, data: Record<string, unknown>): void {
    this.applyEvent({ type, data, aggregateId: this.id, version: this.version + 1, timestamp: Date.now() });
  }
}

export class EventSourcedRepository {
  constructor(private bus: IMessageBus) {}

  async save(aggregate: Aggregate): Promise<void> {
    const events = aggregate.getUncommittedEvents();
    for (const event of events) {
      await this.bus.publish({ subject: `evt.${event['type']}`, data: new TextEncoder().encode(JSON.stringify(event)) });
    }
    aggregate.markEventsCommitted();
  }

  async load(_aggregateType: string, _aggregateId: string): Promise<Aggregate> {
    const aggregate = new Aggregate(_aggregateId);
    return aggregate;
  }
}
