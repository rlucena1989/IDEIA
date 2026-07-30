import { SchemaRegistry } from '../schema-registry';
import { Upcaster } from '../upcaster';
import { Downcaster } from '../downcaster';
import { DoubleWriteStrategy } from '../double-write-strategy';
import { ZeroDowntimeMigrator } from '../zero-downtime-migrator';
import { ProtobufSchemaEvolution } from '../protobuf-evolution';
import { DualWriteMigrator } from '../dual-write-migrator';
import { SchemaCompatibilityChecker } from '../schema-compatibility-checker';
import { SchemaDefinition, SchemaField } from '../types';

const makeSchema = (type: string, version: number, fields: SchemaField[]): SchemaDefinition => ({
  type, version, fields, createdAt: Date.now(), updatedAt: Date.now(),
});

describe('SchemaRegistry', () => {
  it('should register and resolve schema', async () => {
    const registry = new SchemaRegistry();
    const s = makeSchema('UserCreated', 1, [{ name: 'name', type: 'string', required: true }]);
    await registry.register(s);
    expect(registry.resolve('UserCreated', 1)).toBeDefined();
    expect(registry.getLatestVersion('UserCreated')).toBe(1);
  });

  it('should reject duplicate versions', async () => {
    const registry = new SchemaRegistry();
    const s = makeSchema('T', 1, []);
    await registry.register(s);
    await expect(registry.register(s)).rejects.toThrow();
  });

  it('should resolve latest version', async () => {
    const registry = new SchemaRegistry();
    await registry.register(makeSchema('T', 1, [{ name: 'a', type: 'string', required: true }]));
    await registry.register(makeSchema('T', 2, [{ name: 'a', type: 'string', required: true }, { name: 'b', type: 'string', required: false }]));
    expect(registry.getLatestVersion('T')).toBe(2);
    expect(registry.resolve('T')?.version).toBe(2);
  });

  it('should validate required fields', async () => {
    const registry = new SchemaRegistry();
    await registry.register(makeSchema('T', 1, [{ name: 'req', type: 'string', required: true }]));
    const result = await registry.validate({ type: 'T', data: {}, version: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate missing schema as valid', async () => {
    const registry = new SchemaRegistry();
    const result = await registry.validate({ type: 'Unknown', data: {}, version: 1 });
    expect(result.valid).toBe(true);
  });

  it('should report unknown version as invalid', async () => {
    const registry = new SchemaRegistry();
    await registry.register(makeSchema('T', 1, []));
    const result = await registry.validate({ type: 'T', data: {}, version: 99 });
    expect(result.valid).toBe(false);
  });

  it('should return null for unknown type', () => {
    const registry = new SchemaRegistry();
    expect(registry.resolve('Nonexistent')).toBeNull();
  });

  it('should list all versions', async () => {
    const registry = new SchemaRegistry();
    await registry.register(makeSchema('T', 1, []));
    await registry.register(makeSchema('T', 2, []));
    expect(registry.listAllVersions('T').length).toBe(2);
  });

  it('should deprecate schema', async () => {
    const registry = new SchemaRegistry();
    await registry.register(makeSchema('T', 1, []));
    registry.deprecate('T', 1);
    const versions = registry.listAllVersions('T');
    expect(versions.find(v => v.version === 1)?.isDeprecated).toBe(true);
  });
});

describe('Upcaster', () => {
  it('should upcast through chain', async () => {
    const registry = new SchemaRegistry();
    const upcaster = new Upcaster(registry);
    upcaster.registerMigration({
      fromVersion: 1, toVersion: 2, description: 'Add meta',
      migrate: (e) => ({ ...e, data: { ...(e.data as object || {}), meta: true }, version: 2 }),
    });
    upcaster.registerMigration({
      fromVersion: 2, toVersion: 3, description: 'Add cat',
      migrate: (e) => ({ ...e, data: { ...(e.data as object), cat: 'gen' }, version: 3 }),
    });
    const result = await upcaster.upcast({ type: 'T', aggregateId: '1', data: {}, version: 1 }, 3);
    expect(result.version).toBe(3);
    expect((result.data as Record<string, unknown>).meta).toBe(true);
    expect((result.data as Record<string, unknown>).cat).toBe('gen');
  });

  it('should throw on missing path', async () => {
    const upcaster = new Upcaster(new SchemaRegistry());
    await expect(upcaster.upcast({ version: 1 }, 5)).rejects.toThrow();
  });

  it('should batch upcast', async () => {
    const registry = new SchemaRegistry();
    const upcaster = new Upcaster(registry);
    upcaster.registerMigration({
      fromVersion: 1, toVersion: 2, description: 'Add',
      migrate: (e) => ({ ...e, version: 2 }),
    });
    const results = await upcaster.batchUpcast([{ version: 1 }, { version: 1 }], 2);
    expect(results.length).toBe(2);
  });

  it('should verify chain', async () => {
    const upcaster = new Upcaster(new SchemaRegistry());
    upcaster.registerMigration({ fromVersion: 1, toVersion: 2, description: 'v1->v2', migrate: (e) => e });
    upcaster.registerMigration({ fromVersion: 2, toVersion: 3, description: 'v2->v3', migrate: (e) => e });
    const result = await upcaster.verifyChain(1, 3);
    expect(result.valid).toBe(true);
    expect(result.steps.length).toBe(2);
  });

  it('should detect broken chain', async () => {
    const upcaster = new Upcaster(new SchemaRegistry());
    const result = await upcaster.verifyChain(1, 5);
    expect(result.valid).toBe(false);
  });

  it('should return migration count', () => {
    const upcaster = new Upcaster(new SchemaRegistry());
    upcaster.registerMigration({ fromVersion: 1, toVersion: 2, description: '', migrate: (e) => e });
    expect(upcaster.getMigrationCount()).toBe(1);
  });
});

describe('Downcaster', () => {
  it('should downcast by removing fields', async () => {
    const downcaster = new Downcaster();
    downcaster.registerMigration({
      fromVersion: 1, toVersion: 2, description: 'Add',
      migrate: (e) => ({ ...e, data: { ...(e.data as object), extra: 'x' }, version: 2 }),
    });
    const result = await downcaster.downcast({ type: 'T', aggregateId: '1', data: { extra: 'x' }, version: 2 }, 1);
    expect(result.version).toBe(1);
  });

  it('should throw on missing downcast path', async () => {
    const downcaster = new Downcaster();
    await expect(downcaster.downcast({ version: 5 }, 1)).rejects.toThrow();
  });
});

describe('DoubleWriteStrategy', () => {
  it('should publish to both versions', async () => {
    const subjects: string[] = [];
    const strategy = new DoubleWriteStrategy(
      async (subject) => { subjects.push(subject); },
      'orders'
    );
    await strategy.publishBoth({ aggregateId: '123', version: 1 });
    expect(subjects.length).toBe(2);
    expect(subjects).toContain('orders.123');
    expect(subjects).toContain('orders.v2');
  });

  it('should publish v1 only', async () => {
    const subjects: string[] = [];
    const strategy = new DoubleWriteStrategy(
      async (subject) => { subjects.push(subject); },
      'orders'
    );
    await strategy.publishV1({ aggregateId: '123', version: 1 });
    expect(subjects.length).toBe(1);
    expect(subjects[0]).toBe('orders.123');
  });
});

describe('ZeroDowntimeMigrator', () => {
  it('should plan migration', async () => {
    const registry = new SchemaRegistry();
    const migrator = new ZeroDowntimeMigrator(new Upcaster(registry), registry);
    const plan = await migrator.planMigration('T', 1, 2);
    expect(plan.type).toBe('T');
    expect(plan.phases.length).toBe(4);
  });

  it('should execute full migration', async () => {
    const registry = new SchemaRegistry();
    const migrator = new ZeroDowntimeMigrator(new Upcaster(registry), registry);
    await migrator.executeFull('T', 1, 2);
    expect(migrator.getPlan()).not.toBeNull();
  });

  it('should abort migration', async () => {
    const registry = new SchemaRegistry();
    const migrator = new ZeroDowntimeMigrator(new Upcaster(registry), registry);
    migrator.abort();
    expect(migrator.isAborted()).toBe(true);
  });

  it('should throw on invalid phase', async () => {
    const registry = new SchemaRegistry();
    const migrator = new ZeroDowntimeMigrator(new Upcaster(registry), registry);
    await migrator.planMigration('T', 1, 2);
    await expect(migrator.executePhase(99)).rejects.toThrow();
  });

  it('should retire schema', async () => {
    const registry = new SchemaRegistry();
    await registry.register(makeSchema('T', 1, []));
    const migrator = new ZeroDowntimeMigrator(new Upcaster(registry), registry);
    await migrator.planMigration('T', 1, 2);
    await migrator.executePhase(3);
    expect(registry.listAllVersions('T')[0].isDeprecated).toBe(true);
  });
});

describe('ProtobufSchemaEvolution', () => {
  it('should register types', () => {
    const evo = new ProtobufSchemaEvolution();
    evo.registerType('User', [{ name: 'name', type: 'string' }]);
    expect(evo.listTypes()).toContain('User');
  });

  it('should evolve with Any', () => {
    const evo = new ProtobufSchemaEvolution();
    const result = evo.evolveWithAny({ a: 1 }, 'dynamic', { x: 1 });
    expect(result['@any:dynamic']).toBeDefined();
  });

  it('should wrap nullable', () => {
    const evo = new ProtobufSchemaEvolution();
    const nullResult = evo.wrapNullable('field', null) as Record<string, { kind: string; value: unknown }>;
    expect(nullResult.field?.kind).toBe('null');
    const valResult = evo.wrapNullable('field', 42) as Record<string, { kind: string; value: unknown }>;
    expect(valResult.field?.kind).toBe('value');
  });

  it('should evolve timestamp from number', () => {
    const evo = new ProtobufSchemaEvolution();
    const result = evo.evolveTimestamp('ts', 1000) as Record<string, { seconds: number; nanos: number }>;
    expect(result.ts?.seconds).toBe(1);
  });

  it('should evolve timestamp from string', () => {
    const evo = new ProtobufSchemaEvolution();
    const result = evo.evolveTimestamp('ts', '2024-01-01') as Record<string, { seconds: number; nanos: number }>;
    expect(result.ts?.seconds).toBeGreaterThan(0);
  });

  it('should check field compatibility', () => {
    const evo = new ProtobufSchemaEvolution();
    const result = evo.checkFieldCompatibility(
      [{ name: 'a', type: 'string' }],
      [{ name: 'a', type: 'string' }, { name: 'b', type: 'int' }]
    );
    expect(result.compatible).toBe(true);
    expect(result.added).toContain('b');
  });

  it('should detect type change', () => {
    const evo = new ProtobufSchemaEvolution();
    const result = evo.checkFieldCompatibility(
      [{ name: 'a', type: 'string' }],
      [{ name: 'a', type: 'int' }]
    );
    expect(result.compatible).toBe(false);
    expect(result.typeChanged).toContain('a');
  });

  it('should detect field removed', () => {
    const evo = new ProtobufSchemaEvolution();
    const result = evo.checkFieldCompatibility(
      [{ name: 'a', type: 'string' }, { name: 'b', type: 'int' }],
      [{ name: 'a', type: 'string' }]
    );
    expect(result.wireCompatible).toBe(false);
  });
});

describe('DualWriteMigrator', () => {
  it('should start dual write', async () => {
    const subjects: string[] = [];
    const migrator = new DualWriteMigrator(
      async (subject) => { subjects.push(subject); },
      'orders'
    );
    expect(migrator.getPhase()).toBe('v1_only');
    await migrator.startDualWrite();
    expect(migrator.getPhase()).toBe('dual_write');
  });

  it('should not publish v2 in v1_only phase', async () => {
    const subjects: string[] = [];
    const migrator = new DualWriteMigrator(
      async (subject) => { subjects.push(subject); },
      'orders'
    );
    await migrator.publishV2({ aggregateId: '1' });
    expect(subjects.length).toBe(0);
  });

  it('should publish v2 in dual_write phase', async () => {
    const subjects: string[] = [];
    const migrator = new DualWriteMigrator(
      async (subject) => { subjects.push(subject); },
      'orders'
    );
    await migrator.startDualWrite();
    await migrator.publishV2({ aggregateId: '1' });
    expect(subjects.length).toBe(1);
  });

  it('should switch to v2', async () => {
    const migrator = new DualWriteMigrator(async () => {}, 'orders');
    await migrator.switchToV2();
    expect(migrator.getPhase()).toBe('v2_primary');
  });

  it('should complete migration', async () => {
    const migrator = new DualWriteMigrator(async () => {}, 'orders');
    await migrator.completeMigration();
    expect(migrator.getPhase()).toBe('v2_only');
  });

  it('should backfill v2 events', async () => {
    const subjects: string[] = [];
    const migrator = new DualWriteMigrator(
      async (subject) => { subjects.push(subject); },
      'orders'
    );
    await migrator.startDualWrite();
    await migrator.backfillV2([
      { aggregateId: '1', __schema: 'v1' },
      { aggregateId: '2', __schema: 'v2' },
    ]);
    expect(subjects.length).toBe(1);
  });

  it('should rollback from v2_primary', async () => {
    const migrator = new DualWriteMigrator(async () => {}, 'orders');
    await migrator.switchToV2();
    await migrator.rollback();
    expect(migrator.getPhase()).toBe('dual_write');
  });

  it('should rollback from v1_only', async () => {
    const migrator = new DualWriteMigrator(async () => {}, 'orders');
    await migrator.rollback();
    expect(migrator.getPhase()).toBe('v1_only');
  });
});

describe('SchemaCompatibilityChecker', () => {
  it('should detect FULL compatibility', () => {
    const checker = new SchemaCompatibilityChecker();
    const oldS = makeSchema('T', 1, [{ name: 'a', type: 'string', required: true }]);
    const newS = makeSchema('T', 2, [
      { name: 'a', type: 'string', required: true },
      { name: 'b', type: 'string', required: false, defaultValue: '' },
    ]);
    const report = checker.extendedCheck(oldS, newS);
    expect(report.overall).toBe('FULL');
    expect(report.recommendation).toBe('safe');
  });

  it('should detect FORWARD compatibility (new schema removes field a)', () => {
    const checker = new SchemaCompatibilityChecker();
    const oldS = makeSchema('T', 1, [{ name: 'a', type: 'string', required: true }]);
    const newS = makeSchema('T', 2, [{ name: 'b', type: 'string', required: true, defaultValue: 'x' }]);
    const report = checker.extendedCheck(oldS, newS);
    expect(report.overall).toBe('FORWARD');
  });

  it('should detect FORWARD compatibility', () => {
    const checker = new SchemaCompatibilityChecker();
    const oldS = makeSchema('T', 1, [
      { name: 'a', type: 'string', required: true },
      { name: 'b', type: 'string', required: false },
    ]);
    const newS = makeSchema('T', 2, [{ name: 'a', type: 'string', required: true }]);
    const report = checker.extendedCheck(oldS, newS);
    expect(report.overall).toBe('FORWARD');
  });

  it('should detect breaking changes', () => {
    const checker = new SchemaCompatibilityChecker();
    const oldS = makeSchema('T', 1, [{ name: 'a', type: 'string', required: true }]);
    const newS = makeSchema('T', 2, [{ name: 'a', type: 'number', required: true }]);
    const report = checker.extendedCheck(oldS, newS);
    expect(report.breakingChanges.some(b => b.type === 'type_changed')).toBe(true);
    expect(report.upgradeDifficulty).toBe('high');
  });

  it('should score compatibility', () => {
    const checker = new SchemaCompatibilityChecker();
    const oldS = makeSchema('T', 1, [{ name: 'a', type: 'string', required: true }]);
    const report = checker.extendedCheck(oldS, oldS);
    expect(report.overallScore).toBe(100);
  });
});
