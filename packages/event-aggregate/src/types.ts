export interface DomainEvent { id: string; aggregateId: string; type: string; data: unknown; version: number; timestamp: string }
export interface AggregateSnapshot { aggregateId: string; state: unknown; version: number; timestamp: string }
export interface AggregateRepository { load(id: string): Promise<unknown>; save(events: DomainEvent[]): Promise<void> }
export interface EventStream { append(event: DomainEvent): Promise<void>; readSince(aggregateId: string, version: number): Promise<DomainEvent[]> }
export interface RebuildResult { aggregateId: string; version: number; eventsApplied: number; state: unknown }
