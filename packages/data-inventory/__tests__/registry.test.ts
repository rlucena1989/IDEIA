import { DataInventoryRegistry } from '../src/registry';

describe('DataInventoryRegistry', () => {
  let registry: DataInventoryRegistry;

  const validAsset = () => ({
    name: 'User Database',
    type: 'personal' as const,
    location: '/data/users',
    retentionDays: 90,
    owner: 'privacy-team',
    description: 'User data storage',
    tags: ['pii', 'users'],
  });

  beforeEach(() => {
    registry = new DataInventoryRegistry();
  });

  test('register creates a data asset with generated UUID', () => {
    const asset = registry.register(validAsset());
    expect(asset.id).toBeDefined();
    expect(asset.name).toBe('User Database');
    expect(asset.type).toBe('personal');
    expect(asset.createdAt).toBeDefined();
    expect(asset.updatedAt).toBeDefined();
  });

  test('register throws for missing required fields', () => {
    expect(() => registry.register({} as any)).toThrow();
  });

  test('register throws for invalid type', () => {
    expect(() => registry.register({
      ...validAsset(),
      type: 'invalid_type' as any,
    })).toThrow();
  });

  test('find returns registered asset by ID', () => {
    const created = registry.register(validAsset());
    const found = registry.find(created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('User Database');
  });

  test('find returns undefined for unknown ID', () => {
    expect(registry.find('nonexistent')).toBeUndefined();
  });

  test('unregister removes asset', () => {
    const created = registry.register(validAsset());
    const removed = registry.unregister(created.id);
    expect(removed).toBe(true);
    expect(registry.find(created.id)).toBeUndefined();
  });

  test('unregister returns false for unknown ID', () => {
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  test('search finds assets by name', () => {
    registry.register(validAsset());
    registry.register({ ...validAsset(), name: 'Analytics Pipeline', location: '/analytics', type: 'confidential', description: 'Analytics data' });
    const results = registry.search('Analytics');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Analytics Pipeline');
  });

  test('search finds assets by location', () => {
    registry.register({ ...validAsset(), name: 'A', location: '/s3/bucket-one', description: 'd1' });
    registry.register({ ...validAsset(), name: 'B', location: '/s3/bucket-two', description: 'd2' });
    const results = registry.search('bucket-one');
    expect(results).toHaveLength(1);
  });

  test('search finds assets by owner', () => {
    registry.register({ ...validAsset(), name: 'A', location: '/a', owner: 'team-alpha', description: 'd1' });
    const results = registry.search('alpha');
    expect(results).toHaveLength(1);
  });

  test('search finds assets by tags', () => {
    registry.register({ ...validAsset(), tags: ['critical'], location: '/x' });
    const results = registry.search('critical');
    expect(results).toHaveLength(1);
  });

  test('list returns all assets', () => {
    registry.register(validAsset());
    registry.register({ ...validAsset(), name: 'B', type: 'confidential', description: 'd2' });
    expect(registry.list()).toHaveLength(2);
  });

  test('getReport returns report with stats', () => {
    registry.register(validAsset());
    registry.register({ ...validAsset(), name: 'B', type: 'sensitive', description: 'd2' });
    const report = registry.getReport();
    expect(report.totalAssets).toBe(2);
    expect(report.byType.personal).toBe(1);
    expect(report.byType.sensitive).toBe(1);
  });

  test('getStats returns byType map', () => {
    registry.register(validAsset());
    const stats = registry.getStats();
    expect(stats.total).toBe(1);
    expect(stats.byType.personal).toBe(1);
  });

  test('getReport counts unclassified assets', () => {
    registry.register({ ...validAsset(), tags: [], description: 'd1' });
    const report = registry.getReport();
    expect(report.unclassified).toBe(1);
  });

  test('register rejects negative retentionDays', () => {
    expect(() => registry.register({ ...validAsset(), retentionDays: -1 })).toThrow();
  });
});
