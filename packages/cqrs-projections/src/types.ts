export interface DomainEvent {
  id: string;
  aggregateId: string;
  type: string;
  version: number;
  data: Record<string, unknown>;
  timestamp: number;
}

export type ProjectionData = Record<string, unknown>;

export interface ProjectionState<T = ProjectionData> {
  data: T;
  metadata: ProjectionMetadata;
}

export interface ProjectionMetadata {
  name: string;
  type: ProjectionType;
  streamName: string;
  lastSequence: number;
  lastUpdated: number;
  eventCount: number;
  version: number;
  status: ProjectionStatus;
  consistencyLevel: ConsistencyLevel;
  snapshotId?: string;
}

export enum ProjectionType {
  INLINE = 'inline',
  ASYNC = 'async',
  STREAMING = 'streaming',
  MATERIALIZED_VIEW = 'materialized_view',
}

export enum ProjectionStatus {
  BUILDING = 'building',
  ACTIVE = 'active',
  FAILED = 'failed',
  STALE = 'stale',
}

export enum ConsistencyLevel {
  STRONG = 'strong',
  EVENTUAL = 'eventual',
  READ_YOUR_WRITES = 'read_your_writes',
}

export interface ProjectionHandler {
  eventType: string;
  apply(state: ProjectionData, event: DomainEvent): ProjectionData;
}

export interface BuildOptions {
  signal?: AbortSignal;
}

export interface RebuildProgress {
  projectionName: string;
  strategy: string;
  totalEvents: number;
  processedEvents: number;
  percentage: number;
  startedAt: number;
  estimatedCompletion: number;
  errors: number;
}

export enum RebuildStrategyType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  SNAPSHOT_CATCHUP = 'snapshot_catchup',
  PARALLEL = 'parallel',
  WARM = 'warm',
}

export interface RebuildStrategy {
  execute(
    name: string,
    streamName: string,
    initialState: ProjectionData,
    handlerMap: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>,
    signal?: AbortSignal,
    buildFn?: (name: string) => Promise<ProjectionState>
  ): Promise<RebuildProgress>;
}

export interface CacheInvalidationStrategy {
  isExpired(projectionName: string, lastUpdated: number): boolean;
  invalidate(projectionName: string): void;
}

export interface ConsistencyReport {
  name: string;
  lag: number;
  status: 'consistent' | 'lagging' | 'critical' | 'unknown';
  detectedAt: number;
  lastSequence?: number;
  streamSequence?: number;
}

export interface DeduplicationStore {
  exists(key: string): Promise<boolean>;
  record(key: string, timestamp: number, ttlMs: number): Promise<void>;
  purge(olderThan: number): Promise<number>;
}

export interface ProjectionStore {
  load(name: string): Promise<ProjectionState | null>;
  save(name: string, state: ProjectionState): Promise<void>;
  delete(name: string): Promise<void>;
  swap(tempName: string, targetName: string): Promise<void>;
  list(): Promise<ProjectionMetadata[]>;
}

export interface ProjectionDefinition {
  streamName: string;
  initialState: ProjectionData;
  handlers?: Map<string, (s: ProjectionData, e: DomainEvent) => ProjectionData>;
  consistencyLevel?: ConsistencyLevel;
}
