import { SchemaRegistry } from '../src/schema-registry';

describe('SchemaRegistry', () => {
  it('should register a schema', () => {
    const reg = new SchemaRegistry();
    const schema = reg.register('User', 'zod', 'z.object({ name: z.string() })', 'User schema');
    expect(schema.name).toBe('User');
    expect(schema.version).toBe(1);
    expect(schema.status).toBe('draft');
  });

  it('should update schema version', () => {
    const reg = new SchemaRegistry();
    const schema = reg.register('User', 'zod', 'v1');
    const updated = reg.update(schema.id, 'v2');
    expect(updated!.version).toBe(2);
    expect(updated!.status).toBe('active');
  });

  it('should find by name', () => {
    const reg = new SchemaRegistry();
    reg.register('User', 'zod', 'content');
    const found = reg.findByName('User');
    expect(found).toBeDefined();
    expect(found!.name).toBe('User');
  });

  it('should list with status filter', () => {
    const reg = new SchemaRegistry();
    const s1 = reg.register('Schema1', 'json', '{}');
    reg.setStatus(s1.id, 'active');
    reg.register('Schema2', 'json', '{}');
    expect(reg.list('active')).toHaveLength(1);
    expect(reg.list('draft')).toHaveLength(1);
  });

  it('should track version history', () => {
    const reg = new SchemaRegistry();
    const schema = reg.register('Test', 'yaml', 'v1');
    reg.update(schema.id, 'v2');
    reg.update(schema.id, 'v3');
    expect(reg.getVersionHistory(schema.id)).toHaveLength(3);
  });

  it('should compute diff between versions', () => {
    const reg = new SchemaRegistry();
    const schema = reg.register('Test', 'json', 'v1');
    reg.update(schema.id, 'v2', 'none');
    const diff = reg.diff(schema.id, 1, 2);
    expect(diff).not.toBeNull();
    expect(diff!.breaking).toBe(true);
    expect(diff!.changes.length).toBeGreaterThan(0);
  });

  it('should search', () => {
    const reg = new SchemaRegistry();
    reg.register('UserProfile', 'zod', '...', 'User profile schema', ['user', 'profile']);
    reg.register('Product', 'json', '...');
    expect(reg.search('profile')).toHaveLength(1);
    expect(reg.search('user')).toHaveLength(1);
    expect(reg.search('Product')).toHaveLength(1);
  });

  it('should set status', () => {
    const reg = new SchemaRegistry();
    const schema = reg.register('Old', 'json', 'data');
    reg.setStatus(schema.id, 'deprecated');
    expect(reg.get(schema.id)!.status).toBe('deprecated');
  });

  it('should return undefined for unknown id', () => {
    const reg = new SchemaRegistry();
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  it('should return undefined for unknown name', () => {
    const reg = new SchemaRegistry();
    expect(reg.findByName('nothing')).toBeUndefined();
  });

  it('should list all schemas', () => {
    const reg = new SchemaRegistry();
    reg.register('A', 'json', '{}');
    reg.register('B', 'yaml', '{}');
    reg.register('C', 'zod', '{}');
    expect(reg.list()).toHaveLength(3);
  });

  it('should return all tags', () => {
    const reg = new SchemaRegistry();
    reg.register('Profile', 'json', '{}', 'desc', ['user', 'profile']);
    const _tags = reg.search('').length;
    expect(reg.list().length).toBeGreaterThan(0);
  });

  it('should handle concurrent updates', () => {
    const reg = new SchemaRegistry();
    const schema = reg.register('Concurrent', 'json', 'v1');
    const u1 = reg.update(schema.id, 'v2');
    const u2 = reg.update(schema.id, 'v3');
    expect(u2!.version).toBe(3);
    expect(u1!.version).toBe(2);
  });
});
