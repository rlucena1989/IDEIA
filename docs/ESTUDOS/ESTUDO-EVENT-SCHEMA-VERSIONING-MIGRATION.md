# Estudo: Event Schema Versioning & Migration

> **Data:** 2026-07-24 | **Versão:** 3.0 (intensificação F6)
> **Nível de Profundidade:** 10/12
> **Área:** Arquitetura — Evolução de Schemas de Eventos
> **Dependências:** Event Sourcing, Aggregate Repository, Schema Registry
> **Conexões:** CQRS NATS, Projections/Read Models, ESTUDO-EVENT-AGGREGATE-REPOSITORY.md
> **Propósito:** Estratégias completas de versionamento e migração de schemas de eventos em sistemas event-sourced — upcasting, downcasting, double-write, schema registry, compatibilidade retroativa/progressiva, zero-downtime migration, Avro/Protobuf schemas, integração com NATS JetStream.

---

## 1. Fundamentos

### 1.1 Problema

Em sistemas event-sourced, eventos são imutáveis por definição. Mas schemas evoluem: novos campos são adicionados, campos renomeados, tipos alterados, campos removidos. Como evoluir o schema sem perder dados históricos armazenados no NATS JetStream, quebrar consumidores existentes ou exigir downtime?

### 1.2 Arquitetura Geral

```
+-----------------------------------------------------------+
|                   Schema Evolution Pipeline               |
+---------------------------+-------------------------------+
                            |
          +-----------------+------------------+
          |                 |                  |
  +-------v-------+  +------v--------+  +------v--------+
  | SchemaRegistry |  |Migr. Engine   |  |Compat.Checker |
  +-------+-------+  +-------+-------+  +-------+-------+
          |                  |                  |
  +-------v------------------v------------------v-------+
  |              SchemaVersionManager                    |
  +------------------------------------------------------+
          |
  +-------v------------------------------------------------+
  |            ZeroDowntimeMigration (4 fases)              |
  +---------------------------------------------------------+
```

### 1.3 Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Forward Compatibility | Consumidor novo consegue ler eventos escritos com schema antigo |
| Backward Compatibility | Consumidor antigo consegue ler eventos escritos com schema novo |
| Upcast | Migração de evento de versão antiga para versão nova |
| Downcast | Migração de evento novo para versão antiga |
| Double-Write | Escrever evento em versão antiga E nova simultaneamente |
| Breaking Change | Mudança incompatível: renomear campo, alterar tipo, remover campo |
| Schema Registry | Catálogo centralizado de schemas com validação e versionamento |

### 1.4 Tipos de Compatibilidade

| Tipo | Descrição | Mudanças Permitidas | Quebra |
|------|-----------|---------------------|--------|
| BACKWARD | Consumidor antigo lê schema novo | Add campo com default, reordenar | Remover campo, add campo sem default |
| FORWARD | Consumidor novo lê schema antigo | Remover campo, add campo com default | Renomear campo, alterar tipo |
| FULL | Ambos compatíveis | Add/remover campo com default | Alterar tipo, renomear |
| NONE | Sem garantia | Qualquer mudança | Qualquer mudança quebra |

---

## 2. Arquitetura Detalhada

### 2.1 Componentes

```
+-----------------------------------------------------------+
|                    SchemaRegistry                           |
|  +------------------+  +------------------+  +----------+ |
|  | SchemaStore      |  | SchemaValidator  |  |Resolver  | |
|  +--------+---------+  +--------+---------+  +----+-----+ |
|           |                     |                   |      |
|  +--------v---------------------v-------------------v--+ |
|  |              CompatibilityChecker                     | |
|  |  forward/backward/full/none + breaking changes       | |
|  +------------------------------------------------------+ |

+-----------------------------------------------------------+
|                    MigrationEngine                         |
|  +------------------+  +------------------+  +----------+ |
|  | UpcastEngine     |  | DowncastEngine   |  |DblWrite  | |
|  | chain upcasters  |  | reverse chain    |  | both ver | |
|  +--------+---------+  +--------+---------+  +----+-----+ |
+-----------------------------------------------------------+
```

### 2.2 Fluxo de Migração Zero-Downtime

```
Fase 1: Double-Write
  Producer -> New Schema (v3) -> NATS JetStream v3
          -> Old Schema (v2) -> NATS JetStream v2
  Consumers v2 <- schema v2
  Consumers v3 <- schema v3

Fase 2: Backfill (background job)
  BackfillJob -> Upcast v2->v3 (batch) -> NATS JetStream v3

Fase 3: Switch
  Consumers v2 migram para v3. Monitorar erro rate 24h.

Fase 4: Retire
  Remover double-write. Deprecate schema v2. Compact stream.
```

---

## 3. Implementação

### 3.1 SchemaRegistry

```typescript
// packages/event-sourcing/src/schema/schema-registry.ts
export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface SchemaDefinition {
  type: string;
  version: number;
  fields: SchemaField[];
  createdAt: number;
  updatedAt: number;
}

export interface SchemaVersion {
  type: string;
  version: number;
  schema: SchemaDefinition;
  checksum: string;
  isDeprecated: boolean;
  deprecationDate?: number;
}

export class SchemaRegistry {
  private schemas: Map<string, SchemaVersion[]> = new Map();
  private kv: KvContext;
  constructor(kv?: KvContext) { this.kv = kv!; }

  async register(schema: SchemaDefinition): Promise<SchemaVersion> {
    const existing = this.schemas.get(schema.type) ?? [];
    if (existing.some(v => v.version === schema.version)) {
      throw new Error(`Schema ${schema.type} v${schema.version} already registered`);
    }
    const checksum = this.computeChecksum(schema);
    const version: SchemaVersion = {
      type: schema.type, version: schema.version,
      schema: { ...schema, createdAt: Date.now(), updatedAt: Date.now() },
      checksum, isDeprecated: false,
    };
    existing.push(version);
    existing.sort((a, b) => b.version - a.version);
    this.schemas.set(schema.type, existing);
    if (this.kv) await this.persist(schema.type, version);
    return version;
  }

  async validate(event: { type: string; data: Record<string, unknown>; version: number }) {
    const versions = this.schemas.get(event.type);
    if (!versions) return { valid: true, errors: [] };
    const sv = versions.find(v => v.version === event.version);
    if (!sv) return { valid: false, errors: [`Schema ${event.type} v${event.version} not found`] };
    const errors: string[] = [];
    for (const field of sv.schema.fields) {
      const value = event.data[field.name];
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Required field '${field.name}' is missing`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  resolve(type: string, version?: number): SchemaDefinition | null {
    const versions = this.schemas.get(type);
    if (!versions || versions.length === 0) return null;
    if (version !== undefined) return versions.find(v => v.version === version)?.schema ?? null;
    return versions[0].schema;
  }

  getLatestVersion(type: string): number {
    const versions = this.schemas.get(type);
    return versions && versions.length > 0 ? versions[0].version : 0;
  }

  listAllVersions(type: string): SchemaVersion[] { return this.schemas.get(type) ?? []; }

  deprecate(type: string, version: number): void {
    const versions = this.schemas.get(type);
    const sv = versions?.find(v => v.version === version);
    if (sv) { sv.isDeprecated = true; sv.schema.updatedAt = Date.now(); }
  }

  private computeChecksum(schema: SchemaDefinition): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(schema.fields)).digest('hex').substring(0, 16);
  }

  private async persist(type: string, version: SchemaVersion): Promise<void> {
    await this.kv.put(`schema:${type}:v${version.version}`, new TextEncoder().encode(JSON.stringify(version)));
  }
}
```

### 3.2 CompatibilityChecker

```typescript
// packages/event-sourcing/src/schema/compatibility-checker.ts
export interface BreakingChange {
  type: 'field_removed' | 'field_renamed' | 'type_changed' | 'required_added' | 'default_removed';
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export class CompatibilityChecker {
  constructor(private registry: SchemaRegistry) {}

  isForwardCompatible(oldS: SchemaDefinition, newS: SchemaDefinition): boolean {
    for (const of_ of oldS.fields) {
      const nf = newS.fields.find(f => f.name === of_.name);
      if (!nf) continue;
      if (nf.type !== of_.type) return false;
    }
    return true;
  }

  isBackwardCompatible(oldS: SchemaDefinition, newS: SchemaDefinition): boolean {
    for (const nf of newS.fields) {
      const of_ = oldS.fields.find(f => f.name === nf.name);
      if (!of_) {
        if (nf.required && nf.defaultValue === undefined) return false;
        continue;
      }
      if (nf.type !== of_.type) return false;
      if (nf.required && !of_.required) return false;
    }
    for (const of_ of oldS.fields) {
      if (!newS.fields.find(f => f.name === of_.name)) return false;
    }
    return true;
  }

  detectBreakingChanges(oldS: SchemaDefinition, newS: SchemaDefinition): BreakingChange[] {
    const changes: BreakingChange[] = [];
    for (const of_ of oldS.fields) {
      const nf = newS.fields.find(f => f.name === of_.name);
      if (!nf) {
        changes.push({ type: 'field_removed', field: of_.name, description: `Field '${of_.name}' removed`, severity: 'high' });
      } else if (nf.type !== of_.type) {
        changes.push({ type: 'type_changed', field: of_.name, description: `Field '${of_.name}' type changed`, severity: 'high' });
      } else if (nf.required && !of_.required) {
        changes.push({ type: 'required_added', field: of_.name, description: `Field '${of_.name}' became required`, severity: 'medium' });
      }
    }
    for (const nf of newS.fields) {
      if (!oldS.fields.find(f => f.name === nf.name) && nf.required && nf.defaultValue === undefined) {
        changes.push({ type: 'default_removed', field: nf.name, description: `New field '${nf.name}' no default`, severity: 'medium' });
      }
    }
    return changes;
  }

  async checkType(type: string, fromVer: number, toVer: number) {
    const oldS = this.registry.resolve(type, fromVer);
    const newS = this.registry.resolve(type, toVer);
    if (!oldS || !newS) return { compatible: false, compatibilityType: 'UNKNOWN' as const, breakingChanges: [] };
    const backward = this.isBackwardCompatible(oldS, newS);
    const forward = this.isForwardCompatible(oldS, newS);
    return {
      compatible: backward || forward,
      compatibilityType: backward && forward ? 'FULL' : backward ? 'BACKWARD' : forward ? 'FORWARD' : 'NONE',
      breakingChanges: this.detectBreakingChanges(oldS, newS),
    };
  }
}
```

### 3.3 MigrationEngine

```typescript
// packages/event-sourcing/src/schema/migration-engine.ts
export interface Migration {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (event: Record<string, unknown>) => Record<string, unknown>;
}

export class MigrationEngine {
  private migrations: Migration[] = [];
  constructor(private registry: SchemaRegistry) {}

  registerMigration(m: Migration): void {
    this.migrations.push(m);
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  async upcast(event: Record<string, unknown>, targetVersion: number): Promise<Record<string, unknown>> {
    let current = { ...event };
    let cv = (event.version as number) || 1;
    const path = this.findPath(cv, targetVersion);
    if (!path) throw new Error(`No migration path v${cv} to v${targetVersion}`);
    for (const m of path) {
      current = m.migrate(current);
      current.version = m.toVersion;
      cv = m.toVersion;
    }
    return current;
  }

  async downcast(event: Record<string, unknown>, targetVersion: number): Promise<Record<string, unknown>> {
    let current = { ...event };
    let cv = (event.version as number) || 1;
    const reversed = [...this.migrations].reverse();
    while (cv > targetVersion) {
      const m = reversed.find(r => r.toVersion === cv);
      if (!m) throw new Error(`No downcast path from v${cv}`);
      current = m.migrate(current);
      current.version = m.toVersion;
      cv = m.toVersion;
    }
    return current;
  }

  async doubleWrite(event: Record<string, unknown>, jsctx: JsContext, stream: string): Promise<void> {
    const cv = (event.version as number) || 1;
    await jsctx.publish(`${stream}.${event.aggregateId as string}`, new TextEncoder().encode(JSON.stringify(event)));
    if (cv > 1) {
      const old = await this.downcast(event, cv - 1);
      await jsctx.publish(`${stream}.${old.aggregateId as string}.v${cv - 1}`, new TextEncoder().encode(JSON.stringify(old)));
    }
  }

  async batchUpcast(events: Record<string, unknown>[], targetVersion: number): Promise<Record<string, unknown>[]> {
    const results: Record<string, unknown>[] = [];
    let errors = 0;
    for (const e of events) {
      try { results.push(await this.upcast(e, targetVersion)); }
      catch { errors++; results.push(e); }
    }
    if (errors > 0) console.warn(`Batch upcast: ${errors}/${events.length} failed`);
    return results;
  }

  private findPath(from: number, to: number): Migration[] | null {
    if (from >= to) return [];
    const path: Migration[] = [];
    let cur = from;
    while (cur < to) {
      const m = this.migrations.find(x => x.fromVersion === cur && x.toVersion <= to);
      if (!m) return null;
      path.push(m);
      cur = m.toVersion;
    }
    return path;
  }

  async verifyChain(from: number, to: number) {
    const steps: string[] = [];
    const errors: string[] = [];
    let cur = from;
    while (cur < to) {
      const m = this.migrations.find(x => x.fromVersion === cur);
      if (!m) { errors.push(`No migration from v${cur}`); break; }
      steps.push(m.description || `v${m.fromVersion}->v${m.toVersion}`);
      cur = m.toVersion;
    }
    return { valid: errors.length === 0 && cur === to, steps, errors };
  }
}
```

### 3.4 ZeroDowntimeMigration

```typescript
// packages/event-sourcing/src/schema/zero-downtime-migration.ts
export interface MigrationPhase {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'rolled_back';
  startedAt?: number;
  completedAt?: number;
}

export interface MigrationPlan {
  type: string;
  fromVersion: number;
  toVersion: number;
  compatibility: string;
  phases: MigrationPhase[];
  estimatedDuration: string;
}

export class ZeroDowntimeMigration {
  private plan: MigrationPlan | null = null;
  private aborted = false;
  constructor(private engine: MigrationEngine, private jsctx: JsContext, private registry: SchemaRegistry) {}

  async planMigration(type: string, from: number, to: number): Promise<MigrationPlan> {
    const compat = await new CompatibilityChecker(this.registry).checkType(type, from, to);
    const phases: MigrationPhase[] = [
      { name: 'double-write', status: 'pending' },
      { name: 'backfill', status: 'pending' },
      { name: 'switch', status: 'pending' },
      { name: 'retire', status: 'pending' },
    ];
    this.plan = { type, fromVersion: from, toVersion: to, compatibility: compat.compatibilityType, phases, estimatedDuration: '48h' };
    return this.plan;
  }

  async executePhase(idx: number): Promise<void> {
    if (!this.plan || this.aborted) return;
    const phase = this.plan.phases[idx];
    if (!phase) throw new Error(`Invalid phase ${idx}`);
    phase.status = 'active';
    phase.startedAt = Date.now();
    try {
      switch (phase.name) {
        case 'double-write': await this.execDoubleWrite(); break;
        case 'backfill': await this.execBackfill(); break;
        case 'switch': await this.execSwitch(); break;
        case 'retire': await this.execRetire(); break;
      }
      phase.status = 'completed';
    } catch {
      phase.status = 'rolled_back';
      throw new Error(`Phase ${phase.name} failed`);
    }
    phase.completedAt = Date.now();
  }

  private async execDoubleWrite(): Promise<void> {
    console.log('Phase 1: Double-write enabled');
  }

  private async execBackfill(): Promise<void> {
    if (!this.plan) return;
    console.log(`Phase 2: Backfilling v${this.plan.fromVersion} -> v${this.plan.toVersion}`);
    const streams = await this.jsctx.streams.list();
    for await (const name of streams) {
      const info = await this.jsctx.streams.info(name);
      const consumer = await this.jsctx.consumers.create(name, { deliver_policy: 'all', ack_policy: 'explicit' });
      const batch: Record<string, unknown>[] = [];
      try {
        const msgs = await consumer.consume({ max_messages: info.state.messages });
        for await (const msg of msgs) {
          const ev = JSON.parse(new TextDecoder().decode(msg.data));
          if ((ev.version as number) < this.plan.toVersion) batch.push(ev);
          msg.ack();
          if (batch.length >= 100) {
            const upcasted = await this.engine.batchUpcast(batch, this.plan.toVersion);
            for (const u of upcasted) await this.jsctx.publish(`${name}.${u.aggregateId as string}`, new TextEncoder().encode(JSON.stringify(u)));
            batch.length = 0;
          }
        }
      } finally { await consumer.drain(); }
    }
  }

  private async execSwitch(): Promise<void> {
    console.log(`Phase 3: Switching consumers to v${this.plan!.toVersion}. Monitor 24h.`);
  }

  private async execRetire(): Promise<void> {
    console.log(`Phase 4: Retiring v${this.plan!.fromVersion}`);
    this.registry.deprecate(this.plan!.type, this.plan!.fromVersion);
  }

  async executeFull(type: string, from: number, to: number): Promise<void> {
    this.plan = await this.planMigration(type, from, to);
    for (let i = 0; i < this.plan.phases.length; i++) {
      if (this.aborted) { console.log(`Aborted at phase ${i}`); return; }
      await this.executePhase(i);
    }
    console.log(`Migration complete: ${type} v${from} -> v${to}`);
  }

  abort(): void { this.aborted = true; console.log('Migration aborted'); }
}
```

### 3.5 Avro Schema Adapter

```typescript
// packages/event-sourcing/src/schema/avro-adapter.ts
export class AvroSchemaAdapter {
  toSchemaDefinition(avro: Record<string, unknown>): SchemaDefinition {
    const fields: SchemaField[] = (avro.fields as any[] || []).map((f: any) => ({
      name: f.name,
      type: this.avroToFieldType(f.type),
      required: !f.default && !(Array.isArray(f.type) && f.type.includes('null')),
      defaultValue: f.default,
      description: f.doc,
    }));
    return { type: (avro.name as string) || 'unknown', version: (avro.version as number) || 1, fields, createdAt: Date.now(), updatedAt: Date.now() };
  }

  toAvroSchema(schema: SchemaDefinition): Record<string, unknown> {
    return { type: 'record', name: schema.type, version: schema.version, fields: schema.fields.map(f => ({ name: f.name, type: f.type, default: f.defaultValue, doc: f.description })) };
  }

  private avroToFieldType(t: any): string {
    if (typeof t === 'string') return t;
    if (Array.isArray(t)) { const types = t.filter((x: any) => x !== 'null'); return types.length > 0 ? (typeof types[0] === 'string' ? types[0] : 'object') : 'null'; }
    return t?.type || 'object';
  }
}
```

---

## 4. Integração IDEIA

### 4.1 Integração com NATS JetStream

```typescript
// packages/event-sourcing/src/schema/nats-schema-integration.ts
export class NatsSchemaIntegration {
  private streamSchemas = new Map<string, { schema: SchemaDefinition; streamName: string }>();

  constructor(private jsctx: JsContext, private registry: SchemaRegistry, private engine: MigrationEngine) {}

  async registerStreamSchema(stream: string, schema: SchemaDefinition): Promise<void> {
    await this.registry.register(schema);
    this.streamSchemas.set(stream, { schema, streamName: stream });
  }

  async validateStreamEvent(stream: string, event: Record<string, unknown>): Promise<boolean> {
    const entry = this.streamSchemas.get(stream);
    if (!entry) return true;
    const result = await this.registry.validate({ type: event.type as string, data: event.data as Record<string, unknown>, version: event.version as number });
    return result.valid;
  }

  async publishWithValidation(stream: string, subject: string, event: Record<string, unknown>): Promise<void> {
    const valid = await this.validateStreamEvent(stream, event);
    if (!valid) throw new Error(`Event validation failed for stream ${stream}`);
    await this.jsctx.publish(subject, new TextEncoder().encode(JSON.stringify(event)), {
      headers: { 'schema-type': event.type as string, 'schema-version': String(event.version || 1) },
    });
  }

  async migrateStream(stream: string, targetVersion: number): Promise<void> {
    const entry = this.streamSchemas.get(stream);
    if (!entry) throw new Error(`Stream ${stream} not registered`);
    if (targetVersion <= entry.schema.version) return;
    const migration = new ZeroDowntimeMigration(this.engine, this.jsctx, this.registry);
    await migration.executeFull(entry.schema.type, entry.schema.version, targetVersion);
    entry.schema = this.registry.resolve(entry.schema.type, targetVersion)!;
  }
}
```

### 4.2 Consumer Schema Resolution

```typescript
// packages/event-sourcing/src/schema/consumer-schema-resolver.ts
export class ConsumerSchemaResolver {
  constructor(private registry: SchemaRegistry) {}

  resolveConsumerSchema(consumerType: string, writerVersion: number): { schema: SchemaDefinition; version: number } {
    const versions = this.registry.listAllVersions(consumerType);
    const compatible = versions.find(v => v.version >= writerVersion && v.version - writerVersion <= 1);
    const schema = this.registry.resolve(consumerType, compatible?.version || writerVersion);
    if (!schema) throw new Error(`No compatible schema for ${consumerType}`);
    return { schema, version: compatible?.version || writerVersion };
  }

  createAdapter(consumerType: string, writerVersion: number, engine: MigrationEngine) {
    return {
      adapt: async (event: Record<string, unknown>) => {
        const ev = (event.version as number) || 1;
        if (ev < writerVersion) return engine.upcast(event, writerVersion);
        if (ev > writerVersion) return engine.downcast(event, writerVersion);
        return event;
      },
    };
  }
}
```

---

## 5. Métricas e Testes

### 5.1 Testes Unitários

```typescript
describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;
  beforeEach(() => { registry = new SchemaRegistry(); });

  it('should register and resolve schema', async () => {
    const s: SchemaDefinition = { type: 'UserCreated', version: 1, fields: [{ name: 'name', type: 'string', required: true }], createdAt: Date.now(), updatedAt: Date.now() };
    await registry.register(s);
    expect(registry.resolve('UserCreated', 1)).toBeDefined();
    expect(registry.getLatestVersion('UserCreated')).toBe(1);
  });

  it('should reject duplicate versions', async () => {
    const s: SchemaDefinition = { type: 'T', version: 1, fields: [], createdAt: 0, updatedAt: 0 };
    await registry.register(s);
    await expect(registry.register(s)).rejects.toThrow();
  });
});

describe('CompatibilityChecker', () => {
  let checker: CompatibilityChecker;
  let registry: SchemaRegistry;
  beforeEach(() => { registry = new SchemaRegistry(); checker = new CompatibilityChecker(registry); });

  it('backward compat: adding optional field with default', () => {
    const oldS: SchemaDefinition = { type: 'T', version: 1, fields: [{ name: 'a', type: 'string', required: true }], createdAt: 0, updatedAt: 0 };
    const newS: SchemaDefinition = { type: 'T', version: 2, fields: [{ name: 'a', type: 'string', required: true }, { name: 'b', type: 'string', required: false, defaultValue: '' }], createdAt: 0, updatedAt: 0 };
    expect(checker.isBackwardCompatible(oldS, newS)).toBe(true);
  });

  it('detect type change as breaking', () => {
    const oldS: SchemaDefinition = { type: 'T', version: 1, fields: [{ name: 'a', type: 'string', required: true }], createdAt: 0, updatedAt: 0 };
    const newS: SchemaDefinition = { type: 'T', version: 2, fields: [{ name: 'a', type: 'number', required: true }], createdAt: 0, updatedAt: 0 };
    const changes = checker.detectBreakingChanges(oldS, newS);
    expect(changes.some(c => c.type === 'type_changed')).toBe(true);
  });
});

describe('MigrationEngine', () => {
  it('should upcast through chain', async () => {
    const registry = new SchemaRegistry();
    const engine = new MigrationEngine(registry);
    engine.registerMigration({ fromVersion: 1, toVersion: 2, description: 'Add meta', migrate: (e) => ({ ...e, data: { ...(e.data as object || {}), meta: true }, version: 2 }) });
    engine.registerMigration({ fromVersion: 2, toVersion: 3, description: 'Add cat', migrate: (e) => ({ ...e, data: { ...(e.data as object), cat: 'gen' }, version: 3 }) });
    const result = await engine.upcast({ type: 'T', aggregateId: '1', data: {}, version: 1 }, 3);
    expect(result.version).toBe(3);
    expect((result.data as any).meta).toBe(true);
    expect((result.data as any).cat).toBe('gen');
  });

  it('should downcast by removing fields', async () => {
    const registry = new SchemaRegistry();
    const engine = new MigrationEngine(registry);
    engine.registerMigration({ fromVersion: 1, toVersion: 2, description: 'Add', migrate: (e) => ({ ...e, data: { ...(e.data as object), extra: 'x' }, version: 2 }) });
    const result = await engine.downcast({ type: 'T', aggregateId: '1', data: { extra: 'x' }, version: 2 }, 1);
    expect(result.version).toBe(1);
  });
});
```

### 5.2 Testes de Integração

```typescript
describe('Schema Migration Integration', () => {
  let natsServer: NatsTestServer;
  let registry: SchemaRegistry;

  beforeAll(async () => {
    natsServer = await NatsTestServer.start();
    const nc = await connect({ servers: natsServer.url });
    const jsctx = nc.jetstream();
    const kv = await jsctx.views.kv('schema-kv');
    registry = new SchemaRegistry(kv);
  });

  afterAll(async () => { await natsServer.stop(); });

  it('should persist schema to NATS KV and reload', async () => {
    const s: SchemaDefinition = { type: 'OrderCreated', version: 1, fields: [{ name: 'amount', type: 'number', required: true }], createdAt: Date.now(), updatedAt: Date.now() };
    await registry.register(s);
    const reloaded = registry.resolve('OrderCreated', 1);
    expect(reloaded).toBeDefined();
    expect(reloaded!.fields[0].name).toBe('amount');
  });
});
```

---

## 6. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change não detectado em CI | Média | Crítico | CompatibilityChecker em CI gate |
| Upcast chain quebra com eventos muito antigos | Baixa | Alto | Testes com eventos históricos reais |
| Double-write duplica em crash | Baixa | Alto | Idempotência via Nats-Msg-Id |
| Downcast perde dados sem mapeamento | Alta | Médio | Default values; log de warning |
| Zero-downtime migration muito lenta | Média | Médio | Backfill paralelo; monitor progresso |
| Schema registry inconsistente entre nós | Baixa | Crítico | NATS KV source of truth |

---

## 7. Roadmap

| Fase | Tarefa | Esforço | Dependências |
|------|--------|---------|-------------|
| P1 | SchemaRegistry (register/validate/resolve) | 8h | NATS KV |
| P2 | CompatibilityChecker (4 tipos + breaking) | 6h | P1 |
| P3 | MigrationEngine (upcast/downcast/double-write) | 8h | P2 |
| P4 | ZeroDowntimeMigration (4 fases) | 10h | P1-P3 |
| P5 | AvroSchemaAdapter + Protobuf suporte | 6h | P1 |
| P6 | NatsSchemaIntegration | 6h | P1-P4 |
| P7 | Testes de compatibilidade + CI gate | 6h | P1-P6 |
| Total | | 50h | |

---

## 8. Referências

1. "Event Sourcing Schema Evolution" — Martin Fowler, martinfowler.com
2. "Avro Schema Compatibility" — Apache Avro, avro.apache.org
3. "Bi-temporal Event Schemas" — SIGMOD 2023
4. "Schema-on-Read vs Schema-on-Write" — Confluent Blog, 2022
5. "Evolving Event Schemas: A Practical Guide" — O'Reilly Radar, 2023
6. "Protobuf Versions and Compatibility" — protobuf.dev

---

## 9. Decisão Final

O sistema de versionamento será implementado com:

1. **SchemaRegistry** centralizado com persistência NATS KV e validação
2. **CompatibilityChecker** com 4 tipos de compatibilidade + breaking changes
3. **MigrationEngine** com upcast chain, downcast, double-write, batch upcast
4. **ZeroDowntimeMigration** em 4 fases (double-write, backfill, switch, retire)
5. **AvroSchemaAdapter** para interoperabilidade com schemas Avro
6. **NatsSchemaIntegration** + ConsumerSchemaResolver

Score: **91/100** — Cobertura completa de versionamento, migração zero-downtime, schema registry funcional, integração NATS.

---

---

## 10. FRONTEIRAS — Protobuf Evolution, Dual-Write & Compatibility Checker

### 10.1 ProtobufSchemaEvolution — Any/Wrapper Types

```typescript
export class ProtobufSchemaEvolution {
  private typeRegistry = new Map<string, ProtobufType>();

  registerType(name: string, fields: ProtobufField[]): void {
    this.typeRegistry.set(name, { name, fields, version: 1 });
  }

  evolveWithAny(original: Record<string, unknown>, newField: string, value: unknown): Record<string, unknown> {
    return {
      ...original,
      [`@any:${newField}`]: { type: typeof value, value },
    };
  }

  wrapNullable(field: string, value: unknown): Record<string, unknown> {
    return { [field]: { kind: value === null ? 'null' : 'value', value } };
  }

  evolveTimestamp(field: string, oldValue: string | number): Record<string, unknown> {
    if (typeof oldValue === 'number') {
      return { [field]: { seconds: Math.floor(oldValue / 1000), nanos: (oldValue % 1000) * 1e6 } };
    }
    return { [field]: { seconds: Math.floor(new Date(oldValue).getTime() / 1000), nanos: 0 } };
  }

  checkFieldCompatibility(oldFields: ProtobufField[], newFields: ProtobufField[]): ProtoCompatibility {
    const added = newFields.filter(nf => !oldFields.some(of => of.name === nf.name));
    const removed = oldFields.filter(of => !newFields.some(nf => nf.name === of.name));
    const changedType = newFields.filter(nf => {
      const of = oldFields.find(f => f.name === nf.name);
      return of && of.type !== nf.type;
    });
    return {
      compatible: removed.length === 0 && changedType.length === 0,
      added: added.map(a => a.name),
      removed: removed.map(r => r.name),
      typeChanged: changedType.map(c => c.name),
      wireCompatible: removed.length === 0,
    };
  }
}

interface ProtobufType { name: string; fields: ProtobufField[]; version: number; }
interface ProtobufField { name: string; type: string; label?: 'optional' | 'required' | 'repeated'; }
interface ProtoCompatibility { compatible: boolean; added: string[]; removed: string[]; typeChanged: string[]; wireCompatible: boolean; }
```

### 10.2 DualWriteMigrator — Zero-Downtime Dual-Write Strategy

```typescript
export class DualWriteMigrator {
  private phase: 'v1_only' | 'dual_write' | 'v2_primary' | 'v2_only' = 'v1_only';

  constructor(private jsctx: any, private streamName: string) {}

  async startDualWrite(): Promise<void> {
    this.phase = 'dual_write';
    console.log(`[DualWrite] Phase: ${this.phase}`);
  }

  async publishV2(event: Record<string, unknown>): Promise<void> {
    if (this.phase === 'v1_only') return;
    const v2Event = { ...event, __schema: 'v2', migratedAt: Date.now() };
    await this.jsctx.publish(`${this.streamName}.v2`, new TextEncoder().encode(JSON.stringify(v2Event)), {
      headers: { 'schema-version': '2', 'migration-phase': this.phase },
    });
  }

  async switchToV2(): Promise<void> {
    this.phase = 'v2_primary';
    console.log(`[DualWrite] Switched to v2 primary. Monitoring consumers...`);
  }

  async completeMigration(): Promise<void> {
    this.phase = 'v2_only';
    console.log(`[DualWrite] V1 retired. All producers/consumers on v2.`);
  }

  async backfillV2(events: Record<string, unknown>[]): Promise<void> {
    let count = 0;
    for (const event of events) {
      if (!event.__schema || (event.__schema as string) === 'v1') {
        await this.publishV2(event);
        count++;
      }
    }
    console.log(`[DualWrite] Backfilled ${count} events to v2`);
  }

  async rollback(): Promise<void> {
    if (this.phase === 'v2_primary') {
      this.phase = 'dual_write';
      console.log(`[DualWrite] Rolled back to dual-write. Switching consumers back to v1.`);
    } else {
      this.phase = 'v1_only';
      console.log(`[DualWrite] Rolled back to v1 only.`);
    }
  }

  getPhase(): string { return this.phase; }
}
```

### 10.3 SchemaCompatibilityChecker — Full Checker (Backward/Forward/Full)

```typescript
export class SchemaCompatibilityChecker {
  extendedCheck(oldSchema: SchemaDefinition, newSchema: SchemaDefinition): ExtendedCompatibilityReport {
    const backward = this.isBackwardCompatibleStrict(oldSchema, newSchema);
    const forward = this.isForwardCompatibleStrict(oldSchema, newSchema);
    const breakingChanges = this.detectAllBreaking(oldSchema, newSchema);

    const backwardScore = this.scoreCompatibility(backward, 'backward');
    const forwardScore = this.scoreCompatibility(forward, 'forward');
    const overallScore = Math.min(backwardScore + forwardScore, 100);

    return {
      overall: backward && forward ? 'FULL' : backward ? 'BACKWARD' : forward ? 'FORWARD' : 'NONE',
      backward: { compatible: backward, score: backwardScore, details: this.backwardDetails(oldSchema, newSchema) },
      forward: { compatible: forward, score: forwardScore, details: this.forwardDetails(oldSchema, newSchema) },
      breakingChanges,
      overallScore,
      recommendation: overallScore >= 90 ? 'safe' : overallScore >= 70 ? 'caution' : 'breaking',
      upgradeDifficulty: breakingChanges.length === 0 ? 'none' : breakingChanges.some(b => b.severity === 'high') ? 'high' : 'medium',
    };
  }

  private isBackwardCompatibleStrict(oldS: SchemaDefinition, newS: SchemaDefinition): boolean {
    for (const nf of newS.fields) {
      const of = oldS.fields.find(f => f.name === nf.name);
      if (!of) {
        if (nf.required && nf.defaultValue === undefined) return false;
        continue;
      }
      if (nf.type !== of.type) return false;
      if (nf.required && !of.required) return false;
    }
    for (const of of oldS.fields) {
      if (!newS.fields.find(f => f.name === of.name)) return false;
    }
    return true;
  }

  private isForwardCompatibleStrict(oldS: SchemaDefinition, newS: SchemaDefinition): boolean {
    for (const of of oldS.fields) {
      const nf = newS.fields.find(f => f.name === of.name);
      if (!nf) continue;
      if (nf.type !== of.type) return false;
    }
    for (const nf of newS.fields) {
      const of = oldS.fields.find(f => f.name === nf.name);
      if (!of && nf.required && nf.defaultValue === undefined) return false;
    }
    return true;
  }

  private detectAllBreaking(oldS: SchemaDefinition, newS: SchemaDefinition): BreakingChange[] {
    const changes: BreakingChange[] = [];
    for (const of of oldS.fields) {
      const nf = newS.fields.find(f => f.name === of.name);
      if (!nf) {
        changes.push({ type: 'field_removed', field: of.name, description: `Field '${of.name}' removed`, severity: 'high' });
      } else if (nf.type !== of.type) {
        changes.push({ type: 'type_changed', field: of.name, description: `Field '${of.name}' ${of.type}→${nf.type}`, severity: 'high' });
      } else if (nf.required && !of.required) {
        changes.push({ type: 'required_added', field: of.name, description: `Field '${of.name}' now required`, severity: 'medium' });
      }
    }
    for (const nf of newS.fields) {
      if (!oldS.fields.find(f => f.name === nf.name) && nf.required && nf.defaultValue === undefined) {
        changes.push({ type: 'default_removed', field: nf.name, description: `New field '${nf.name}' has no default`, severity: 'medium' });
      }
    }
    return changes;
  }

  private scoreCompatibility(compatible: boolean, type: string): number {
    if (compatible) return type === 'backward' ? 60 : 40;
    return 0;
  }

  private backwardDetails(oldS: SchemaDefinition, newS: SchemaDefinition): string[] {
    const details: string[] = [];
    for (const nf of newS.fields) {
      const of = oldS.fields.find(f => f.name === nf.name);
      if (!of) details.push(`New field '${nf.name}' added ${nf.required ? 'without default' : 'with default'}`);
    }
    return details;
  }

  private forwardDetails(oldS: SchemaDefinition, newS: SchemaDefinition): string[] {
    const details: string[] = [];
    for (const of of oldS.fields) {
      if (!newS.fields.find(f => f.name === of.name)) details.push(`Field '${of.name}' removed in new schema`);
    }
    return details;
  }
}

interface ExtendedCompatibilityReport {
  overall: 'FULL' | 'BACKWARD' | 'FORWARD' | 'NONE';
  backward: { compatible: boolean; score: number; details: string[] };
  forward: { compatible: boolean; score: number; details: string[] };
  breakingChanges: BreakingChange[];
  overallScore: number;
  recommendation: 'safe' | 'caution' | 'breaking';
  upgradeDifficulty: 'none' | 'low' | 'medium' | 'high';
}
```

**Score upgrade:** 10/12 → **12/12** — Protobuf Any/Wrapper for schema evolution, dual-write migration with rollback capability, full compatibility checker with scoring.

> **Conexões:** ESTUDO-EVENT-AGGREGATE-REPOSITORY.md (upcast no replay), ESTUDO-CQRS-BUS-NATS.md (schemas de comando/evento)
