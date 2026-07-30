export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  data: Record<string, unknown>;
  metadata: {
    causationId?: string;
    correlationId: string;
    agentId: string;
    timestamp: number;
  };
}

export interface Aggregate<TState> {
  id: string;
  version: number;
  apply(event: DomainEvent): void;
  toState(): TState;
}

export interface IEventStore {
  appendEvents(
    aggregateType: string,
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>;
  loadEvents(aggregateType: string, aggregateId: string): Promise<DomainEvent[]>;
  loadEventsSince(
    aggregateType: string,
    aggregateId: string,
    fromVersion: number,
  ): Promise<DomainEvent[]>;
  loadAllEvents(aggregateType: string): AsyncGenerator<DomainEvent>;
  getAggregateVersion(aggregateType: string, aggregateId: string): Promise<number>;
}

export interface Snapshot<TState = unknown> {
  state: TState;
  version: number;
  timestamp: number;
  aggregateType: string;
  aggregateId: string;
}

export interface IProjection<TState = unknown> {
  name: string;
  project(event: DomainEvent): void;
  getState(): TState;
  reset(): void;
}

export interface ProjectionResult<TState = unknown> {
  name: string;
  state: TState;
  eventsProcessed: number;
  duration: number;
}

export interface SagaStep {
  id: string;
  name: string;
  type: 'action' | 'compensation';
  handler: (context: Record<string, unknown>) => Promise<SagaStepResult>;
  compensator?: (context: Record<string, unknown>) => Promise<CompensationResult>;
  successEvent?: string;
  failureEvent?: string;
  timeout?: number;
}

export interface SagaDefinition {
  id: string;
  name: string;
  steps: SagaStep[];
  compensationStrategy: 'sequential' | 'parallel' | 'best-effort';
  maxRetries: number;
  timeout: number;
}

export type SagaStatus = 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';

export interface SagaInstance {
  id: string;
  definitionId: string;
  status: SagaStatus;
  currentStep: number;
  context: Record<string, unknown>;
  completedSteps: string[];
  failedStep: string | null;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

export interface SagaStepResult {
  stepName: string;
  success: boolean;
  output: unknown;
  error: string | null;
  durationMs: number;
}

export interface CompensationResult {
  stepName: string;
  success: boolean;
  error: string | null;
  durationMs: number;
}

export class ConcurrencyError extends Error {
  constructor(
    message: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
    public readonly aggregateType: string,
    public readonly aggregateId: string,
  ) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}
