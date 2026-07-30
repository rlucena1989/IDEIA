import { ContextRegistry } from '../context-registry';
import type { OperationalContext } from '../context-types';

describe('ContextRegistry', () => {
  let registry: ContextRegistry;

  beforeEach(() => {
    registry = new ContextRegistry();
  });

  const makeContext = (id: string, overrides?: Partial<OperationalContext>): OperationalContext => ({
    contextId: id,
    name: `ctx-${id}`,
    type: 'product',
    status: 'active',
    priority: 5,
    source: 'test',
    tags: [],
    dependencies: [],
    summary: 'test context',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  it('starts empty', () => {
    expect(registry.count()).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it('registers and retrieves a context', () => {
    const ctx = makeContext('c1');
    registry.register(ctx);
    expect(registry.count()).toBe(1);
    expect(registry.get('c1')).toBe(ctx);
  });

  it('updates existing context on re-registration', () => {
    const ctx1 = makeContext('c1', { priority: 5 });
    const ctx2 = makeContext('c1', { priority: 10 });
    registry.register(ctx1);
    registry.register(ctx2);
    expect(registry.count()).toBe(1);
    expect(registry.get('c1')!.priority).toBe(10);
  });

  it('filters by type', () => {
    registry.register(makeContext('c1', { type: 'product' }));
    registry.register(makeContext('c2', { type: 'workspace' }));
    registry.register(makeContext('c3', { type: 'product' }));
    expect(registry.filterByType('product')).toHaveLength(2);
    expect(registry.filterByType('workspace')).toHaveLength(1);
    expect(registry.filterByType('module')).toHaveLength(0);
  });

  it('returns undefined for unknown context', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('createAndRegister builds and stores a context', () => {
    const ctx = registry.createAndRegister({
      name: 'new-context',
      type: 'module',
      source: 'test',
      summary: 'generated context',
    });
    expect(ctx.contextId).toBeDefined();
    expect(ctx.name).toBe('new-context');
    expect(ctx.type).toBe('module');
    expect(ctx.status).toBe('active');
    expect(ctx.priority).toBe(5);
    expect(ctx.tags).toEqual([]);
    expect(ctx.dependencies).toEqual([]);
    expect(registry.count()).toBe(1);
  });

  it('createAndRegister accepts optional fields', () => {
    const ctx = registry.createAndRegister({
      name: 'advanced',
      type: 'extension',
      status: 'idle',
      priority: 3,
      source: 'config',
      tags: ['beta'],
      dependencies: ['core'],
      summary: 'advanced context',
    });
    expect(ctx.status).toBe('idle');
    expect(ctx.priority).toBe(3);
    expect(ctx.tags).toEqual(['beta']);
    expect(ctx.dependencies).toEqual(['core']);
  });

  it('list returns a copy of contexts', () => {
    registry.register(makeContext('c1'));
    const list = registry.list();
    list.push(makeContext('c2'));
    expect(registry.count()).toBe(1);
  });
});
