export interface Command {
  id: string;
  type: string;
  aggregateId: string;
  data: Record<string, unknown>;
  metadata: {
    agentId: string;
    timestamp: number;
    correlationId: string;
    retryCount?: number;
    source?: string;
  };
}

export interface CommandResult {
  success: boolean;
  commandId: string;
  events: string[];
  error?: string;
  latencyMs: number;
}

export interface Event {
  id: string;
  type: string;
  aggregateId: string;
  data: Record<string, unknown>;
  metadata: {
    agentId: string;
    timestamp: number;
    correlationId: string;
    version: number;
  };
}

export interface SagaStep {
  name: string;
  command: Command;
  compensate?: Command;
  async?: boolean;
  timeout?: number;
  retries?: number;
  onError?: 'compensate' | 'abort' | 'skip';
}

export interface SagaState {
  executed: string[];
  compensated: string[];
  status: 'in_progress' | 'completed' | 'failed' | 'pending_compensation';
  timestamp: number;
  error?: string;
}

export interface SagaContext {
  id: string;
  initiator: string;
  createdAt: number;
}

export interface VectorClock {
  processId: string;
  counter: number;
  timestamp: number;
}

export interface ConsistencyReport {
  isConsistent: boolean;
  projection: string;
  lagMs: number;
  missingEvents: number;
  maxEventTimestamp: number;
  gaps: Array<{ aggregateId: string; expectedVersion: number; gap: number }>;
  eventsToCatchUp: number;
  estimatedCatchUpMs: number;
  status: 'consistent' | 'lagging' | 'inconsistent';
}

export interface PetriPlace {
  id: string;
  tokens: number;
  label: string;
  type: 'step' | 'compensation' | 'failed' | 'completed';
}

export interface PetriTransition {
  id: string;
  from: string;
  to: string;
  guard?: (tokens: Map<string, number>) => boolean;
  action?: string;
}

export interface PetriNet {
  places: Map<string, PetriPlace>;
  transitions: PetriTransition[];
  markings: Map<string, number>;
}

export interface SafetyResult {
  sagaName: string;
  canComplete: boolean;
  deadlocks: number;
  compensationComplete: boolean;
  sitesExplored: number;
  maxReachableSteps: number;
  hasLivelock: boolean;
  verified: boolean;
}

export interface BenchmarkConfig {
  operations: number;
  batchSize: number;
  payloadSize: number;
  consumers: number;
  producers: number;
  duration: number;
}

export interface BenchmarkResult {
  name: string;
  backend: string;
  operation: string;
  throughput: number;
  p50Latency: number;
  p99Latency: number;
  p999Latency: number;
  maxLatency: number;
  errors: number;
  memoryMB: number;
}
