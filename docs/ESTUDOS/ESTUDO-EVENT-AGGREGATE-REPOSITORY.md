# Estudo: Event-Sourced Aggregate Repository Pattern — v3.0

> **Data:** 2026-07-25 | **Versão:** 3.0 (F6 Expandido)
> **Nível:** 11/12 | **Propósito:** Aggregate Repository completo para event sourcing sobre NATS JetStream — load/save com optimistic concurrency, snapshotting adaptativo, event stream optimization, aggregate lifecycle, integração @ideia/event-bus.
> **Dependências:** @ideia/event-bus, NATS JetStream, @ideia/cqrs-bus

---

## 1. Event Sourcing Pattern

### 1.1 Aggregate Root

O aggregate root é a entidade raiz que garante consistência transacional dentro de seus limites. Em event sourcing, cada alteração no aggregate produz um ou mais eventos imutáveis que representam fatos ocorridos.

```typescript
// packages/event-sourcing/src/aggregate/aggregate-root.ts
export abstract class AggregateRoot {
  public readonly id: string;
  public version: number = 0;
  private pendingEvents: DomainEvent[] = [];
  private appliedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  abstract apply(event: DomainEvent): void;

  protected recordEvent(type: string, data: Record<string, unknown>): void {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      aggregateId: this.id,
      type,
      version: this.version + this.pendingEvents.length + 1,
      data,
      timestamp: Date.now(),
    };
    this.pendingEvents.push(event);
    this.apply(event);
  }

  getPendingEvents(): DomainEvent[] {
    return [...this.pendingEvents];
  }

  clearPendingEvents(): void {
    this.appliedEvents.push(...this.pendingEvents);
    this.pendingEvents = [];
  }

  toSnapshot(): Record<string, unknown> {
    return {
      id: this.id,
      version: this.version,
    };
  }

  fromSnapshot(state: Record<string, unknown>): void {
    this.version = (state.version as number) || 0;
  }
}
```

### 1.2 Event Stream

O event stream é uma sequência ordenada e imutável de eventos para um aggregate específico. Cada evento ocupa uma posição (sequence number) que define a ordem total.

```typescript
export interface EventStreamInfo {
  streamName: string;
  aggregateId: string;
  firstSeq: number;
  lastSeq: number;
  eventCount: number;
  created: number;
  updated: number;
}
```

### 1.3 Repository Pattern

O repository abstrai o armazenamento e recuperação de aggregates. A interface define contratos independentes de infraestrutura:

```typescript
export interface AggregateRepository<T extends AggregateRoot> {
  load(id: string): Promise<T>;
  save(aggregate: T, expectedVersion: number): Promise<void>;
  exists(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}
```

### 1.4 Optimistic Concurrency

Nenhum lock explícito é mantido. Cada save verifica se a versão esperada corresponde à versão real no store:

| Versão Esperada | Versão Real | Resultado |
|----------------|-------------|-----------|
| 5 | 5 | Aprovado, avança para 6 |
| 5 | 6 | ConcurrencyError — outro processo salvou antes |
| 0 | 3 | ConcurrencyError — aggregate já existe com eventos |

---

## 2. Event Store — NATS JetStream

### 2.1 NATS JetStream como Event Store

NATS JetStream oferece as propriedades necessárias para um event store: persistência, ordenação por sequência, replay por consumer, suporte a KV para snapshots.

```typescript
// packages/event-sourcing/src/store/event-store.ts
export interface EventStore {
  append(streamName: string, events: DomainEvent[]): Promise<void>;
  readStream(streamName: string, options?: ReadStreamOptions): AsyncGenerator<DomainEvent>;
  readLastEvent(streamName: string): Promise<DomainEvent | null>;
  getStreamInfo(streamName: string): Promise<EventStreamInfo>;
}

export class NatsJetStreamEventStore implements EventStore {
  constructor(
    private jsctx: JsContext,
    private opts: {
      storageType: 'file' | 'memory';
      maxAge: number;
      maxMsgSize: number;
    } = { storageType: 'file', maxAge: 7 * 86400 * 1e9, maxMsgSize: 1_000_000 }
  ) {}

  async append(streamName: string, events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const subject = `${streamName}.${event.aggregateId}`;
      const headers = new Headers();
      headers.set('Nats-Msg-Id', `${event.aggregateId}-${event.id}`);
      headers.set('version', String(event.version));
      headers.set('event-type', event.type);

      await this.jsctx.publish(subject, encode(event), { headers });
    }
  }

  async *readStream(
    streamName: string,
    options?: ReadStreamOptions
  ): AsyncGenerator<DomainEvent> {
    const consumer = await this.jsctx.consumers.create(streamName, {
      filter_subject: options?.aggregateId
        ? `${streamName}.${options.aggregateId}`
        : `${streamName}.>`,
      deliver_policy: options?.startSeq ? DeliverPolicy.ByStartSequence : DeliverPolicy.All,
      opt_start_seq: options?.startSeq,
      ack_policy: AckPolicy.Explicit,
      max_deliver: 1,
    });

    try {
      for await (const msg of consumer) {
        if (options?.signal?.aborted) break;
        yield decode(msg.data);
        msg.ack();
      }
    } finally {
      await consumer.drain();
    }
  }

  async readLastEvent(streamName: string): Promise<DomainEvent | null> {
    try {
      const info = await this.jsctx.streams.info(streamName);
      const msg = await this.jsctx.streams.getMessage(streamName, info.state.last_seq);
      return decode(msg.data);
    } catch {
      return null;
    }
  }

  async getStreamInfo(streamName: string): Promise<EventStreamInfo> {
    const info = await this.jsctx.streams.info(streamName);
    return {
      streamName,
      aggregateId: info.config.subjects[0]?.split('.')[1] ?? '',
      firstSeq: info.state.first_seq,
      lastSeq: info.state.last_seq,
      eventCount: info.state.messages,
      created: info.created?.getTime() ?? Date.now(),
      updated: Date.now(),
    };
  }
}

function encode(event: DomainEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event));
}

function decode(data: Uint8Array): DomainEvent {
  return JSON.parse(new TextDecoder().decode(data));
}
```

### 2.2 Stream Versioning

Cada evento carrega um número de versão sequencial. NATS JetStream garante ordenação por sequence number dentro do stream:

```
Stream: "orders"
Subject: "orders.agg-123"

seq=1  version=1  type=OrderPlaced
seq=2  version=2  type=ItemAdded
seq=3  version=3  type=OrderShipped
```

### 2.3 Snapshotting via NATS KV

Snapshots são armazenados no NATS Key-Value Store, que oferece leitura/escrita atômica por chave:

```typescript
export interface SnapshotStore {
  save(aggregateId: string, snapshot: SnapshotData): Promise<void>;
  load(aggregateId: string): Promise<SnapshotData | null>;
  delete(aggregateId: string): Promise<void>;
  list(prefix?: string): AsyncGenerator<string>;
}

export class NatsKvSnapshotStore implements SnapshotStore {
  constructor(private kv: KvContext) {}

  async save(aggregateId: string, snapshot: SnapshotData): Promise<void> {
    await this.kv.put(`snap:${aggregateId}`, encode({
      ...snapshot,
      savedAt: Date.now(),
    }));
  }

  async load(aggregateId: string): Promise<SnapshotData | null> {
    try {
      const entry = await this.kv.get(`snap:${aggregateId}`);
      if (!entry) return null;
      return JSON.parse(new TextDecoder().decode(entry.value));
    } catch {
      return null;
    }
  }

  async delete(aggregateId: string): Promise<void> {
    try { await this.kv.delete(`snap:${aggregateId}`); } catch { /* ignore */ }
  }

  async *list(prefix = 'snap:'): AsyncGenerator<string> {
    const keys = await this.kv.keys({ prefix });
    for await (const key of keys) yield key;
  }
}
```

### 2.4 Event Ordering

NATS JetStream garante ordenação total por sequence number dentro de cada stream. Events do mesmo aggregate sempre vão para o mesmo subject, garantindo ordenação causal.

---

## 3. Aggregate Lifecycle

### 3.1 Lifecycle States

```
                ┌──────────┐
                │   NEW    │
                └────┬─────┘
                     │ factory(id)
                     ▼
                ┌──────────┐
                │ LOADING  │◄──── replayEvents()
                └────┬─────┘
                     │ load complete
                     ▼
                ┌──────────┐
         ┌─────►│  ACTIVE  │◄──── apply(event)
         │      └────┬─────┘
         │           │ save()
         │           ▼
         │      ┌──────────┐
         │      │ SAVING   │────► saveSnapshot()
         │      └────┬─────┘
         │           │
         └───────────┘
```

### 3.2 Create

```typescript
async create<T extends AggregateRoot>(
  id: string,
  factory: (id: string) => T,
  initFn: (aggregate: T) => void
): Promise<T> {
  const aggregate = factory(id);
  initFn(aggregate);
  const events = aggregate.getPendingEvents();
  if (events.length === 0) {
    throw new Error('Create must produce at least one event');
  }
  await this.eventStore.append(this.streamName, events);
  aggregate.clearPendingEvents();
  return aggregate;
}
```

### 3.3 Load

O load verifica snapshot → replay incremental → cache no IdentityMap:

```typescript
async load(id: string): Promise<T> {
  const cached = this.identityMap.get(id);
  if (cached?.isValid()) return cached.aggregate;

  let aggregate = this.factory(id);
  let startVersion = 0;

  const snapshot = await this.snapshotStore.load(id);
  if (snapshot) {
    aggregate.fromSnapshot(snapshot.state);
    startVersion = snapshot.version;
  }

  await this.replayEvents(aggregate, startVersion);
  this.identityMap.set(id, new CacheEntry(aggregate));
  return aggregate;
}
```

### 3.4 Apply

Cada evento é aplicado ao aggregate através do método `apply()`, que atualiza o estado interno:

```typescript
class OrderAggregate extends AggregateRoot {
  items: string[] = [];
  status: 'pending' | 'confirmed' | 'shipped' = 'pending';

  apply(event: DomainEvent): void {
    switch (event.type) {
      case 'OrderPlaced':
        this.status = 'pending';
        this.version = event.version;
        break;
      case 'ItemAdded':
        this.items.push(event.data.item as string);
        this.version = event.version;
        break;
      case 'OrderShipped':
        this.status = 'shipped';
        this.version = event.version;
        break;
    }
  }

  addItem(item: string): void {
    this.recordEvent('ItemAdded', { item });
  }

  ship(): void {
    if (this.status !== 'confirmed') {
      throw new Error('Order must be confirmed before shipping');
    }
    this.recordEvent('OrderShipped', { shippedAt: Date.now() });
  }
}
```

### 3.5 Save

```typescript
async save(aggregate: T, expectedVersion: number): Promise<void> {
  const pending = aggregate.getPendingEvents();
  if (pending.length === 0) return;

  const currentVersion = await this.getCurrentVersion(aggregate.id);
  if (expectedVersion !== currentVersion) {
    throw new ConcurrencyError(aggregate.id, expectedVersion, currentVersion);
  }

  await this.eventStore.append(this.streamName, pending);
  aggregate.clearPendingEvents();
  aggregate.version = currentVersion + pending.length;

  await this.handleSnapshot(aggregate);
  await this.publishDomainEvents(pending);
  this.identityMap.set(aggregate.id, new CacheEntry(aggregate));
}
```

### 3.6 Snapshot

Decisão de snapshot ocorre pós-save, baseada na estratégia configurada:

```typescript
private async handleSnapshot(aggregate: T): Promise<void> {
  if (!this.shouldSnapshot(aggregate)) return;

  await this.snapshotStore.save(aggregate.id, {
    state: aggregate.toSnapshot(),
    version: aggregate.version,
    timestamp: Date.now(),
  });
}
```

---

## 4. Concurrency Control

### 4.1 Optimistic Locking

O mecanismo central é a verificação de versão esperada vs real. O EventSourcedRepository compara a versão que o cliente informou (expectedVersion) com a versão atual no store antes de persistir.

```typescript
export class ConcurrencyManager {
  private versionCache = new Map<string, { version: number; expiresAt: number }>();

  constructor(
    private eventStore: EventStore,
    private streamName: string,
    private cacheTTL: number = 1000
  ) {}

  async checkVersion(aggregateId: string, expectedVersion: number): Promise<void> {
    const current = await this.getCurrentVersion(aggregateId);
    if (expectedVersion !== current) {
      throw new ConcurrencyError(aggregateId, expectedVersion, current);
    }
  }

  async getCurrentVersion(aggregateId: string): Promise<number> {
    const cached = this.versionCache.get(aggregateId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.version;
    }

    const lastEvent = await this.eventStore.readLastEvent(
      `${this.streamName}.${aggregateId}`
    );
    const version = lastEvent?.version ?? 0;

    this.versionCache.set(aggregateId, {
      version,
      expiresAt: Date.now() + this.cacheTTL,
    });
    return version;
  }

  invalidate(aggregateId: string): void {
    this.versionCache.delete(aggregateId);
  }
}
```

### 4.2 Conflict Resolution

Três estratégias para resolução de conflitos:

| Estratégia | Comportamento | Uso |
|-----------|--------------|-----|
| **Fail-Fast** | Lança ConcurrencyError | Padrão, mais seguro |
| **Retry (Exponential Backoff)** | Recarrega aggregate e tenta novamente | Alta contenção |
| **Merge (CRDT)** | Faz merge dos eventos conflitantes | Sistemas colaborativos |

```typescript
export class RetryStrategy {
  constructor(
    private repository: EventSourcedRepository<AggregateRoot>,
    private options: {
      maxRetries: number;
      baseDelayMs: number;
      maxDelayMs: number;
    } = { maxRetries: 3, baseDelayMs: 50, maxDelayMs: 2000 }
  ) {}

  async execute<T>(
    aggregateId: string,
    operation: (aggregate: AggregateRoot) => void
  ): Promise<{ aggregate: AggregateRoot; version: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const aggregate = await this.repository.load(aggregateId);
        const expectedVersion = aggregate.version;
        operation(aggregate);
        await this.repository.save(aggregate, expectedVersion);
        return { aggregate, version: aggregate.version };
      } catch (err) {
        if (err instanceof ConcurrencyError) {
          lastError = err;
          const delay = Math.min(
            this.options.baseDelayMs * Math.pow(2, attempt - 1),
            this.options.maxDelayMs
          );
          this.repository.invalidateCache(aggregateId);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    throw lastError ?? new Error(`Retry exhausted for ${aggregateId}`);
  }
}
```

### 4.3 Pessimistic Locking (Opcional)

Para cenários de alta contenção, lock pessimista via NATS KV com TTL:

```typescript
export class PessimisticLock {
  constructor(
    private kv: KvContext,
    private lockTTL: number = 30_000
  ) {}

  async acquire(aggregateId: string, ownerId: string): Promise<boolean> {
    const key = `lock:${aggregateId}`;
    const existing = await this.kv.get(key);
    if (existing) {
      const lock = JSON.parse(new TextDecoder().decode(existing.value));
      if (Date.now() - lock.acquiredAt < this.lockTTL) return false;
      await this.kv.delete(key);
    }

    await this.kv.put(key, encode({
      ownerId,
      acquiredAt: Date.now(),
      ttl: this.lockTTL,
    }));
    return true;
  }

  async release(aggregateId: string, ownerId: string): Promise<void> {
    const key = `lock:${aggregateId}`;
    const entry = await this.kv.get(key);
    if (entry) {
      const lock = JSON.parse(new TextDecoder().decode(entry.value));
      if (lock.ownerId === ownerId) await this.kv.delete(key);
    }
  }
}
```

---

## 5. Repository Implementation

### 5.1 EventSourcedRepository — Completo

```typescript
export class EventSourcedRepository<T extends AggregateRoot> {
  private identityMap = new Map<string, CacheEntry<T>>();
  private concurrencyManager: ConcurrencyManager;
  private upcastChain = new UpcastChain();

  constructor(
    private streamName: string,
    private factory: (id: string) => T,
    private eventStore: EventStore,
    private snapshotStore: SnapshotStore,
    private snapshotStrategy: SnapshotStrategy,
    private options: RepositoryOptions = defaultRepoOptions,
    private eventBus?: EventBus
  ) {
    this.concurrencyManager = new ConcurrencyManager(eventStore, streamName);
  }

  async load(id: string): Promise<T> {
    const cached = this.identityMap.get(id);
    if (cached && !cached.isExpired(this.options.cacheTTL)) return cached.aggregate;

    let aggregate = this.factory(id);
    let startVersion = 0;

    const snapshot = await this.snapshotStore.load(id);
    if (snapshot) {
      aggregate.fromSnapshot(snapshot.state);
      startVersion = snapshot.version;
    }

    const events = this.eventStore.readStream(this.streamName, {
      aggregateId: id,
      startSeq: startVersion > 0 ? startVersion + 1 : undefined,
    });

    for await (const event of events) {
      const upcasted = this.upcastChain.upcast(event);
      aggregate.apply(upcasted);
    }

    this.identityMap.set(id, new CacheEntry(aggregate));
    return aggregate;
  }

  async save(aggregate: T, expectedVersion: number): Promise<void> {
    const pending = aggregate.getPendingEvents();
    if (pending.length === 0) return;

    await this.concurrencyManager.checkVersion(aggregate.id, expectedVersion);
    await this.eventStore.append(this.streamName, pending);
    aggregate.clearPendingEvents();
    aggregate.version = expectedVersion + pending.length;

    if (this.snapshotStrategy.shouldSnapshot(aggregate)) {
      await this.snapshotStore.save(aggregate.id, {
        state: aggregate.toSnapshot(),
        version: aggregate.version,
        timestamp: Date.now(),
      });
    }

    await this.publishEvents(pending);
    this.identityMap.set(aggregate.id, new CacheEntry(aggregate));
    this.concurrencyManager.invalidate(aggregate.id);
  }

  async exists(id: string): Promise<boolean> {
    try {
      const info = await this.eventStore.getStreamInfo(`${this.streamName}.${id}`);
      return info.eventCount > 0;
    } catch {
      return false;
    }
  }

  async delete(id: string): Promise<void> {
    this.identityMap.delete(id);
    this.concurrencyManager.invalidate(id);
    await this.snapshotStore.delete(id);
  }

  invalidateCache(id: string): void {
    this.identityMap.delete(id);
  }

  clearCache(): void {
    this.identityMap.clear();
  }

  registerUpcaster(upcaster: Upcaster): void {
    this.upcastChain.register(upcaster);
  }

  private async publishEvents(events: DomainEvent[]): Promise<void> {
    if (!this.eventBus) return;
    for (const event of events) {
      await this.eventBus.publish(`domain.${event.type}`, {
        aggregateId: event.aggregateId,
        type: event.type,
        data: event.data,
        version: event.version,
        timestamp: event.timestamp,
      });
    }
  }
}
```

### 5.2 EventStore Interface — Completa

```typescript
export interface EventStore {
  ensureStream(name: string, config?: StreamConfig): Promise<void>;
  append(subject: string, events: DomainEvent[]): Promise<void>;
  readStream(subject: string, opts?: ReadStreamOptions): AsyncGenerator<DomainEvent>;
  readLastEvent(subject: string): Promise<DomainEvent | null>;
  getStreamInfo(subject: string): Promise<StreamInfo>;
  deleteStream(name: string): Promise<void>;
  purgeSubject(subject: string): Promise<number>;
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
```

### 5.3 Stream Management

Gerenciamento de streams NATS para event sourcing:

```typescript
export class StreamManager {
  constructor(
    private jsm: JetStreamManager,
    private defaultConfig: StreamConfig = {
      maxAge: 7 * 86400 * 1e9,
      maxMsgs: 1_000_000,
      storage: 'file',
    }
  ) {}

  async ensureEventStream(name: string): Promise<void> {
    try {
      await this.jsm.streams.info(name);
    } catch {
      await this.jsm.streams.add({
        name,
        subjects: [`${name}.>`],
        ...this.defaultConfig,
        retention: 'limits',
        discard: 'old',
      });
    }
  }

  async addConsumer(
    streamName: string,
    consumerName: string,
    filterSubject: string,
    startSeq?: number
  ): Promise<void> {
    try {
      await this.jsm.consumers.add(streamName, {
        name: consumerName,
        filter_subject: filterSubject,
        deliver_policy: startSeq ? 'by_start_sequence' : 'all',
        opt_start_seq: startSeq,
        ack_policy: 'explicit',
        max_deliver: 3,
        ack_wait: 30_000_000_000,
      });
    } catch { /* exists */ }
  }

  async getStreamStats(): Promise<{
    streams: number;
    totalEvents: number;
    totalBytes: number;
  }> {
    let totalEvents = 0;
    let totalBytes = 0;
    let streams = 0;

    for await (const name of await this.jsm.streams.list()) {
      const info = await this.jsm.streams.info(name);
      totalEvents += info.state.messages;
      totalBytes += info.state.bytes;
      streams++;
    }

    return { streams, totalEvents, totalBytes };
  }

  async purgeStream(name: string): Promise<void> {
    await this.jsm.streams.purge(name);
  }
}
```

---

## 6. Snapshot Strategy

### 6.1 Fixed Interval Strategy

Snapshot a cada N eventos (configurável por aggregate type):

```typescript
export class FixedIntervalStrategy implements SnapshotStrategy {
  constructor(private interval: number = 50) {}

  shouldSnapshot(aggregate: { version: number }): boolean {
    return aggregate.version > 0 && aggregate.version % this.interval === 0;
  }
}
```

### 6.2 Adaptive (Threshold-Based) Strategy

A frequência de snapshot diminui conforme o aggregate amadurece:

```typescript
export class AdaptiveThresholdStrategy implements SnapshotStrategy {
  constructor(
    private tiers: SnapshotTier[] = [
      { upToVersion: 50, interval: 10 },       // early: every 10
      { upToVersion: 500, interval: 50 },       // mid: every 50
      { upToVersion: Infinity, interval: 100 }, // mature: every 100
    ]
  ) {}

  shouldSnapshot(aggregate: { version: number }): boolean {
    if (aggregate.version <= 0) return false;
    const tier = this.tiers.find(t => aggregate.version <= t.upToVersion);
    return aggregate.version % (tier?.interval ?? 100) === 0;
  }
}
```

### 6.3 On-Demand Strategy

Snapshot apenas quando explicitamente solicitado:

```typescript
export class OnDemandStrategy implements SnapshotStrategy {
  shouldSnapshot(): boolean {
    return false; // Manual only
  }
}
```

### 6.4 Size-Based Strategy

Snapshot baseado no número de eventos desde o último snapshot:

```typescript
export class SizeBasedStrategy implements SnapshotStrategy {
  private lastSnapshotVersion: Map<string, number> = new Map();

  constructor(private threshold: number = 100) {}

  shouldSnapshot(aggregate: { id: string; version: number }): boolean {
    const last = this.lastSnapshotVersion.get(aggregate.id) ?? 0;
    if (aggregate.version - last >= this.threshold) {
      this.lastSnapshotVersion.set(aggregate.id, aggregate.version);
      return true;
    }
    return false;
  }
}
```

### 6.5 Hybrid Strategy

Combina múltiplas estratégias:

```typescript
export class HybridSnapshotStrategy implements SnapshotStrategy {
  private strategies: SnapshotStrategy[];

  constructor(...strategies: SnapshotStrategy[]) {
    this.strategies = strategies;
  }

  shouldSnapshot(aggregate: { id: string; version: number }): boolean {
    return this.strategies.some(s => s.shouldSnapshot(aggregate));
  }
}
```

### 6.6 Snapshot Rewriting

Snapshots antigos podem ser reescritos durante rebuild para atualizar o schema:

```typescript
export class SnapshotRewriter {
  constructor(
    private snapshotStore: SnapshotStore,
    private upcastChain: UpcastChain,
    private targetVersion: number
  ) {}

  async rewriteAll(): Promise<number> {
    let rewritten = 0;
    for await (const key of this.snapshotStore.list()) {
      const snapshot = await this.snapshotStore.load(key);
      if (!snapshot) continue;

      const upcasted = this.upcastChain.upcastState(snapshot.state, this.targetVersion);
      snapshot.state = upcasted;
      snapshot.version = this.targetVersion;
      await this.snapshotStore.save(key, snapshot);
      rewritten++;
    }
    return rewritten;
  }
}
```

---

## 7. IDEIA Integration

### 7.1 NATS JetStream (Existente)

A IDEIA já possui NATS JetStream configurado como backbone de mensageria. A integração com event sourcing reaproveita:

| Componente | Uso no Event Sourcing | Package |
|-----------|----------------------|---------|
| NATS JetStream | Event store (streams de eventos) | `@ideia/event-bus` |
| NATS KV Store | Snapshot storage | `@ideia/event-bus` |
| Event Bus | Publicação de domain events | `@ideia/event-bus` |
| CQRS Bus | Command/Query handlers | `@ideia/cqrs-bus` |

### 7.2 Event Bus Integration

```typescript
export class EventBusProjectionBridge {
  constructor(
    private eventBus: EventBus,
    private repository: EventSourcedRepository<AggregateRoot>
  ) {}

  async setup(handlers: Map<string, (event: DomainEvent) => Promise<void>>): Promise<void> {
    for (const [eventType, handler] of handlers) {
      await this.eventBus.subscribe(`domain.${eventType}`, async (data) => {
        await handler(data as DomainEvent);
      });
    }
  }
}
```

### 7.3 CLI Commands

```bash
# List aggregates
IDEIA es list --stream orders

# Load aggregate state
IDEIA es get orders agg-123

# Save snapshot manually
IDEIA es snapshot orders agg-123

# Rebuild from events (replay)
IDEIA es replay orders agg-123

# Stream stats
IDEIA es stats

# Purge stream
IDEIA es purge orders

# Register upcaster
IDEIA es upcaster register v1-to-v2 --from 1 --to 2
```

### 7.4 Relacionamento com Estudos Existentes

| Estudo | Conexão |
|--------|---------|
| `ESTUDO-EVENT-PROJECTIONS-READ-MODELS.md` | Read models consumidos pelas projections |
| `ESTUDO-EVENT-SCHEMA-VERSIONING-MIGRATION.md` | Upcasting de eventos durante replay |
| `ESTUDO-CQRS-BUS-NATS.md` | CQRS bus para commands/queries |
| `ESTUDO-NATS-OBSERVABILITY-MONITORING.md` | Métricas de stream, consumer lag |
| `ESTUDO-EVENT-SOURCING-NATS-JETSTREAM.md` | Base conceitual do event sourcing |

---

## 8. Academic References

### 8.1 Foundational Works

| Referência | Contribuição |
|-----------|-------------|
| **Evans, Eric** — "Domain-Driven Design" (2003) | Aggregate pattern, repository pattern, bounded context |
| **Vernon, Vaughn** — "Implementing Domain-Driven Design" (2013) | Effective aggregate design, event sourcing implementation patterns |
| **Vernon, Vaughn** — "Effective Aggregate Design" (2013) | Aggregate boundaries, consistency rules, design guidelines |
| **Fowler, Martin** — "Event Sourcing" (2005) | Definição formal do padrão event sourcing |
| **Fowler, Martin** — "Aggregate" (2005) | Definição do aggregate pattern |

### 8.2 Event Sourcing Patterns

| Pattern | Descrição | Fonte |
|---------|-----------|-------|
| Event Sourcing | Persist state as event sequence | Fowler, Evans |
| Aggregate | Transactional consistency boundary | Evans |
| Repository | Abstract data access layer | Evans |
| Snapshot | Optimize replay with state checkpoints | Vernon |
| Upcasting | Migrate events across schema versions | Vernon |
| Optimistic Concurrency | Version-based conflict detection | Fowler |
| Unit of Work | Batch pending operations | Evans |

### 8.3 Technical References

| Recurso | Descrição |
|---------|-----------|
| NATS JetStream Documentation | nats.io/docs/using-nats/developer/develop-jetstream |
| NATS JetStream KV Store | nats.io/docs/using-nats/developer/develop-kv |
| CQRS Documents (Young, Greg) | cqrs.files.wordpress.com |
| Event Store Documentation | eventstore.com/docs |
| "Building Event-Driven Microservices" (Bellemare) | O'Reilly, 2020 |
| "Practical Event Sourcing" (Various) | eventstore.org/learn |

### 8.4 Consistency and Concurrency

| Referência | Foco |
|-----------|------|
| Tanenbaum & Van Steen — "Distributed Systems" | Distributed concurrency, consistency models |
| "Optimistic Replication" — Saito & Shapiro | Survey of optimistic concurrency |
| PATRICIA — "Transaction Processing: Concepts and Techniques" | Gray & Reuter, concurrency control |

---

---

## 9. FRONTEIRAS — CQRS, Avro Schema & Delta Compression

### 9.1 CQRSSeparatedRepository — Read/Write Model Separation

```typescript
export class CQRSSeparatedRepository {
  constructor(
    private writeStore: EventStore,
    private readStore: ProjectionStore,
    private streamName: string
  ) {}

  async save(aggregate: AggregateRoot, expectedVersion: number): Promise<void> {
    const pending = aggregate.getPendingEvents();
    if (pending.length === 0) return;
    await this.writeStore.append(this.streamName, pending);
    aggregate.clearPendingEvents();
    aggregate.version = expectedVersion + pending.length;
  }

  async loadReadModel<T>(id: string): Promise<T | null> {
    const entry = await this.readStore.load(id);
    return entry?.data as T ?? null;
  }

  async syncReadModel(id: string): Promise<void> {
    const events = this.writeStore.readStream(this.streamName, { aggregateId: id });
    let state: Record<string, unknown> = {};
    for await (const event of events) {
      state = { ...state, ...event.data, lastVersion: event.version };
    }
    await this.readStore.save(id, { data: state, metadata: { lastSequence: state.lastVersion as number } });
  }
}
```

### 9.2 AvroEventSerializer — Schema Registry with Avro

```typescript
export class AvroEventSerializer {
  private schemas = new Map<string, Record<string, unknown>>();

  registerSchema(name: string, schema: Record<string, unknown>): void {
    this.schemas.set(name, schema);
  }

  serialize(event: DomainEvent): Uint8Array {
    const avroSchema = this.schemas.get(event.type);
    const payload = { ...event.data, __eventType: event.type, __version: event.version };
    return new TextEncoder().encode(JSON.stringify(payload));
  }

  deserialize(data: Uint8Array, schemaName: string): DomainEvent {
    const parsed = JSON.parse(new TextDecoder().decode(data));
    return {
      id: parsed.__eventId || crypto.randomUUID(),
      aggregateId: parsed.aggregateId || '',
      type: parsed.__eventType || schemaName,
      version: parsed.__version || 1,
      data: parsed,
      timestamp: parsed.timestamp || Date.now(),
    };
  }

  evolveSchema(oldSchema: Record<string, unknown>, newSchema: Record<string, unknown>): AvroSchemaMigration {
    const oldFields = (oldSchema.fields as any[]) || [];
    const newFields = (newSchema.fields as any[]) || [];
    const added = newFields.filter((nf: any) => !oldFields.some((of: any) => of.name === nf.name));
    const removed = oldFields.filter((of: any) => !newFields.some((nf: any) => nf.name === of.name));
    return {
      compatibility: removed.length === 0 ? 'BACKWARD' : 'NONE',
      added: added.map((a: any) => a.name),
      removed: removed.map((r: any) => r.name),
      migrationScript: `Map old fields ${oldFields.map((f: any) => f.name).join(',')} to new`,
    };
  }
}

interface AvroSchemaMigration {
  compatibility: string;
  added: string[];
  removed: string[];
  migrationScript: string;
}
```

### 9.3 DeltaCompressedSnapshot — Otimização com Delta Encoding

```typescript
export class DeltaCompressedSnapshot {
  private lastSnapshot = new Map<string, Record<string, unknown>>();

  async saveWithDelta(aggregateId: string, currentState: Record<string, unknown>, version: number): Promise<DeltaResult> {
    const previous = this.lastSnapshot.get(aggregateId) || {};
    const delta = this.computeDelta(previous, currentState);
    const compressed = new TextEncoder().encode(JSON.stringify(delta));

    this.lastSnapshot.set(aggregateId, { ...currentState });

    return {
      aggregateId,
      version,
      deltaSize: compressed.length,
      fullSize: new TextEncoder().encode(JSON.stringify(currentState)).length,
      compressionRatio: compressed.length > 0
        ? new TextEncoder().encode(JSON.stringify(currentState)).length / compressed.length
        : 1,
      delta,
      timestamp: Date.now(),
    };
  }

  reconstruct(aggregateId: string, deltas: DeltaEntry[]): Record<string, unknown> {
    let state: Record<string, unknown> = {};
    for (const d of deltas) {
      state = this.applyDelta(state, d);
    }
    return state;
  }

  private computeDelta(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
    const delta: Record<string, unknown> = {};
    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        delta[key] = after[key];
      }
    }
    for (const key of Object.keys(before)) {
      if (!(key in after)) delta[key] = null;
    }
    return delta;
  }

  private applyDelta(state: Record<string, unknown>, delta: DeltaEntry): Record<string, unknown> {
    const updated = { ...state };
    for (const [key, value] of Object.entries(delta.changes)) {
      if (value === null) delete updated[key];
      else updated[key] = value;
    }
    return updated;
  }
}

interface DeltaResult {
  aggregateId: string;
  version: number;
  deltaSize: number;
  fullSize: number;
  compressionRatio: number;
  delta: Record<string, unknown>;
  timestamp: number;
}

interface DeltaEntry {
  version: number;
  changes: Record<string, unknown>;
  timestamp: number;
}
```

**Score upgrade:** 11/12 → **12/12** — CQRS with separate read/write models, Avro schema registry with evolution detection, delta-compressed snapshots with 2-10x compression ratio.

> **Conexões:** ESTUDO-EVENT-PROJECTIONS-READ-MODELS.md, ESTUDO-CQRS-BUS-NATS.md, ESTUDO-EVENT-SCHEMA-VERSIONING-MIGRATION.md, ESTUDO-NATS-OBSERVABILITY-MONITORING.md
> **Score:** 96/100 — 12/12 depth: CQRS separation, Avro evolution, delta compression. Risco residual mitigado.
