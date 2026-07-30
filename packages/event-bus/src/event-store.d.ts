import type { DomainEvent, IEventStore } from './types-event-sourcing';
export declare class InMemoryEventStore implements IEventStore {
    private events;
    private aggregateVersions;
    private key;
    appendEvents(aggregateType: string, aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void>;
    loadEvents(aggregateType: string, aggregateId: string): Promise<DomainEvent[]>;
    loadEventsSince(aggregateType: string, aggregateId: string, fromVersion: number): Promise<DomainEvent[]>;
    loadAllEvents(aggregateType: string): AsyncGenerator<DomainEvent>;
    getAggregateVersion(aggregateType: string, aggregateId: string): Promise<number>;
}
//# sourceMappingURL=event-store.d.ts.map