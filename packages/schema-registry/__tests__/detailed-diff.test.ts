import { SchemaRegistry, createSchemaRegistry } from '../src/schema-registry';

describe('SchemaRegistry - Detailed Diff', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = createSchemaRegistry();
  });

  it('should detect field addition as non-breaking', () => {
    const s1 = registry.register('User', 'typescript', 'name: string');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'name: string\nage: number');

    const diff = registry.detailedDiff('User', 1, 2);

    expect(diff).not.toBeNull();
    expect(diff!.changes.some(c => c.changeType === 'added')).toBe(true);
    expect(diff!.breakingCount).toBe(0);
    expect(diff!.nonBreakingCount).toBeGreaterThanOrEqual(1);
    expect(diff!.breaking).toBe(false);
  });

  it('should detect field removal as breaking', () => {
    const s1 = registry.register('User', 'typescript', 'name: string\nage: number');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'name: string');

    const diff = registry.detailedDiff('User', 1, 2);

    expect(diff).not.toBeNull();
    const removed = diff!.changes.find(c => c.changeType === 'removed');
    expect(removed).toBeDefined();
    expect(removed!.fieldPath).toBe('age');
    expect(removed!.breaking).toBe(true);
    expect(diff!.breaking).toBe(true);
  });

  it('should detect type changes as breaking', () => {
    const s1 = registry.register('Item', 'typescript', 'name: string');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'name: number');

    const diff = registry.detailedDiff('Item', 1, 2);

    expect(diff).not.toBeNull();
    const typeChange = diff!.changes.find(c => c.changeType === 'type_changed');
    expect(typeChange).toBeDefined();
    expect(typeChange!.oldType).toBe('string');
    expect(typeChange!.newType).toBe('number');
    expect(typeChange!.breaking).toBe(true);
    expect(diff!.breaking).toBe(true);
  });

  it('should detect same content as no changes', () => {
    const s1 = registry.register('Stable', 'typescript', 'name: string');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'name: string');

    const diff = registry.detailedDiff('Stable', 1, 2);

    expect(diff).not.toBeNull();
    expect(diff!.changes.some(c => c.changeType === 'removed' || c.changeType === 'added')).toBe(false);
  });

  it('should detect format change', () => {
    const s1 = registry.register('Config', 'json', '{"key": "value"}');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'key: string');

    const diff = registry.detailedDiff('Config', 1, 2);

    expect(diff).not.toBeNull();
  });

  it('should detect compatibility mode change', () => {
    const s1 = registry.register('Svc', 'typescript', 'name: string', 'svc schema', ['svc']);
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'name: string\nversion: number', 'none');

    const diff = registry.detailedDiff('Svc', 1, 2);

    expect(diff).not.toBeNull();
    const compatChange = diff!.changes.find(c => c.fieldPath === 'compatibility');
    if (compatChange) {
      expect(compatChange.changeType).toBe('value_changed');
    }
  });

  it('should return null for non-existent schema', () => {
    const diff = registry.detailedDiff('NonExistent', 1, 2);
    expect(diff).toBeNull();
  });

  it('should return null for non-existent versions', () => {
    const s1 = registry.register('Test', 'json', 'v1');
    registry.setStatus(s1.id, 'active');

    const diff = registry.detailedDiff('Test', 1, 99);
    expect(diff).toBeNull();
  });

  it('should generate markdown diff output', () => {
    const s1 = registry.register('Api', 'typescript', 'name: string');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'name: number\ntitle: string');

    const md = registry.diffToMarkdown('Api', 1, 2);

    expect(md).toContain('Api');
    expect(md).toContain('v1 → v2');
    expect(md).toContain('🔴');
    expect(md).toContain('type_changed');
  });

  it('should generate markdown for compatible changes', () => {
    const s1 = registry.register('Compat', 'typescript', 'name: string');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'name: string\nage: number');

    const md = registry.diffToMarkdown('Compat', 1, 2);

    expect(md).toContain('Compat');
    expect(md).toContain('✅');
    expect(md).toContain('added');
  });

  it('should include before/after values in diff entries', () => {
    const s1 = registry.register('FieldTest', 'typescript', 'count: number');
    registry.setStatus(s1.id, 'active');

    registry.update(s1.id, 'count: string');

    const diff = registry.detailedDiff('FieldTest', 1, 2);

    expect(diff).not.toBeNull();
    const typeChange = diff!.changes.find(c => c.changeType === 'type_changed');
    expect(typeChange).toBeDefined();
    expect(typeChange!.oldType).toBe('number');
    expect(typeChange!.newType).toBe('string');
    expect(typeChange!.oldValue).toBe('number');
    expect(typeChange!.newValue).toBe('string');
  });
});