import { createLogger } from '@ideia/logger'
import { DomainEvent, AggregateSnapshot, RebuildResult } from './types'

const logger = createLogger('aggregate-repo')

export class AggregateRepository {
  private events = new Map<string, DomainEvent[]>()
  private snapshots = new Map<string, AggregateSnapshot>()

  append(aggregateId: string, event: DomainEvent): void {
    if (!this.events.has(aggregateId)) this.events.set(aggregateId, [])
    this.events.get(aggregateId)!.push(event)
  }

  readEvents(aggregateId: string): DomainEvent[] {
    return this.events.get(aggregateId) ?? []
  }

  saveSnapshot(aggregateId: string, state: unknown, version: number): void {
    this.snapshots.set(aggregateId, { aggregateId, state, version, timestamp: new Date().toISOString() })
  }

  loadSnapshot(aggregateId: string): AggregateSnapshot | undefined {
    return this.snapshots.get(aggregateId)
  }

  rebuild(aggregateId: string, initialState: unknown, handlers: Record<string, (state: unknown, event: DomainEvent) => unknown>): RebuildResult {
    let state = initialState
    const events = this.readEvents(aggregateId)
    let applied = 0

    for (const event of events) {
      const handler = handlers[event.type]
      if (handler) { state = handler(state, event); applied++ }
    }

    logger.info(`Aggregate rebuilt`, { aggregateId, eventsApplied: applied, version: events.length })
    return { aggregateId, version: events.length, eventsApplied: applied, state }
  }
}
