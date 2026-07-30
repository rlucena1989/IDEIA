# Estudo: Event Sourcing com NATS JetStream

> **Extraído de:** ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md seção 3.2
> **Data:** 2026-07-24
> **Versão:** 2.0
> **Propósito:** Arquitetura completa de event sourcing usando NATS JetStream como event store — agregações, projeções, snapshots, versionamento, concorrência, EventStore concreto, AggregateRoot patterns, integração com @ideia/event-bus.
> **Nível 1:** Event sourcing fundamentals, aggregates, events, streams, EventStore, AggregateRoot
> **Nível 2:** Repository pattern, snapshotting, projections, competing consumers, event replay
> **Nível 3:** Event versioning & migration, CQRS, saga pattern, integration with @ideia/event-bus
> **Nível 4:** Event sourcing em sistemas distribuídos, causal consistency, CRDT vs event sourcing

---

## 1. NÍVEL TÉCNICO

### 1.1 Fundamentos de Event Sourcing

```
┌────────────────────────────────────────────────────────────┐
│                EVENT SOURCING ARCHITECTURE                  │
│                                                            │
│  Command ──→ Aggregate ──→ Domain Events ──→ Event Store   │
│                    │                            │          │
│                    │                     ┌──────┴──────┐  │
│                    │                     │      │      │  │
│                    ▼                     ▼      ▼      ▼  │
│               Current State        Projection 1  Proj 2  │
│               (from replay)        (read model) (search) │
│                                                            │
│  Princípios:                                                │
│  - Toda mudança de estado é um evento imutável             │
│  - Estado atual = soma (replay) de todos os eventos        │
│  - Eventos nunca são alterados ou deletados                │
│  - Projections são visões derivadas dos eventos            │
└────────────────────────────────────────────────────────────┘
```

```typescript
// Event structure
interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  data: Record<string, unknown>;
  metadata: {
    causationId?: string;   // Evento que causou este
    correlationId: string;  // Fluxo completo
    agentId: string;
    timestamp: number;
  };
}

// Aggregate: entidade que emite e reage a eventos
interface Aggregate<T> {
  id: string;
  version: number;
  apply(event: DomainEvent): void;
  toState(): T;
}
```

### 1.2 AggregateRoot Base Class

```typescript
export abstract class AggregateRoot<TState> {
  public id: string;
  public version: number = 0;
  private pendingEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  abstract apply(event: DomainEvent): void;
  abstract toState(): TState;

  protected addEvent(type: string, data: Record<string, unknown>, metadata?: Partial<DomainEvent['metadata']>): void {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      aggregateId: this.id,
      aggregateType: this.constructor.name,
      type,
      version: this.version + 1,
      data,
      metadata: {
        correlationId: metadata?.correlationId || crypto.randomUUID(),
        agentId: metadata?.agentId || 'system',
        timestamp: Date.now(),
        causationId: metadata?.causationId,
      },
    };
    this.pendingEvents.push(event);
    this.apply(event);
    this.version++;
  }

  getPendingEvents(): DomainEvent[] {
    return [...this.pendingEvents];
  }

  clearPendingEvents(): void {
    this.pendingEvents = [];
  }

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.apply(event);
      this.version = event.version;
    }
  }
}

// Example: AgentDecision aggregate
interface AgentDecisionState {
  decisions: Array<{ action: string; timestamp: number }>;
  status: 'active' | 'completed' | 'failed';
  lastAgentId: string;
}

class AgentDecisionAggregate extends AggregateRoot<AgentDecisionState> {
  private state: AgentDecisionState = {
    decisions: [],
    status: 'active',
    lastAgentId: '',
  };

  makeDecision(action: string, agentId: string): void {
    this.addEvent('decision_made', { action, agentId }, { agentId });
  }

  complete(): void {
    this.addEvent('decision_completed', { finalState: this.state });
  }

  apply(event: DomainEvent): void {
    switch (event.type) {
      case 'decision_made':
        this.state.decisions.push({
          action: event.data.action as string,
          timestamp: event.metadata.timestamp,
        });
        this.state.lastAgentId = event.metadata.agentId;
        break;
      case 'decision_completed':
        this.state.status = 'completed';
        break;
    }
  }

  toState(): AgentDecisionState {
    return { ...this.state };
  }
}
```

### 1.3 EventStore Implementation

```typescript
export interface IEventStore {
  appendEvents(aggregateType: string, aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void>;
  loadEvents(aggregateType: string, aggregateId: string): Promise<DomainEvent[]>;
  loadEventsSince(aggregateType: string, aggregateId: string, fromVersion: number): Promise<DomainEvent[]>;
  loadAllEvents(aggregateType: string): AsyncGenerator<DomainEvent>;
}

export class NATSEventStore implements IEventStore {
  constructor(
    private js: JetStreamClient,
    private kv: KvContext,
    private streamConfigs: Map<string, StreamConfig>,
  ) {}

  async appendEvents(
    aggregateType: string,
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    const streamName = this.getStreamName(aggregateType);
    const subject = `${aggregateType}.${aggregateId}`;
    const currentVersion = await this.getAggregateVersion(aggregateType, aggregateId);

    if (expectedVersion !== currentVersion) {
      // Tentativa de recuperação: verificar se os eventos já foram persistidos
      const lastEvent = await this.getLastEvent(aggregateType, aggregateId);
      if (lastEvent && lastEvent.version >= expectedVersion) {
        // Idempotência: eventos já foram salvos, ignorar
        return;
      }
      throw new ConcurrencyError(
        `Expected version ${expectedVersion}, current ${currentVersion} for ${subject}`
      );
    }

    const batch = this.js.batch();
    for (const event of events) {
      batch.publish(subject, JSON.stringify(event), {
        msgHeaders: {
          'event-type': event.type,
          'event-version': String(event.version),
          'aggregate-type': event.aggregateType,
          'correlation-id': event.metadata.correlationId,
        },
      });
    }
    await batch.flush();

    // Atualizar versão no KV para leituras rápidas
    await this.kv.put(
      `version:${aggregateType}:${aggregateId}`,
      new TextEncoder().encode(String(events[events.length - 1].version)),
    );
  }

  async loadEvents(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const consumer = await this.js.consumers.create(this.getStreamName(aggregateType), {
      deliver_policy: DeliverPolicy.All,
      filter_subject: `${aggregateType}.${aggregateId}`,
      ack_policy: AckPolicy.Explicit,
      replay_policy: ReplayPolicy.Original,
    });

    for await (const msg of await consumer.consume()) {
      events.push(JSON.parse(msg.data.toString()));
      msg.ack();
    }
    return events.sort((a, b) => a.version - b.version);
  }

  async loadEventsSince(aggregateType: string, aggregateId: string, fromVersion: number): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const consumer = await this.js.consumers.create(this.getStreamName(aggregateType), {
      deliver_policy: DeliverPolicy.ByStartSequence,
      opt_start_seq: fromVersion + 1,
      filter_subject: `${aggregateType}.${aggregateId}`,
      ack_policy: AckPolicy.Explicit,
    });

    for await (const msg of await consumer.consume()) {
      events.push(JSON.parse(msg.data.toString()));
      msg.ack();
    }
    return events;
  }

  async *loadAllEvents(aggregateType: string): AsyncGenerator<DomainEvent> {
    const consumer = await this.js.consumers.create(this.getStreamName(aggregateType), {
      deliver_policy: DeliverPolicy.All,
      filter_subject: `${aggregateType}.>`,
      ack_policy: AckPolicy.Explicit,
    });

    for await (const msg of await consumer.consume()) {
      yield JSON.parse(msg.data.toString());
      msg.ack();
    }
  }

  async getAggregateVersion(aggregateType: string, aggregateId: string): Promise<number> {
    try {
      const entry = await this.kv.get(`version:${aggregateType}:${aggregateId}`);
      if (entry) {
        return parseInt(new TextDecoder().decode(entry.value), 10);
      }
    } catch {}
    return 0;
  }

  async getLastEvent(aggregateType: string, aggregateId: string): Promise<DomainEvent | null> {
    const consumer = await this.js.consumers.create(this.getStreamName(aggregateType), {
      deliver_policy: DeliverPolicy.Last,
      filter_subject: `${aggregateType}.${aggregateId}`,
    });
    for await (const msg of await consumer.consume()) {
      msg.ack();
      return JSON.parse(msg.data.toString());
    }
    return null;
  }

  private getStreamName(aggregateType: string): string {
    const config = this.streamConfigs.get(aggregateType);
    if (!config) throw new Error(`No stream config for aggregate type: ${aggregateType}`);
    return config.name;
  }
}
```

### 1.4 Snapshot Strategy

```typescript
interface SnapshotStrategy {
  shouldTakeSnapshot(aggregate: AggregateRoot<any>): boolean;
  snapshotInterval: number;
  maxSnapshotsPerAggregate: number;
}

class CountBasedSnapshotStrategy implements SnapshotStrategy {
  constructor(
    public snapshotInterval: number = 50,
    public maxSnapshotsPerAggregate: number = 10,
  ) {}

  shouldTakeSnapshot(aggregate: AggregateRoot<any>): boolean {
    return aggregate.version > 0 && aggregate.version % this.snapshotInterval === 0;
  }
}

class TimeBasedSnapshotStrategy implements SnapshotStrategy {
  constructor(
    private timeIntervalMs: number = 30 * 60 * 1000, // 30 min
    public snapshotInterval: number = 100,
    public maxSnapshotsPerAggregate: number = 20,
  ) {}

  shouldTakeSnapshot(aggregate: AggregateRoot<any>): boolean {
    return aggregate.version > 0 && aggregate.version % this.snapshotInterval === 0;
  }
}

interface SnapshotData<T> {
  state: T;
  version: number;
  timestamp: number;
  aggregateType: string;
  aggregateId: string;
}

class SnapshotManager {
  constructor(
    private kv: KvContext,
    private strategy: SnapshotStrategy,
  ) {}

  async saveSnapshot<T>(aggregate: AggregateRoot<T>): Promise<void> {
    if (!this.strategy.shouldTakeSnapshot(aggregate)) return;

    const snapshot: SnapshotData<T> = {
      state: aggregate.toState(),
      version: aggregate.version,
      timestamp: Date.now(),
      aggregateType: aggregate.constructor.name,
      aggregateId: aggregate.id,
    };

    const key = `snapshot:${aggregate.constructor.name}:${aggregate.id}`;
    await this.kv.put(key, new TextEncoder().encode(JSON.stringify(snapshot)));

    // GC: manter apenas os N snapshots mais recentes
    await this.garbageCollect(aggregate.constructor.name, aggregate.id);
  }

  async loadSnapshot<T>(aggregateType: string, aggregateId: string): Promise<SnapshotData<T> | null> {
    const key = `snapshot:${aggregateType}:${aggregateId}`;
    try {
      const entry = await this.kv.get(key);
      if (!entry) return null;
      return JSON.parse(new TextDecoder().decode(entry.value));
    } catch {
      return null;
    }
  }

  private async garbageCollect(aggregateType: string, aggregateId: string): Promise<void> {
    // Listar todos os snapshots (prefix scan)
    const prefix = `snapshot-hist:${aggregateType}:${aggregateId}`;
    const snapshots: Array<{ version: number; key: string }> = [];

    const keys = await this.kv.keys();
    for await (const key of keys) {
      if (key.startsWith(prefix)) {
        const entry = await this.kv.get(key);
        if (entry) {
          const data = JSON.parse(new TextDecoder().decode(entry.value));
          snapshots.push({ version: data.version, key });
        }
      }
    }

    // Manter apenas os N mais recentes
    snapshots.sort((a, b) => b.version - a.version);
    const toDelete = snapshots.slice(this.strategy.maxSnapshotsPerAggregate);
    for (const { key } of toDelete) {
      await this.kv.delete(key);
    }
  }
}
```

### 1.5 Event Replay

```typescript
interface ReplayOptions {
  aggregateType: string;
  aggregateId?: string;
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  batchSize?: number;
}

interface ReplayResult {
  eventsProcessed: number;
  duration: number;
  errors: number;
  lastVersion: number;
}

class EventReplayEngine {
  constructor(
    private eventStore: IEventStore,
    private snapshotManager: SnapshotManager,
  ) {}

  async replayAggregate<T extends AggregateRoot<TState>, TState>(
    aggregateClass: new (id: string) => T,
    aggregateId: string,
    options?: Partial<ReplayOptions>,
  ): Promise<T> {
    const start = Date.now();
    const aggregate = new aggregateClass(aggregateId);

    // 1. Tentar carregar do snapshot
    const snapshot = await this.snapshotManager.loadSnapshot<TState>(
      aggregateClass.name,
      aggregateId,
    );
    if (snapshot) {
      aggregate.version = snapshot.version;
      // Reconstruir estado do snapshot
      // (aplicação inversa não é necessária se snapshot for estado completo)
    }

    const fromVersion = snapshot?.version || 0;

    // 2. Replay eventos após o snapshot
    const events = await this.eventStore.loadEventsSince(
      aggregateClass.name,
      aggregateId,
      fromVersion,
    );

    for (const event of events) {
      aggregate.apply(event);
      aggregate.version = event.version;
    }

    return aggregate;
  }

  async replayAll<T extends AggregateRoot<TState>, TState>(
    aggregateClass: new (id: string) => T,
    options?: ReplayOptions,
  ): Promise<ReplayResult> {
    const start = Date.now();
    let eventsProcessed = 0;
    let errors = 0;
    let lastVersion = 0;

    const generator = this.eventStore.loadAllEvents(options?.aggregateType || aggregateClass.name);
    for await (const event of generator) {
      try {
        // Filtrar por aggregateId se especificado
        if (options?.aggregateId && event.aggregateId !== options.aggregateId) continue;
        if (options?.fromVersion && event.version < options.fromVersion) continue;
        if (options?.toVersion && event.version > options.toVersion) continue;
        if (options?.fromTimestamp && event.metadata.timestamp < options.fromTimestamp) continue;
        if (options?.toTimestamp && event.metadata.timestamp > options.toTimestamp) continue;

        eventsProcessed++;
        lastVersion = event.version;

        // A cada batchSize eventos, permitir GC
        if (options?.batchSize && eventsProcessed % options.batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (error) {
        errors++;
      }
    }

    return {
      eventsProcessed,
      duration: Date.now() - start,
      errors,
      lastVersion,
    };
  }

  async replayToState<TState>(
    events: DomainEvent[],
    handlers: Map<string, (state: TState, event: DomainEvent) => TState>,
    initialState: TState,
  ): Promise<TState> {
    let state = initialState;
    for (const event of events.sort((a, b) => a.version - b.version)) {
      const handler = handlers.get(event.type);
      if (handler) {
        state = handler(state, event);
      }
    }
    return state;
  }
}
```

### 1.6 NATS Streams como Event Store

Cada aggregate type tem seu próprio stream NATS:

```typescript
const STREAMS: Record<string, StreamConfig> = {
  'agent.decision': { name: 'AGENT_DECISIONS', subjects: ['agent.decision.>'], maxAge: 365 * 86400, storage: StorageType.File, replicas: 1 },
  'project.state': { name: 'PROJECT_STATES', subjects: ['project.state.>'], maxAge: 365 * 86400, storage: StorageType.File, replicas: 1 },
  'workspace.file': { name: 'WORKSPACE_FILES', subjects: ['workspace.file.>'], maxAge: 90 * 86400, storage: StorageType.File, replicas: 1 },
  'audit.event': { name: 'AUDIT_EVENTS', subjects: ['audit.event.>'], maxAge: 0, storage: StorageType.File, replicas: 3 },
  'workflow.state': { name: 'WORKFLOW_STATES', subjects: ['workflow.state.>'], maxAge: 180 * 86400, storage: StorageType.File, replicas: 1 },
  'delivery.pipeline': { name: 'DELIVERY_PIPELINES', subjects: ['delivery.pipeline.>'], maxAge: 90 * 86400, storage: StorageType.File, replicas: 1 },
};

declare class StreamConfig {
  name: string;
  subjects: string[];
  maxAge: number;
  storage: StorageType;
  replicas: number;
  maxMsgsPerSubject?: number;
  maxMsgSize?: number;
}
```

### 1.7 Aggregate Repository

```typescript
class EventSourcedRepository<T extends AggregateRoot<TState>, TState> {
  constructor(
    private eventStore: IEventStore,
    private aggregateFactory: (id: string) => T,
    private snapshotManager: SnapshotManager,
    private aggregateType: string,
  ) {}

  async save(aggregate: T, expectedVersion: number): Promise<void> {
    const pendingEvents = aggregate.getPendingEvents();
    if (pendingEvents.length === 0) return;

    await this.eventStore.appendEvents(
      this.aggregateType,
      aggregate.id,
      pendingEvents,
      expectedVersion,
    );

    // Snapshot
    await this.snapshotManager.saveSnapshot(aggregate);

    aggregate.clearPendingEvents();
  }

  async load(id: string): Promise<T> {
    // Tentar snapshot primeiro
    const snapshot = await this.snapshotManager.loadSnapshot<TState>(this.aggregateType, id);
    const aggregate = this.aggregateFactory(id);

    if (snapshot) {
      aggregate.version = snapshot.version;
    }

    const fromVersion = snapshot?.version || 0;
    const events = await this.eventStore.loadEventsSince(this.aggregateType, id, fromVersion);

    for (const event of events) {
      aggregate.apply(event);
      aggregate.version = event.version;
    }

    return aggregate;
  }

  async exists(id: string): Promise<boolean> {
    const version = await (this.eventStore as NATSEventStore).getAggregateVersion(this.aggregateType, id);
    return version > 0;
  }
}
```

### 1.8 Optimistic Concurrency

```typescript
class ConcurrencyHandler {
  constructor(
    private repository: EventSourcedRepository<any, any>,
  ) {}

  async executeWithRetry<TResult>(
    aggregateId: string,
    operation: (aggregate: any) => Promise<void>,
    maxRetries = 3,
  ): Promise<TResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const aggregate = await this.repository.load(aggregateId);
        const currentVersion = aggregate.version;
        await operation(aggregate);
        await this.repository.save(aggregate, currentVersion);
        return aggregate.toState();
      } catch (error) {
        if (error instanceof ConcurrencyError && attempt < maxRetries) {
          const delayMs = 100 * Math.pow(2, attempt - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Failed after ${maxRetries} retries`);
  }
}
```

### 1.9 Projections (Read Models)

```typescript
class ProjectionBuilder<T> {
  private state: T;

  constructor(
    initialState: T,
    private handlers: Map<string, (state: T, event: DomainEvent) => T>,
    private streamName: string,
    private projectionName: string,
    private js: JetStreamClient,
  ) {
    this.state = initialState;
  }

  async build(aggregateId?: string): Promise<T> {
    const subject = aggregateId
      ? `${this.streamName}.${aggregateId}`
      : `${this.streamName}.>`;

    const consumer = await this.js.consumers.create(this.streamName, {
      filter_subject: subject,
      deliver_policy: DeliverPolicy.All,
      ack_policy: AckPolicy.Explicit,
    });

    for await (const msg of await consumer.consume()) {
      const event: DomainEvent = JSON.parse(msg.data.toString());
      const handler = this.handlers.get(event.type);
      if (handler) {
        this.state = handler(this.state, event);
      }
      msg.ack();
    }

    return this.state;
  }

  async* live(aggregateId?: string): AsyncGenerator<T> {
    await this.build(aggregateId);

    const consumer = await this.js.consumers.create(this.streamName, {
      filter_subject: aggregateId
        ? `${this.streamName}.${aggregateId}`
        : `${this.streamName}.>`,
      deliver_policy: DeliverPolicy.New,
      ack_policy: AckPolicy.Explicit,
    });

    for await (const msg of await consumer.consume()) {
      const event: DomainEvent = JSON.parse(msg.data.toString());
      const handler = this.handlers.get(event.type);
      if (handler) {
        this.state = handler(this.state, event);
      }
      msg.ack();
      yield this.state;
    }
  }

  getCurrentState(): T {
    return this.state;
  }
}

// Exemplo: projection de decisões por agente
const decisionProjection = new ProjectionBuilder(
  { decisions: [], byAgent: {}, totalByType: {} },
  new Map([
    ['decision_made', (state, event) => ({
      decisions: [...state.decisions, event.data as { action: string; agentId: string }],
      byAgent: {
        ...state.byAgent,
        [event.metadata.agentId]: [
          ...(state.byAgent[event.metadata.agentId] || []),
          event.data,
        ],
      },
      totalByType: {
        ...state.totalByType,
        [event.type]: (state.totalByType[event.type] || 0) + 1,
      },
    })],
    ['decision_completed', (state) => ({
      ...state,
      status: 'completed',
    })],
  ]),
  'agent.decision',
  'agent_decisions',
  {} as JetStreamClient,
);
```

---

## 2. NÍVEL ENGENHARIA

### 2.1 Event Versioning & Schema Evolution

```typescript
interface EventMigrator {
  fromVersion: number;
  toVersion: number;
  migrate: (event: DomainEvent) => DomainEvent;
  validate?: (event: DomainEvent) => boolean;
}

class EventMigrationEngine {
  private migrations: EventMigrator[] = [
    {
      fromVersion: 1, toVersion: 2,
      migrate: (event) => {
        if (!event.data.tags) {
          event.data.tags = [];
        }
        event.version = 2;
        return event;
      },
      validate: (event) => Array.isArray(event.data.tags),
    },
    {
      fromVersion: 2, toVersion: 3,
      migrate: (event) => {
        event.data.category = event.data.type;
        delete event.data.type;
        event.version = 3;
        return event;
      },
    },
  ];

  constructor(private js: JetStreamClient) {}

  async migrateStream(stream: string): Promise<MigrationReport> {
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    const consumer = await this.js.consumers.create(stream, {
      deliver_policy: DeliverPolicy.All,
      ack_policy: AckPolicy.Explicit,
    });

    for await (const msg of await consumer.consume()) {
      const event: DomainEvent = JSON.parse(msg.data.toString());
      const currentVersion = event.version || 1;

      let migratedEvent = { ...event };
      let changed = false;

      for (const migration of this.migrations) {
        if (migratedEvent.version < migration.toVersion && migratedEvent.version >= migration.fromVersion) {
          try {
            const newEvent = migration.migrate(migratedEvent);
            if (migration.validate && !migration.validate(newEvent)) {
              errors++;
              break;
            }
            migratedEvent = newEvent;
            changed = true;
          } catch (error) {
            errors++;
            break;
          }
        }
      }

      if (changed) {
        // Publicar versão migrada no mesmo subject
        await this.js.publish(msg.subject, JSON.stringify(migratedEvent), {
          msgHeaders: {
            'event-version': String(migratedEvent.version),
            'migration': 'true',
          },
        });
        migrated++;
      } else {
        skipped++;
      }

      msg.ack();
    }

    return { stream, migrated, errors, skipped, total: migrated + errors + skipped };
  }

  async migrateWithDoubleWrite(event: DomainEvent): Promise<void> {
    // Nova versão (current)
    await this.js.publish(
      `${this.getStreamName(event.aggregateType)}.${event.aggregateId}`,
      JSON.stringify(event),
      { msgHeaders: { 'event-version': String(event.version) } },
    );

    // Versão antiga (para compatibilidade reversa durante migração)
    const oldEvent = this.downgrade(event, event.version - 1);
    if (oldEvent) {
      await this.js.publish(
        `${this.getStreamName(event.aggregateType)}.v${event.version - 1}.${event.aggregateId}`,
        JSON.stringify(oldEvent),
        { msgHeaders: { 'event-version': String(event.version - 1), 'migration': 'legacy' } },
      );
    }
  }

  private downgrade(event: DomainEvent, targetVersion: number): DomainEvent | null {
    let current = { ...event };
    // Aplicar migrações reversas
    for (const migration of [...this.migrations].reverse()) {
      if (current.version > targetVersion && current.version >= migration.toVersion) {
        // Reverter a migração (aplicação inversa)
        if (migration.fromVersion === 1 && migration.toVersion === 2) {
          delete current.data.tags;
          current.version = 1;
        } else if (migration.fromVersion === 2 && migration.toVersion === 3) {
          current.data.type = current.data.category;
          delete current.data.category;
          current.version = 2;
        }
      }
    }
    return current.version === targetVersion ? current : null;
  }

  private getStreamName(aggregateType: string): string {
    // Mapping logic
    const map: Record<string, string> = {
      'agent.decision': 'agent.decision',
      'AgentDecisionAggregate': 'agent.decision',
    };
    return map[aggregateType] || aggregateType;
  }
}

interface MigrationReport {
  stream: string;
  migrated: number;
  errors: number;
  skipped: number;
  total: number;
}
```

### 2.2 CQRS com NATS

```typescript
// Command side (write)
class CommandBus {
  constructor(
    private js: JetStreamClient,
    private validatorRegistry: Map<string, (command: Command) => Command>,
  ) {}

  async dispatch(command: Command): Promise<void> {
    const validator = this.validatorRegistry.get(command.type);
    if (validator) {
      command = validator(command);
    }

    await this.js.publish(
      `command.${command.type}`,
      JSON.stringify(command),
      {
        msgHeaders: {
          'command-type': command.type,
          'correlation-id': command.metadata?.correlationId || crypto.randomUUID(),
        },
      },
    );
  }
}

// Query side (read)
class QueryBus {
  constructor(private projections: Map<string, ProjectionBuilder<any>>) {}

  async query<T>(name: string, filter?: QueryFilter): Promise<T> {
    const projection = this.projections.get(name);
    if (!projection) throw new Error(`Unknown projection: ${name}`);

    if (filter?.aggregateId) {
      await projection.build(filter.aggregateId);
    } else {
      await projection.build();
    }

    return projection.getCurrentState() as T;
  }
}

interface QueryFilter {
  aggregateId?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

// Saga: coordenar múltiplos aggregates
class SagaManager {
  constructor(private commandBus: CommandBus, private js: JetStreamClient) {}

  async execute(saga: Saga): Promise<void> {
    const sagaId = crypto.randomUUID();
    const sagaState = new SagaState(sagaId);

    for (const [index, step] of saga.steps.entries()) {
      try {
        sagaState.currentStep = index;
        step.sagaId = sagaId;

        await this.commandBus.dispatch(step.command);

        // Aguardar evento de confirmação
        await this.waitForEvent(step.successEvent, 60000, sagaId);

        sagaState.completedSteps.push(index);

      } catch (error) {
        // Compensação: reverter steps anteriores
        for (const completedIndex of sagaState.completedSteps.reverse()) {
          const compensateStep = saga.compensations[completedIndex];
          if (compensateStep) {
            try {
              await this.commandBus.dispatch(compensateStep);
            } catch (compensationError) {
              console.error(`Compensation failed for step ${completedIndex}:`, compensationError);
            }
          }
        }
        throw new SagaFailedError(sagaId, step.name, error as Error);
      }
    }
  }

  private waitForEvent(eventType: string, timeout: number, sagaId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sub = this.js.subscribe(`events.${eventType}`);
      const timer = setTimeout(() => {
        sub.unsubscribe();
        reject(new Error(`Timeout waiting for ${eventType} in saga ${sagaId}`));
      }, timeout);

      (async () => {
        for await (const msg of sub) {
          const payload = JSON.parse(msg.data.toString());
          // Verificar correlationId para evitar eventos de outras sagas
          if (payload.metadata?.correlationId === sagaId) {
            clearTimeout(timer);
            sub.unsubscribe();
            resolve();
          }
        }
      })();
    });
  }
}

class SagaState {
  constructor(public sagaId: string) {}
  currentStep: number = 0;
  completedSteps: number[] = [];
  errors: Error[] = [];
}

interface Saga {
  name: string;
  steps: SagaStep[];
  compensations: Command[];
}

interface SagaStep {
  name: string;
  command: Command;
  successEvent: string;
  failureEvent?: string;
  sagaId?: string;
  timeout?: number;
}

interface Command {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, unknown>;
  metadata: {
    correlationId: string;
    agentId: string;
    timestamp: number;
  };
}
```

### 2.3 Anti-Corruption Layer

```typescript
interface EventTranslator {
  source: string;
  translate(externalEvent: ExternalEvent): DomainEvent | null;
  canHandle(event: ExternalEvent): boolean;
}

class AntiCorruptionLayer {
  constructor(
    private translators: Map<string, EventTranslator>,
    private js: JetStreamClient,
  ) {}

  async handleExternal(externalEvent: ExternalEvent): Promise<DomainEvent | null> {
    const translator = this.translators.get(externalEvent.source);
    if (!translator || !translator.canHandle(externalEvent)) return null;

    const domainEvent = translator.translate(externalEvent);
    if (!domainEvent) return null;

    // Publicar o evento traduzido no barramento
    await this.js.publish(
      `${domainEvent.aggregateType}.${domainEvent.aggregateId}`,
      JSON.stringify(domainEvent),
      {
        msgHeaders: {
          'event-type': domainEvent.type,
          'event-version': String(domainEvent.version),
          'aggregate-type': domainEvent.aggregateType,
          'source': externalEvent.source,
        },
      },
    );

    return domainEvent;
  }

  private translatorsImpl = new Map<string, EventTranslator>([
    ['github', {
      source: 'github',
      canHandle: (event) => event.payload?.repository != null,
      translate: (event) => ({
        id: crypto.randomUUID(),
        aggregateId: `github:${event.payload.repository}`,
        aggregateType: 'integration.github',
        type: 'external_github_event',
        version: 1,
        data: {
          action: event.payload.action,
          repository: event.payload.repository,
          ref: event.payload.ref,
          sender: event.payload.sender,
        },
        metadata: {
          causationId: event.id,
          correlationId: event.payload.correlationId || crypto.randomUUID(),
          agentId: 'system:github-webhook',
          timestamp: Date.now(),
        },
      }),
    }],
    ['gitlab', {
      source: 'gitlab',
      canHandle: (event) => event.payload?.project != null,
      translate: (event) => ({
        id: crypto.randomUUID(),
        aggregateId: `gitlab:${event.payload.project.path_with_namespace}`,
        aggregateType: 'integration.gitlab',
        type: 'external_gitlab_event',
        version: 1,
        data: {
          action: event.payload.action,
          project: event.payload.project.path_with_namespace,
          ref: event.payload.ref,
        },
        metadata: {
          causationId: event.id,
          correlationId: event.payload.correlationId || crypto.randomUUID(),
          agentId: 'system:gitlab-webhook',
          timestamp: Date.now(),
        },
      }),
    }],
  ]);
}

interface ExternalEvent {
  id: string;
  source: string;
  type: string;
  payload: Record<string, any>;
  timestamp: number;
}
```

### 2.4 Integration with @ideia/event-bus

```typescript
import { IEventBus, EventHandler } from '@ideia/event-bus';

class EventSourcingBridge {
  constructor(
    private eventBus: IEventBus,
    private eventStore: IEventStore,
    private snapshotManager: SnapshotManager,
  ) {}

  async setupSubscriptions(): Promise<void> {
    // Escutar comandos do barramento e rotear para event sourcing
    await this.eventBus.subscribe('command.*', async (event) => {
      const command = event.payload as Command;
      await this.handleCommand(command);
    });

    // Publicar eventos de domínio no barramento
    await this.eventBus.subscribe('event.*', async (event) => {
      const domainEvent = event.payload as DomainEvent;
      await this.handleDomainEvent(domainEvent);
    });
  }

  private async handleCommand(command: Command): Promise<void> {
    // Roteamento baseado no tipo de comando
    switch (command.type) {
      case 'make_decision':
        await this.executeCommandOnAggregate(
          AgentDecisionAggregate,
          command,
          (agg) => agg.makeDecision(command.data.action as string, command.metadata.agentId),
        );
        break;
      case 'complete_decision':
        await this.executeCommandOnAggregate(
          AgentDecisionAggregate,
          command,
          (agg) => agg.complete(),
        );
        break;
      default:
        console.warn(`Unknown command type: ${command.type}`);
    }
  }

  private async executeCommandOnAggregate<T extends AggregateRoot<TState>, TState>(
    aggregateClass: new (id: string) => T,
    command: Command,
    operation: (aggregate: T) => void,
  ): Promise<void> {
    const concurrencyHandler = new ConcurrencyHandler(
      new EventSourcedRepository(
        this.eventStore,
        (id) => new aggregateClass(id),
        this.snapshotManager,
        aggregateClass.name,
      ),
    );

    await concurrencyHandler.executeWithRetry(
      command.aggregateId,
      async (aggregate: T) => {
        operation(aggregate);
      },
    );

    // Emitir resultado no barramento
    await this.eventBus.emit(`command.${command.type}.completed`, {
      commandId: command.id,
      aggregateId: command.aggregateId,
      aggregateType: command.aggregateType,
      timestamp: Date.now(),
    });
  }

  private async handleDomainEvent(event: DomainEvent): Promise<void> {
    // Atualizar read models
    const kvProjection = new KVProjectionUpdater();
    // Obtido da injeção de dependência
    // await kvProjection.updateFromEvent(event, this.kv);

    // Verificar se há sagas escutando este evento
    await this.eventBus.emit(`events.${event.type}`, event);
  }
}
```

---

## 3. NÍVEL INOVAÇÃO

### 3.1 Event Sourcing + CQRS com NATS KV

```typescript
// NATS KV como banco de leitura (materialized views)
// Projeções são escritas no KV após processar eventos

class KVProjectionUpdater {
  constructor(private kv: KvContext) {}

  async updateFromEvent(event: DomainEvent): Promise<void> {
    const key = `projection:${event.aggregateType}:${event.aggregateId}`;

    const current = await this.kv.get(key);
    const state = current ? JSON.parse(new TextDecoder().decode(current.value)) : {};

    const newState = this.applyEvent(state, event);

    await this.kv.put(key, new TextEncoder().encode(JSON.stringify(newState)));
  }

  async queryState<T>(aggregateType: string, id: string): Promise<T | null> {
    const entry = await this.kv.get(`projection:${aggregateType}:${id}`);
    if (!entry) return null;
    return JSON.parse(new TextDecoder().decode(entry.value)) as T;
  }

  async bulkUpdateFromEvents(events: DomainEvent[]): Promise<void> {
    const batch = this.kv.batch();
    for (const event of events) {
      const key = `projection:${event.aggregateType}:${event.aggregateId}`;
      // Para bulk, fazer update em lote é complexo com KV, então serializamos
      // Mas NATS KV suporta operações atômicas via sequence number
    }
  }

  private applyEvent(state: any, event: DomainEvent): any {
    switch (event.type) {
      case 'decision_made':
        return {
          ...state,
          decisions: [...(state.decisions || []), event.data],
          lastUpdate: event.metadata.timestamp,
          version: event.version,
        };
      case 'decision_completed':
        return {
          ...state,
          status: 'completed',
          lastUpdate: event.metadata.timestamp,
          version: event.version,
        };
      default:
        return state;
    }
  }
}
```

### 3.2 Cached Event Store (Read-Through + Write-Through Cache)

```typescript
class CachedEventStore implements IEventStore {
  private cache = new Map<string, DomainEvent[]>();
  private cacheTTL = 5 * 60 * 1000; // 5 min
  private cacheTimestamps = new Map<string, number>();

  constructor(private inner: IEventStore) {}

  async appendEvents(aggregateType: string, aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void> {
    await this.inner.appendEvents(aggregateType, aggregateId, events, expectedVersion);
    // Invalidar cache
    this.invalidateCache(aggregateType, aggregateId);
  }

  async loadEvents(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    const cacheKey = `${aggregateType}:${aggregateId}`;
    const cached = this.cache.get(cacheKey);
    const timestamp = this.cacheTimestamps.get(cacheKey);

    if (cached && timestamp && Date.now() - timestamp < this.cacheTTL) {
      return cached;
    }

    const events = await this.inner.loadEvents(aggregateType, aggregateId);
    this.cache.set(cacheKey, events);
    this.cacheTimestamps.set(cacheKey, Date.now());
    return events;
  }

  async loadEventsSince(aggregateType: string, aggregateId: string, fromVersion: number): Promise<DomainEvent[]> {
    // Para cargas parciais, não usar cache
    return this.inner.loadEventsSince(aggregateType, aggregateId, fromVersion);
  }

  async *loadAllEvents(aggregateType: string): AsyncGenerator<DomainEvent> {
    yield* this.inner.loadAllEvents(aggregateType);
  }

  private invalidateCache(aggregateType: string, aggregateId: string): void {
    const cacheKey = `${aggregateType}:${aggregateId}`;
    this.cache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
  }
}
```

### 3.3 Parallel Projection Building

```typescript
class ParallelProjectionManager {
  constructor(
    private eventStore: IEventStore,
    private kv: KvContext,
  ) {}

  async buildAllProjections(projections: ProjectionDefinition[]): Promise<ProjectionBuildResult[]> {
    const results: ProjectionBuildResult[] = [];

    // Agrupar projeções por aggregate type para otimizar replay
    const byAggregateType = new Map<string, ProjectionDefinition[]>();
    for (const proj of projections) {
      const existing = byAggregateType.get(proj.aggregateType) || [];
      existing.push(proj);
      byAggregateType.set(proj.aggregateType, existing);
    }

    // Processar cada aggregate type em paralelo
    const tasks = Array.from(byAggregateType.entries()).map(async ([aggregateType, projs]) => {
      const startTime = Date.now();
      let eventsProcessed = 0;

      const generator = this.eventStore.loadAllEvents(aggregateType);
      for await (const event of generator) {
        for (const proj of projs) {
          if (proj.filter && !proj.filter(event)) continue;
          await this.applyEventToProjection(proj, event);
        }
        eventsProcessed++;

        // Yield a cada 1000 eventos
        if (eventsProcessed % 1000 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      return {
        aggregateType,
        projections: projs.map(p => p.name),
        eventsProcessed,
        duration: Date.now() - startTime,
      };
    });

    const taskResults = await Promise.all(tasks);
    results.push(...taskResults);

    return results;
  }

  private async applyEventToProjection(projection: ProjectionDefinition, event: DomainEvent): Promise<void> {
    const key = `projection:${projection.name}:${event.aggregateId}`;
    const current = await this.kv.get(key);
    const state = current ? JSON.parse(new TextDecoder().decode(current.value)) : projection.initialState;

    const handler = projection.handlers.get(event.type);
    if (handler) {
      const newState = handler(state, event);
      await this.kv.put(key, new TextEncoder().encode(JSON.stringify(newState)));
    }
  }
}

interface ProjectionDefinition {
  name: string;
  aggregateType: string;
  initialState: any;
  handlers: Map<string, (state: any, event: DomainEvent) => any>;
  filter?: (event: DomainEvent) => boolean;
}

interface ProjectionBuildResult {
  aggregateType: string;
  projections: string[];
  eventsProcessed: number;
  duration: number;
}
```

### 3.4 Temporal Consistency

```typescript
class TemporalConsistencyChecker {
  constructor(private eventStore: IEventStore) {}

  async checkConsistency(aggregateId: string): Promise<ConsistencyReport> {
    const events = await this.eventStore.loadEvents('*', aggregateId);
    const issues: ConsistencyIssue[] = [];

    for (let i = 1; i < events.length; i++) {
      // Event timestamp deve ser monotônico
      if (events[i].metadata.timestamp < events[i - 1].metadata.timestamp) {
        issues.push({
          type: 'non_monotonic_timestamp',
          eventId: events[i].id,
          severity: 'warning',
          expected: String(events[i - 1].metadata.timestamp),
          actual: String(events[i].metadata.timestamp),
        });
      }

      // Version deve ser estritamente incremental
      if (events[i].version !== events[i - 1].version + 1) {
        issues.push({
          type: 'version_gap',
          eventId: events[i].id,
          severity: 'error',
          expected: String(events[i - 1].version + 1),
          actual: String(events[i].version),
        });
      }

      // CorrelationId deve ser consistente dentro de uma saga
      if (events[i].metadata.correlationId !== events[i - 1].metadata.correlationId) {
        // Pode ser ok se for um novo fluxo
      }
    }

    return {
      aggregateId,
      totalEvents: events.length,
      consistent: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  async checkStreamConsistency(aggregateType: string): Promise<StreamConsistencyReport> {
    const aggregates = new Set<string>();
    const issues: ConsistencyIssue[] = [];
    let totalEvents = 0;

    const generator = this.eventStore.loadAllEvents(aggregateType);
    for await (const event of generator) {
      aggregates.add(event.aggregateId);
      totalEvents++;

      // Verificar se aggregateId existe
      if (!event.aggregateId) {
        issues.push({
          type: 'missing_aggregate_id',
          eventId: event.id,
          severity: 'error',
        });
      }
    }

    return {
      stream: aggregateType,
      totalAggregates: aggregates.size,
      totalEvents,
      issues,
      consistent: issues.filter(i => i.severity === 'error').length === 0,
    };
  }
}

interface ConsistencyReport {
  aggregateId: string;
  totalEvents: number;
  consistent: boolean;
  issues: ConsistencyIssue[];
}

interface StreamConsistencyReport {
  stream: string;
  totalAggregates: number;
  totalEvents: number;
  consistent: boolean;
  issues: ConsistencyIssue[];
}

interface ConsistencyIssue {
  type: string;
  eventId: string;
  severity: 'error' | 'warning' | 'info';
  expected?: string;
  actual?: string;
  message?: string;
}
```

---

## 4. NÍVEL FRONTEIRAS

### 4.1 Event Sourcing vs CRDT

| Aspecto | Event Sourcing | CRDT |
|---------|---------------|------|
| Ordem de eventos | Total (por aggregate) | Parcial (concorrente) |
| Consistência | Forte (por aggregate) | Eventual |
| Resolução de conflitos | Manual (sagas) | Automática (merge) |
| NATS suporte | nativo (streams) | Requer custom |
| Complexidade | Média | Alta |
| Uso IDEIA | Decisões de agentes | Edição colaborativa de arquivos |
| Replay | Completo e determinístico | Parcial (depende de merge) |
| Snapshot | Sim (KV) | Não aplicável |
| Versionamento | Explícito (event.version) | Implícito (merge) |

### 4.2 Estratégias de Snapshot Avançadas

```typescript
interface SnapshotStrategy {
  shouldTakeSnapshot(aggregate: AggregateRoot<any>): Promise<boolean>;
  onSnapshotTaken(aggregate: AggregateRoot<any>): Promise<void>;
}

class AdaptiveSnapshotStrategy implements SnapshotStrategy {
  private eventCountSinceSnapshot = 0;

  constructor(
    private baseInterval: number = 50,
    private maxEventCount: number = 200,
    private timeBasedThreshold: number = 30 * 60 * 1000,
    private lastSnapshotTime: number = Date.now(),
  ) {}

  async shouldTakeSnapshot(aggregate: AggregateRoot<any>): Promise<boolean> {
    this.eventCountSinceSnapshot = aggregate.version % this.baseInterval;
    const timeSinceSnapshot = Date.now() - this.lastSnapshotTime;

    // Snapshot se passou do threshold de tempo OU contagem
    return (
      this.eventCountSinceSnapshot >= this.maxEventCount ||
      timeSinceSnapshot >= this.timeBasedThreshold
    );
  }

  async onSnapshotTaken(aggregate: AggregateRoot<any>): Promise<void> {
    this.eventCountSinceSnapshot = 0;
    this.lastSnapshotTime = Date.now();
  }
}

class LoadAwareSnapshotStrategy implements SnapshotStrategy {
  private loadCount = 0;

  constructor(
    private snapshotInterval: number = 50,
    private loadThreshold: number = 100,
  ) {}

  async shouldTakeSnapshot(aggregate: AggregateRoot<any>): Promise<boolean> {
    // Snapshot mais agressivo para aggregates muito carregados
    const effectiveInterval = this.loadCount > this.loadThreshold
      ? Math.floor(this.snapshotInterval / 2)
      : this.snapshotInterval;

    return aggregate.version > 0 && aggregate.version % effectiveInterval === 0;
  }

  async onSnapshotTaken(aggregate: AggregateRoot<any>): Promise<void> {
    // Reset load count
    this.loadCount = 0;
  }

  incrementLoadCount(): void {
    this.loadCount++;
  }
}
```

### 4.3 Problemas em Aberto

1. **Snapshot divergence** — Se snapshot e stream divergem, como reconciliar?
2. **Migration zero-downtime** — Migrar schema de eventos sem parar o sistema
3. **Garbage collection de snapshots** — Snapshots antigos consomem espaço
4. **Cross-aggregate queries** — Como query eventos de múltiplos aggregates eficientemente?
5. **Event ordering across streams** — Garantir ordenação causal entre streams diferentes
6. **Large event payloads** — Eventos com payload grande (ex: diffs de arquivos) impactam performance
7. **Idempotency at store level** — Garantir que o mesmo evento não seja duplicado

---

## 5. ANÁLISE PARA IDEIA

### 5.1 O Que Existe

```
packages/event-bus/src/            — EventBus in-memory + NATS stub
packages/event-bus/src/streams.ts   — Configuração de streams NATS
packages/event-bus/src/consumers.ts — Consumer groups
packages/event-bus/src/kv-store.ts  — KV store (usado para snapshots)
packages/event-bus/__tests__/nats-integration.test.ts — 404 lines
```

**FALTA:** Event sourcing repository pattern, AggregateRoot base, EventStore interface, snapshotting, projections, sagas, event replay engine

### 5.2 Plano de Implementação

| # | Componente | Esforço | Dependências |
|---|-----------|---------|-------------|
| 1 | AggregateRoot base class + DomainEvent interface | 4h | contracts |
| 2 | IEventStore interface + NATSEventStore | 8h | event-bus |
| 3 | EventSourcedRepository (aggregate load/save) | 6h | EventStore |
| 4 | Snapshot manager + strategies (KV store) | 6h | event-bus KV |
| 5 | Projection builder + live projections | 8h | NATS consumers |
| 6 | Event migration engine (schema evolution) | 8h | EventStore |
| 7 | Saga manager (compensating transactions) | 10h | CommandBus |
| 8 | Event replay engine | 6h | EventStore + Snapshots |
| 9 | Concurrency handler + retry | 4h | Repository |
| 10 | Temporal consistency checker | 4h | EventStore |
| 11 | Anti-corruption layer | 6h | EventBus |
| 12 | Integration bridge @ideia/event-bus | 4h | tudo acima |
| 13 | Parallel projection builder | 6h | KV store |
| 14 | Cached event store | 4h | EventStore |

**Total estimado:** ~78h (~10 dias)

### 5.3 Integration with NATS

```
                                    ┌──────────────┐
                                    │   NATS KV    │
                                    │  (snapshots) │
                                    └──────┬───────┘
                                           │
Command → EventSourcedRepository.save() → NATS Stream → Projection Builder → KV (read model)
                │                                       │
                │                                  ┌────┴────┐
                │                                  │  Event   │
                │                                  │  Store   │
                ▼                                  └─────────┘
     AggregateRoot.apply()
                │
                ▼
         EventReplayEngine
         (reconstruct state)
```

### 5.4 Exemplo Completo: Fluxo de Decisão de Agente

```typescript
// 1. Criar aggregate
const aggregate = new AgentDecisionAggregate('decision-1');

// 2. Executar comandos
aggregate.makeDecision('analyze_code', 'agent-1');
aggregate.makeDecision('generate_tests', 'agent-1');
aggregate.complete();

// 3. Persistir via repositório
const repository = new EventSourcedRepository(
  eventStore,
  (id) => new AgentDecisionAggregate(id),
  snapshotManager,
  'AgentDecisionAggregate',
);

await repository.save(aggregate, 0); // expectedVersion = 0 (novo)

// 4. Carregar depois
const loaded = await repository.load('decision-1');
console.log(loaded.toState());
// { decisions: [{ action: 'analyze_code', ... }, { action: 'generate_tests', ... }], status: 'completed' }

// 5. Replay para auditoria
const replayEngine = new EventReplayEngine(eventStore, snapshotManager);
const replayed = await replayEngine.replayAggregate(AgentDecisionAggregate, 'decision-1');
console.log(replayed.toState()); // Mesmo estado que loaded
```

---

## 6. QUALITY GATES

| Gate | Descrição | Ferramenta |
|------|-----------|------------|
| Type safety | DomainEvent, AggregateRoot genéricos | tsc --noEmit |
| Concorrência | Testes de concorrência com optimistic locking | Jest |
| Idempotência | Mesmo evento aplicado múltiplas vezes → mesmo estado | Teste de mutação |
| Consistência temporal | Verificador de timestamps e versões | ConsistencyChecker |
| Performance | Load 10K eventos < 100ms | Benchmark |
| Snapshot recovery | Snapshot + replay = mesmo estado | Teste de integração |
| Schema migration | Migração sem perda de dados | Teste E2E |

---

## 7. REFERÊNCIAS

1. "Event Sourcing" — Martin Fowler. martinfowler.com/eaaDev/EventSourcing.html
2. NATS JetStream. docs.nats.io/nats-concepts/jetstream
3. "CQRS Documents" — Greg Young. cqrs.files.wordpress.com
4. "Building Event-Driven Microservices" — Amazon 2024
5. "Domain-Driven Design" — Eric Evans. Addison-Wesley 2003
6. "Implementing Domain-Driven Design" — Vaughn Vernon. Addison-Wesley 2013
7. "Event Sourcing and Stream Processing at Scale" — LinkedIn Engineering
8. "The Anatomy of an Event Sourcing System" — EventStore Blog
9. "NATS: A New Infrastructure for Event Streaming" — Synadia
10. "Patterns of Event-Driven Architecture" — Microsoft. learn.microsoft.com/en-us/azure/architecture/patterns/
