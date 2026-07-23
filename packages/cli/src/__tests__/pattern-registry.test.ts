import { PatternRegistry, PatternDefinition, PatternCategory, DEFAULT_PATTERN_REGISTRY_CONFIG } from '../runtime/pattern-registry';

describe('PatternRegistry', () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = new PatternRegistry();
  });

  it('should have 14 built-in patterns by default', () => {
    expect(registry.count()).toBe(14);
  });

  it('should register a new pattern', () => {
    const p: PatternDefinition = { id: 'custom-test', name: 'Test Pattern', category: 'code', description: 'A custom test pattern', severity: 'info', tags: ['test'], examples: ['test()'], constraints: [], confidence: 0.5, version: '1.0.0' };
    registry.register(p);
    expect(registry.get('custom-test')).toBeDefined();
    expect(registry.count()).toBe(15);
  });

  it('should return undefined for unknown pattern', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should filter by category', () => {
    const architectural = registry.findByCategory('architectural');
    expect(architectural.length).toBeGreaterThan(0);
    expect(architectural.every(p => p.category === 'architectural')).toBe(true);
  });

  it('should filter by tag', () => {
    const authPatterns = registry.findByTag('auth');
    expect(authPatterns.length).toBeGreaterThan(0);
  });

  it('should search by name and description', () => {
    const results = registry.search('clean');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should respect maxPatterns limit', () => {
    const limited = new PatternRegistry({ maxPatterns: 15 });
    expect(limited.count()).toBe(14);
    limited.register({ id: 'extra-1', name: 'E1', category: 'code', description: '', severity: 'info', tags: [], examples: [], constraints: [], confidence: 0.5, version: '1.0.0' });
    limited.register({ id: 'extra-2', name: 'E2', category: 'code', description: '', severity: 'info', tags: [], examples: [], constraints: [], confidence: 0.5, version: '1.0.0' });
    expect(limited.count()).toBe(15);
  });

  it('should get stats grouped correctly', () => {
    const stats = registry.getStats();
    expect(stats.total).toBe(14);
    expect(Object.keys(stats.byCategory).length).toBeGreaterThan(0);
    expect(Object.keys(stats.bySeverity).length).toBeGreaterThan(0);
  });

  it('should return all patterns', () => {
    const all = registry.getAll();
    expect(all.length).toBe(14);
  });
});
