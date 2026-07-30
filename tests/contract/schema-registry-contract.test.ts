import { SchemaRegistry, createSchemaRegistry } from '../../packages/schema-registry/src/schema-registry';
import { ContractCDC, createContractCDC } from '../../packages/contract-cdc/src/contract-cdc';
import type { PactContract } from '../../packages/contract-cdc/src/types';

function pactInteraction(desc: string, method: string, path: string, status = 200, body?: unknown) {
  return {
    description: desc,
    type: 'request-response' as const,
    request: { method, path },
    response: { status, body },
  };
}

describe('Schema Registry Contract', () => {
  let registry: SchemaRegistry;
  let cdc: ContractCDC;

  beforeEach(() => {
    registry = createSchemaRegistry();
    cdc = createContractCDC();
  });

  it('should register a schema and retrieve it by name', () => {
    const entry = registry.registerSchema('User', 1, '{ name: string; age: number }', 'typescript', 'User schema');
    expect(entry).toBeDefined();
    expect(entry.name).toBe('User');
    expect(entry.version).toBe(1);

    const found = registry.getSchema('User');
    expect(found).toBeDefined();
    expect(found!.id).toBe(entry.id);
  });

  it('should register and validate versioning contract', () => {
    const v1 = registry.registerSchema('Product', 1, '{ id: string; name: string }', 'typescript', 'Product v1');
    const _v2 = registry.update(v1.id, '{ id: string; name: string; price: number }', 'backward');
    expect(_v2).toBeDefined();
    expect(_v2!.version).toBe(2);

    const diff = registry.diff(v1.id, 1, 2);
    expect(diff).not.toBeNull();
    expect(diff!.breaking).toBe(false);
    expect(diff!.changes.length).toBeGreaterThan(0);
  });

  it('should detect breaking changes', () => {
    const v1 = registry.registerSchema('API', 1, '{ id: string }', 'json', 'API v1');
    const v2 = registry.registerSchema('API', 2, '{ name: string }', 'json', 'API v2');

    const breaking = registry.detectBreakingChanges(v1, v2);
    expect(breaking.some(b => b.type === 'field_removed')).toBe(true);
    expect(breaking.some(b => b.type === 'field_added' || b.severity === 'breaking')).toBe(true);
  });

  it('should check compatibility between versions', () => {
    const v1 = registry.registerSchema('CompatTest', 1, '{ id: string; name: string }', 'json', 'v1');
    const _v2a = registry.update(v1.id, '{ id: string; name: string; age: number }', 'backward');

    const compat = registry.checkCompatibility('CompatTest', 1, 2);
    expect(compat.compatible).toBe(true);
    expect(compat.mode).toBe('backward');
  });

  it('should detect backward incompatibility', () => {
    const v1 = registry.registerSchema('Incompat', 1, '{ id: string; name: string }', 'json', 'v1');
    const _v2 = registry.update(v1.id, '{ name: string }', 'backward');

    const compat = registry.checkCompatibility('Incompat', 1, 2);
    expect(compat.compatible).toBe(false);
  });

  it('should support Pact contract verification for schema operations', () => {
    const contract: PactContract = {
      consumer: 'cli',
      provider: 'schema-registry',
      version: '1.0.0',
      interactions: [
        pactInteraction('register schema', 'POST', '/schemas', 201, { id: 'uuid', name: 'Test', version: 1 }),
        pactInteraction('get schema', 'GET', '/schemas/Test', 200, { name: 'Test', version: 1 }),
      ],
    };
    cdc.registerPact(contract);

    const validation = cdc.verifyProvider('schema-registry', [contract]);
    expect(validation.passed).toBe(true);
    expect(validation.summary.passed).toBe(2);
  });

  it('should register schema via register() and maintain contract invariant', () => {
    const entry = registry.register('MySchema', 'json', '{ field: string }', 'A test schema', ['test']);
    expect(entry.name).toBe('MySchema');
    expect(entry.format).toBe('json');
    expect(entry.version).toBe(1);
    expect(entry.tags).toContain('test');

    const retrieved = registry.get(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.content).toBe('{ field: string }');
  });

  it('should produce detailed diff with markdown output', () => {
    const v1 = registry.registerSchema('MarkdownTest', 1, '{ a: string; b: number }', 'json', 'v1');
    const _v2 = registry.update(v1.id, '{ a: string; b: number; c: boolean }', 'backward');

    const md = registry.diffToMarkdown('MarkdownTest', 1, 2);
    expect(md).toContain('Schema:');
    expect(md).toContain('MarkdownTest');
    expect(md.length).toBeGreaterThan(10);
  });

  it('should list schemas with status filter', () => {
    registry.registerSchema('ActiveOne', 1, '{ x: string }', 'json', 'active');
    const entry = registry.registerSchema('DraftOne', 1, '{ y: string }', 'json', 'draft');
    registry.setStatus(entry.id, 'draft');

    const actives = registry.list('active');
    expect(actives.length).toBeGreaterThanOrEqual(1);
    const drafts = registry.list('draft');
    expect(drafts.length).toBeGreaterThanOrEqual(1);
  });

  it('should search schemas by name or description', () => {
    registry.registerSchema('SearchTarget', 1, '{ q: string }', 'json', 'Searchable schema', ['findable']);
    const results = registry.search('SearchTarget');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const tagResults = registry.search('findable');
    expect(tagResults.length).toBeGreaterThanOrEqual(1);
  });
});
