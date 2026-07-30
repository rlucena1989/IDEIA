import type { DomainEvent } from './types-event-sourcing';
export declare abstract class AggregateRoot<TState> {
    id: string;
    version: number;
    private pendingEvents;
    constructor(id: string);
    abstract apply(event: DomainEvent): void;
    abstract toState(): TState;
    protected addEvent(type: string, data: Record<string, unknown>, metadata?: Partial<Pick<DomainEvent['metadata'], 'correlationId' | 'causationId' | 'agentId'>>): void;
    getPendingEvents(): DomainEvent[];
    clearPendingEvents(): void;
    loadFromHistory(events: DomainEvent[]): void;
}
//# sourceMappingURL=aggregate-root.d.ts.map