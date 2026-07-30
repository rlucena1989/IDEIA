import { SchemaRegistry, createSchemaRegistry } from '../src/schema-registry';

describe('SchemaRegistry C16 — Enhanced', () => {
  it('should create via factory', () => {
    const reg = createSchemaRegistry();
    expect(reg).toBeDefined();
  });

  it('should register schema with metadata', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('User', 'zod', 'z.object({ name: z.string() })', 'User schema', ['user']);
    expect(s.name).toBe('User');
    expect(s.version).toBe(1);
    expect(s.format).toBe('zod');
    expect(s.description).toBe('User schema');
    expect(s.tags).toContain('user');
  });

  it('should auto-increment version on update', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('Config', 'json', '{"key": "value"}');
    expect(s.version).toBe(1);
    const u = reg.update(s.id, '{"key": "new_value"}');
    expect(u!.version).toBe(2);
  });

  it('should reject update for non-existent id', () => {
    const reg = new SchemaRegistry();
    expect(reg.update('nonexistent', 'content')).toBeNull();
  });

  it('should find by name', () => {
    const reg = new SchemaRegistry();
    reg.register('Test', 'json', '{}');
    const found = reg.findByName('Test');
    expect(found).toBeDefined();
    expect(found!.name).toBe('Test');
  });

  it('should get latest version after updates', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('Latest', 'json', 'v1');
    reg.update(s.id, 'v2');
    reg.update(s.id, 'v3');
    const latest = reg.getLatestVersion('Latest');
    expect(latest).toBeDefined();
    expect(latest!.version).toBe(3);
    expect(latest!.content).toBe('v3');
  });

  it('should detect field-level breaking changes', () => {
    const reg = new SchemaRegistry();
    const s1 = reg.register('Old', 'typescript', 'name: string\nage: number');
    reg.setStatus(s1.id, 'active');
    const s2 = reg.register('New', 'typescript', 'name: string');
    const changes = reg.detectBreakingChanges(s1, s2);
    expect(changes.some(c => c.type === 'field_removed')).toBe(true);
  });

  it('should detect type changes as breaking', () => {
    const reg = new SchemaRegistry();
    const s1 = reg.register('Item', 'typescript', 'name: string');
    const s2 = reg.register('Item', 'typescript', 'name: number');
    const changes = reg.detectBreakingChanges(s1, s2);
    expect(changes.some(c => c.type === 'type_changed')).toBe(true);
  });

  it('should check compatibility (same content, same name)', () => {
    const reg = new SchemaRegistry();
    const s1 = reg.register('Shared', 'typescript', 'name: string\nage: number');
    const s2 = reg.register('Shared', 'typescript', 'name: string\nage: number');
    const result = reg.isCompatible(s1, s2);
    expect(result.compatible).toBe(true);
  });

  it('should detect incompatibility on reverse (consumer missing field)', () => {
    const reg = new SchemaRegistry();
    const provider = reg.register('S', 'typescript', 'name: string\ntitle: string');
    const consumer = reg.register('S', 'typescript', 'name: string');
    const result = reg.isCompatible(consumer, provider);
    expect(result.compatible).toBe(false);
  });

  it('should compute diff between updated versions', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('D', 'json', 'v1');
    reg.update(s.id, 'v2', 'none');
    const diff = reg.diff(s.id, 1, 2);
    expect(diff).not.toBeNull();
    expect(diff!.changes.length).toBeGreaterThan(0);
  });

  it('should validate data against schema', () => {
    const reg = new SchemaRegistry();
    reg.register('V', 'typescript', 'name: string\nage: number');
    const result = reg.validate('V', { name: 'John', age: 30 });
    expect(result.valid).toBe(true);
  });

  it('should reject data with missing required fields', () => {
    const reg = new SchemaRegistry();
    reg.register('V', 'typescript', 'name: string');
    const result = reg.validate('V', {});
    expect(result.valid).toBe(false);
  });

  it('should reject unknown schema name', () => {
    const reg = new SchemaRegistry();
    const result = reg.validate('NonExistent', {});
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });

  it('should search schemas', () => {
    const reg = new SchemaRegistry();
    reg.register('Alpha', 'json', '{}', 'Alpha desc', ['a', 'b']);
    reg.register('Beta', 'json', '{}', 'Beta desc', ['c']);
    expect(reg.search('Alpha')).toHaveLength(1);
    expect(reg.search('desc')).toHaveLength(2);
  });

  it('should set status', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('Old', 'json', 'data');
    reg.setStatus(s.id, 'deprecated');
    expect(reg.get(s.id)!.status).toBe('deprecated');
  });

  it('should return undefined for unknown id', () => {
    const reg = new SchemaRegistry();
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  it('should persist and load', async () => {
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    const tmpFile = path.join(os.tmpdir(), `schema-registry-test-${Date.now()}.json`);
    const reg1 = new SchemaRegistry();
    reg1.register('P', 'json', '{}', 'Persist test');
    await reg1.save(tmpFile);
    const reg2 = await SchemaRegistry.load(tmpFile);
    expect(reg2.findByName('P')).toBeDefined();
    expect(reg2.findByName('P')!.description).toBe('Persist test');
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  });

  it('should handle registerFromZod', () => {
    const reg = new SchemaRegistry();
    const s = reg.registerFromZod('TestZod', 'z.object({ name: z.string() })', 'Test schema', ['test']);
    expect(s.name).toBe('TestZod');
    expect(s.format).toBe('zod');
    expect(s.tags).toContain('test');
  });

  it('should count schemas', () => {
    const reg = new SchemaRegistry();
    expect(reg.count()).toBe(0);
    reg.register('A', 'json', '{}');
    expect(reg.count()).toBe(1);
  });

  it('should track version history via updates', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('H', 'json', 'v1');
    reg.update(s.id, 'v2');
    reg.update(s.id, 'v3');
    expect(reg.getVersionHistory(s.id)).toHaveLength(3);
    expect(reg.getVersionHistoryByName('H')).toHaveLength(3);
  });

  it('should list all schemas', () => {
    const reg = new SchemaRegistry();
    reg.register('A', 'json', '{}');
    reg.register('B', 'yaml', '{}');
    reg.register('C', 'zod', '{}');
    expect(reg.list()).toHaveLength(3);
  });

  it('should list with status filter', () => {
    const reg = new SchemaRegistry();
    const s1 = reg.register('S1', 'json', '{}');
    reg.setStatus(s1.id, 'active');
    reg.register('S2', 'json', '{}');
    expect(reg.list('active')).toHaveLength(1);
    expect(reg.list('draft')).toHaveLength(1);
  });

  it('should handle compatibility modes', () => {
    const reg = new SchemaRegistry();
    const a = reg.register('A', 'typescript', 'name: string');
    const b = reg.register('B', 'typescript', 'name: string\nage: number');
    const result = reg.isCompatible(
      { ...a, compatibility: 'full' },
      { ...b, compatibility: 'full' },
    );
    expect(result.compatible).toBe(false);
  });

  it('should return metadata with listVersions after updates', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('M', 'json', 'v1');
    reg.update(s.id, 'v2');
    const meta = reg.listVersions('M');
    expect(meta).not.toBeNull();
    expect(meta!.latestVersion).toBe(2);
    expect(meta!.totalVersions).toBe(2);
  });

  it('should register same name with different versions via registerSchema', () => {
    const reg = new SchemaRegistry();
    reg.registerSchema('Multi', 1, 'v1', 'json');
    reg.registerSchema('Multi', 2, 'v2', 'json');
    const all = reg.list();
    const multiSchemas = all.filter(s => s.name === 'Multi');
    expect(multiSchemas.length).toBe(2);
  });

  it('should handle concurrent updates', () => {
    const reg = new SchemaRegistry();
    const s = reg.register('Conc', 'json', 'v1');
    const u1 = reg.update(s.id, 'v2');
    const u2 = reg.update(s.id, 'v3');
    expect(u2!.version).toBe(3);
    expect(u1!.version).toBe(2);
  });
});
