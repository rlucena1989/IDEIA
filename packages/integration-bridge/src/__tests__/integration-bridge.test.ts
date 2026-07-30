import { FeatureRegistry } from '../feature-registry';
import { IntegrationOrchestrator } from '../integration-orchestrator';
import type { FeatureEntry, FeatureDependency } from '../feature-registry';

describe('FeatureRegistry', () => {
  let registry: FeatureRegistry;

  beforeEach(() => {
    registry = new FeatureRegistry();
  });

  test('register and get', () => {
    const feature: FeatureEntry = { id: 'test', name: 'Test', description: 'Test feature', status: 'planned', version: '0.1.0', dependencies: [], capabilities: ['test-cap'], packagePath: null };
    registry.register(feature);
    const result = registry.get('test');
    expect(result).toBeDefined();
    expect(result!.id).toBe('test');
    expect(result!.name).toBe('Test');
  });

  test('getAll returns all registered', () => {
    const f1: FeatureEntry = { id: 'a', name: 'A', description: '', status: 'planned', version: '0.1.0', dependencies: [], capabilities: [], packagePath: null };
    const f2: FeatureEntry = { id: 'b', name: 'B', description: '', status: 'completed', version: '1.0.0', dependencies: [], capabilities: [], packagePath: null };
    registry.register(f1);
    registry.register(f2);
    expect(registry.getAll()).toHaveLength(2);
  });

  test('getByStatus filters correctly', () => {
    const f1: FeatureEntry = { id: 'a', name: 'A', description: '', status: 'planned', version: '0.1.0', dependencies: [], capabilities: [], packagePath: null };
    const f2: FeatureEntry = { id: 'b', name: 'B', description: '', status: 'completed', version: '1.0.0', dependencies: [], capabilities: [], packagePath: null };
    registry.register(f1);
    registry.register(f2);
    const planned = registry.getByStatus('planned');
    expect(planned).toHaveLength(1);
    expect(planned[0]!.id).toBe('a');
  });

  test('getDependencies', () => {
    const dep: FeatureDependency = { featureId: 'other', type: 'required' };
    const feature: FeatureEntry = { id: 'test', name: 'Test', description: '', status: 'planned', version: '0.1.0', dependencies: [dep], capabilities: [], packagePath: null };
    registry.register(feature);
    const deps = registry.getDependencies('test');
    expect(deps).toHaveLength(1);
    expect(deps[0]!.featureId).toBe('other');
    expect(registry.getDependencies('nonexistent')).toEqual([]);
  });

  test('hasFeature', () => {
    const feature: FeatureEntry = { id: 'test', name: 'Test', description: '', status: 'planned', version: '0.1.0', dependencies: [], capabilities: [], packagePath: null };
    registry.register(feature);
    expect(registry.hasFeature('test')).toBe(true);
    expect(registry.hasFeature('nonexistent')).toBe(false);
  });

  test('getFeatureGraph returns adjacency list', () => {
    const dep: FeatureDependency = { featureId: 'b', type: 'required' };
    const a: FeatureEntry = { id: 'a', name: 'A', description: '', status: 'planned', version: '0.1.0', dependencies: [dep], capabilities: [], packagePath: null };
    const b: FeatureEntry = { id: 'b', name: 'B', description: '', status: 'planned', version: '0.1.0', dependencies: [], capabilities: [], packagePath: null };
    registry.register(a);
    registry.register(b);
    const graph = registry.getFeatureGraph();
    expect(graph.get('a')).toEqual(['b']);
    expect(graph.get('b')).toEqual([]);
  });

  test('loadDefaults registers 5 features', () => {
    registry.loadDefaults();
    expect(registry.getAll()).toHaveLength(5);
    expect(registry.hasFeature('computer-use')).toBe(true);
    expect(registry.hasFeature('sso')).toBe(true);
    expect(registry.hasFeature('compliance')).toBe(true);
    expect(registry.hasFeature('reasoning')).toBe(true);
    expect(registry.hasFeature('gemini')).toBe(true);
  });
});

describe('IntegrationOrchestrator', () => {
  let registry: FeatureRegistry;

  beforeEach(() => {
    registry = new FeatureRegistry();
    registry.loadDefaults();
  });

  test('orchestrate with no features returns empty', async () => {
    const orchestrator = new IntegrationOrchestrator(registry);
    const results = await orchestrator.orchestrate();
    expect(results).toEqual([]);
  });

  test('orchestrate with computer-use feature', async () => {
    const orchestrator = new IntegrationOrchestrator(registry, { features: ['computer-use'] });
    const results = await orchestrator.orchestrate();
    expect(results).toHaveLength(1);
    expect(results[0]!.featureId).toBe('computer-use');
    expect(results[0]!.success).toBe(true);
    expect(results[0]!.error).toBeNull();
    expect(results[0]!.checks.length).toBeGreaterThan(0);
  });

  test('validateFeatureGraph no cycles', () => {
    const orchestrator = new IntegrationOrchestrator(registry);
    const cycles = orchestrator.validateFeatureGraph();
    expect(cycles).toEqual([]);
  });

  test('getProgressPercentage', () => {
    const orchestrator = new IntegrationOrchestrator(registry);
    expect(orchestrator.getProgressPercentage()).toBe(40);
  });

  test('getEnabledCount', () => {
    const orchestrator = new IntegrationOrchestrator(registry);
    expect(orchestrator.getEnabledCount()).toBe(2);
  });

  test('getPlannedCount', () => {
    const orchestrator = new IntegrationOrchestrator(registry);
    expect(orchestrator.getPlannedCount()).toBe(2);
  });
});
