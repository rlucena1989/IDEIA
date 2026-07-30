export interface DomainEvent {
  id: string
  aggregateId: string
  type: string
  data: Record<string, unknown>
  version: number
  timestamp: string
  correlationId?: string
}

export interface AggregateRoot {
  id: string
  version: number
  applyEvent(event: DomainEvent): void
  getUncommittedEvents(): DomainEvent[]
  clearEvents(): void
}

export interface EventStore {
  append(event: DomainEvent): Promise<void>
  readStream(aggregateId: string): Promise<DomainEvent[]>
  readFromVersion(aggregateId: string, version: number): Promise<DomainEvent[]>
}

export interface SnapshotStore {
  save(aggregateId: string, state: Record<string, unknown>, version: number): Promise<void>
  load(aggregateId: string): Promise<{ state: Record<string, unknown>; version: number } | null>
}

export interface Projection {
  name: string
  process(event: DomainEvent): Promise<void>
  getState(): Promise<Record<string, unknown>>
}

export interface SagaStep {
  name: string
  action: string
  compensation: string
  timeoutMs: number
}

export interface SagaDefinition {
  id: string
  name: string
  steps: SagaStep[]
  onComplete?: string
  onError?: string
}
