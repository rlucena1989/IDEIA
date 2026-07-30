export interface DomainEvent {
  id: string;
  aggregateId: string;
  type: string;
  version: number;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SnapshotData {
  state: Record<string, unknown>;
  version: number;
  timestamp: number;
}

export interface EventStreamInfo {
  streamName: string;
  aggregateId: string;
  firstSeq: number;
  lastSeq: number;
  eventCount: number;
  created: number;
  updated: number;
}

export interface StreamConfig {
  maxAge?: number;
  maxMsgs?: number;
  maxBytes?: number;
  storage?: 'file' | 'memory';
  replicas?: number;
}

export interface ReadStreamOptions {
  startSeq?: number;
  endSeq?: number;
  maxMsgs?: number;
  signal?: AbortSignal;
  aggregateId?: string;
}

export interface StreamInfo {
  name: string;
  subject: string;
  firstSeq: number;
  lastSeq: number;
  messageCount: number;
  byteCount: number;
  created: number;
}

export interface EventStore {
  ensureStream(name: string, config?: StreamConfig): Promise<void>;
  append(subject: string, events: DomainEvent[]): Promise<void>;
  readStream(subject: string, opts?: ReadStreamOptions): AsyncGenerator<DomainEvent>;
  readLastEvent(subject: string): Promise<DomainEvent | null>;
  getStreamInfo(subject: string): Promise<StreamInfo>;
  deleteStream(name: string): Promise<void>;
  purgeSubject(subject: string): Promise<number>;
}

export interface SnapshotStore {
  save(aggregateId: string, snapshot: SnapshotData): Promise<void>;
  load(aggregateId: string): Promise<SnapshotData | null>;
  delete(aggregateId: string): Promise<void>;
  list(prefix?: string): AsyncGenerator<string>;
}

export interface RepositoryOptions {
  cacheTTL: number;
}

export const defaultRepoOptions: RepositoryOptions = {
  cacheTTL: 5000,
};

export interface SnapshotStrategy {
  shouldSnapshot(aggregate: { id?: string; version: number }): boolean;
}

export interface Upcaster {
  fromVersion: number;
  toVersion: number;
  upcast(event: DomainEvent): DomainEvent;
}

export interface AvroSchemaMigration {
  compatibility: string;
  added: string[];
  removed: string[];
  migrationScript: string;
}

export interface DeltaResult {
  aggregateId: string;
  version: number;
  deltaSize: number;
  fullSize: number;
  compressionRatio: number;
  delta: Record<string, unknown>;
  timestamp: number;
}

export interface DeltaEntry {
  version: number;
  changes: Record<string, unknown>;
  timestamp: number;
}

export interface CacheEntry<T> {
  aggregate: T;
  storedAt: number;
  isValid(ttl: number): boolean;
}

export class ConcurrencyError extends Error {
  constructor(
    public readonly aggregateId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(`Concurrency conflict on ${aggregateId}: expected ${expectedVersion}, actual ${actualVersion}`);
    this.name = 'ConcurrencyError';
  }
}
