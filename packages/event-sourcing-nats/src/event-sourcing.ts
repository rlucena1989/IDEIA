import { createLogger } from '@ideia/logger'
import { DomainEvent, AggregateRoot, EventStore, SnapshotStore, Projection, SagaDefinition, SagaStep } from './types'

const logger = createLogger('event-sourcing')

export class InMemoryEventStore implements EventStore {
  private events: DomainEvent[] = []
  async append(event: DomainEvent): Promise<void> { this.events.push(event) }
  async readStream(aggregateId: string): Promise<DomainEvent[]> { return this.events.filter(e => e.aggregateId === aggregateId).sort((a, b) => a.version - b.version) }
  async readFromVersion(aggregateId: string, version: number): Promise<DomainEvent[]> { return (await this.readStream(aggregateId)).filter(e => e.version > version) }
}

export class InMemorySnapshotStore implements SnapshotStore {
  private snapshots = new Map<string, { state: Record<string, unknown>; version: number }>()
  async save(aggregateId: string, state: Record<string, unknown>, version: number): Promise<void> { this.snapshots.set(aggregateId, { state, version }) }
  async load(aggregateId: string): Promise<{ state: Record<string, unknown>; version: number } | null> { return this.snapshots.get(aggregateId) ?? null }
}

export class ProjectionEngine {
  private projections: Map<string, Projection> = new Map()
  register(projection: Projection): void { this.projections.set(projection.name, projection); logger.info(`Projection registered`, { name: projection.name }) }
  async process(event: DomainEvent): Promise<void> { for (const p of this.projections.values()) await p.process(event) }
  async getState(name: string): Promise<Record<string, unknown>> { const p = this.projections.get(name); if (!p) throw new Error(`Projection ${name} not found`); return p.getState() }
}

export class SagaCoordinator {
  private sagas: Map<string, SagaDefinition> = new Map()
  private activeSteps = new Map<string, Set<string>>()

  register(saga: SagaDefinition): void { this.sagas.set(saga.id, saga); logger.info(`Saga registered`, { id: saga.id, name: saga.name }) }

  async start(sagaId: string, aggregateId: string): Promise<void> {
    const saga = this.sagas.get(sagaId)
    if (!saga) throw new Error(`Saga ${sagaId} not found`)
    this.activeSteps.set(aggregateId, new Set(saga.steps.map(s => s.name)))
    logger.info(`Saga started`, { sagaId, aggregateId })
  }

  async completeStep(aggregateId: string, stepName: string): Promise<boolean> {
    const steps = this.activeSteps.get(aggregateId)
    if (!steps) return false
    steps.delete(stepName)
    const isComplete = steps.size === 0
    if (isComplete) this.activeSteps.delete(aggregateId)
    return isComplete
  }
}
