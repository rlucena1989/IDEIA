import { CapabilityRegistryService } from '../src/registry/registry.service';
import { Capability } from '../src/types/capability';
import { SemanticCapabilityMatcher } from '../src/matcher/semantic-matcher';
import { CapabilityDependencyResolver } from '../src/resolver/dependency-resolver';
import { CATALOG, searchCapabilities, getCapabilitiesByCategory, getCapabilityById } from '../src/catalog';

function makeCap(overrides: Partial<Capability> = {}): Capability {
  const now = new Date().toISOString();
  return {
    id: 'test.cap.1',
    name: 'Test Capability',
    description: 'A test capability for unit testing',
    category: 'tool',
    subcategory: 'testing',
    version: '1.0.0',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    dependsOn: [],
    inputs: [],
    outputs: [],
    examples: [],
    tags: ['test', 'unittest'],
    metadata: { tags: ['test'], keywords: [], links: {} },
    ...overrides,
  };
}

describe('CapabilityRegistryService', () => {
  it('registers a capability and returns a registered event', async () => {
    const reg = new CapabilityRegistryService();
    const cap = makeCap({ id: 'test.reg', name: 'Register Test' });
    const event = await reg.register(cap);
    expect(event.type).toBe('registered');
    expect(event.capability.id).toBe('test.reg');
  });

  it('updates existing capability on register duplicate', async () => {
    const reg = new CapabilityRegistryService();
    const cap = makeCap({ id: 'test.dup', name: 'Original' });
    await reg.register(cap);
    const updated = makeCap({ id: 'test.dup', name: 'Updated' });
    const event = await reg.register(updated);
    expect(event.type).toBe('updated');
  });

  it('gets a capability by id', async () => {
    const reg = new CapabilityRegistryService();
    const cap = makeCap({ id: 'test.get' });
    await reg.register(cap);
    const result = await reg.get('test.get');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('test.get');
  });

  it('returns null for non-existent capability', async () => {
    const reg = new CapabilityRegistryService();
    const result = await reg.get('nonexistent');
    expect(result).toBeNull();
  });

  it('lists all capabilities', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'test.list1' }));
    await reg.register(makeCap({ id: 'test.list2' }));
    const list = await reg.list();
    expect(list.length).toBe(2);
  });

  it('searches capabilities by text', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'test.search1', name: 'Database Connector', tags: ['db'] }));
    await reg.register(makeCap({ id: 'test.search2', name: 'API Gateway', tags: ['api'] }));
    const results = await reg.search('database');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Database Connector');
  });

  it('removes a capability', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'test.remove' }));
    await reg.remove('test.remove');
    const result = await reg.get('test.remove');
    expect(result).toBeNull();
  });

  it('filters by category when listing', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'test.cat1', category: 'tool' }));
    await reg.register(makeCap({ id: 'test.cat2', category: 'agent' }));
    const tools = await reg.list({ category: 'tool' });
    expect(tools.length).toBe(1);
    expect(tools[0].id).toBe('test.cat1');
  });

  it('fires events to registered listeners', async () => {
    const reg = new CapabilityRegistryService();
    const events: string[] = [];
    reg.onEvent((e) => events.push(e.type));
    await reg.register(makeCap({ id: 'test.event' }));
    expect(events).toContain('registered');
  });
});

describe('SemanticCapabilityMatcher', () => {
  it('matches capabilities based on text similarity', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'match.db', name: 'Database Connector', description: 'Connects to SQL and NoSQL databases', tags: ['db'] }));
    await reg.register(makeCap({ id: 'match.api', name: 'API Gateway', description: 'Manages API routing and authentication', tags: ['api'] }));
    const matcher = new SemanticCapabilityMatcher(reg);
    const results = await matcher.match({ text: 'database connection' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].capability.id).toBe('match.db');
  });

  it('returns exact match when matching by id', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'match.exact' }));
    const matcher = new SemanticCapabilityMatcher(reg);
    const result = await matcher.matchExact('match.exact');
    expect(result).not.toBeNull();
    expect(result!.score).toBe(1.0);
  });

  it('returns similar capabilities', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'sim.1', name: 'File Reader', tags: ['file'] }));
    await reg.register(makeCap({ id: 'sim.2', name: 'File Writer', tags: ['file'] }));
    const matcher = new SemanticCapabilityMatcher(reg);
    const similar = await matcher.getSimilar('sim.1');
    expect(similar.length).toBeGreaterThan(0);
  });
});

describe('CapabilityDependencyResolver', () => {
  it('resolves dependency order', async () => {
    const reg = new CapabilityRegistryService();
    const capA = makeCap({ id: 'dep.a', name: 'A', dependsOn: [] });
    const capB = makeCap({ id: 'dep.b', name: 'B', dependsOn: [{ id: 'dep.a', version: '>=1.0.0' }] });
    await reg.register(capA);
    await reg.register(capB);
    const resolver = new CapabilityDependencyResolver(reg);
    const result = await resolver.resolve(['dep.b']);
    expect(result.success).toBe(true);
    expect(result.order).toContain('dep.a');
    expect(result.order).toContain('dep.b');
    expect(result.order.indexOf('dep.a')).toBeLessThan(result.order.indexOf('dep.b'));
  });

  it('detects missing dependencies', async () => {
    const reg = new CapabilityRegistryService();
    await reg.register(makeCap({ id: 'dep.missing', dependsOn: [{ id: 'dep.notexist', version: '>=1.0.0' }] }));
    const resolver = new CapabilityDependencyResolver(reg);
    const result = await resolver.resolve(['dep.missing']);
    expect(result.success).toBe(false);
    expect(result.missing).toContain('dep.notexist');
  });

  it('detects cycles in dependency graph', async () => {
    const reg = new CapabilityRegistryService();
    const capA = makeCap({ id: 'cycle.a', name: 'A', dependsOn: [{ id: 'cycle.b', version: '>=1.0.0' }] });
    const capB = makeCap({ id: 'cycle.b', name: 'B', dependsOn: [{ id: 'cycle.a', version: '>=1.0.0' }] });
    await reg.register(capA);
    await reg.register(capB);
    const resolver = new CapabilityDependencyResolver(reg);
    const result = await resolver.resolve(['cycle.a']);
    expect(result.success).toBe(false);
    expect(result.cycles.length).toBeGreaterThan(0);
  });
});

describe('Catalog', () => {
  it('contains predefined capabilities', () => {
    expect(CATALOG.length).toBeGreaterThan(0);
  });

  it('finds capability by id', () => {
    const cap = getCapabilityById('agent.analyst');
    expect(cap).toBeDefined();
    expect(cap!.name).toBe('Analyst Agent');
  });

  it('filters capabilities by category', () => {
    const agents = getCapabilitiesByCategory('agent');
    expect(agents.length).toBe(6);
  });

  it('searches capabilities by text', () => {
    const results = searchCapabilities('security');
    const hasSecurity = results.some(c => c.tags.includes('security'));
    expect(hasSecurity).toBe(true);
  });
});
