export interface DomainEvent { id: string; type: string; data: unknown; timestamp: string; streamId: string }
export interface Projection { name: string; handlers: Record<string, (state: unknown, event: DomainEvent) => unknown>; state: unknown }
export interface ReadModel { id: string; name: string; data: unknown; version: number; lastUpdated: string }
export interface ProjectionResult { projectionName: string; eventsProcessed: number; success: boolean; durationMs: number }
export interface ReadModelQuery<T> { modelName: string; filter?: Record<string, unknown>; sort?: string; limit?: number }
