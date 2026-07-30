import { createLogger } from '@ideia/logger'
import { DomainEvent, Projection, ReadModel, ProjectionResult } from './types'

const logger = createLogger('projection-engine')

export class ProjectionEngine {
  private projections = new Map<string, Projection>()
  private readModels = new Map<string, ReadModel>()

  register(projection: Projection): void {
    this.projections.set(projection.name, projection)
    this.readModels.set(projection.name, { id: projection.name, name: projection.name, data: projection.state, version: 0, lastUpdated: '' })
    logger.info(`Projection registered`, { name: projection.name })
  }

  process(event: DomainEvent): ProjectionResult[] {
    const results: ProjectionResult[] = []
    const start = Date.now()

    for (const [, proj] of this.projections) {
      const handler = proj.handlers[event.type]
      if (handler) {
        proj.state = handler(proj.state, event)
        const rm = this.readModels.get(proj.name)
        if (rm) { rm.data = proj.state; rm.version++; rm.lastUpdated = new Date().toISOString() }
        results.push({ projectionName: proj.name, eventsProcessed: 1, success: true, durationMs: Date.now() - start })
      }
    }

    return results
  }

  processBatch(events: DomainEvent[]): ProjectionResult[] {
    const all: ProjectionResult[] = []
    for (const event of events) all.push(...this.process(event))
    return all
  }

  getReadModel<T>(name: string): ReadModel | undefined { return this.readModels.get(name) }
  getState<T>(name: string): T | undefined { return this.readModels.get(name)?.data as T | undefined }
}
