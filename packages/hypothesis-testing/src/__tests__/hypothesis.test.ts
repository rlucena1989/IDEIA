import { HypothesisRegistry } from '../registry';
import { HypothesisTestRunner } from '../runner';
import { HypothesisDefinition } from '../types';

function makeHyp(overrides: any = {}): HypothesisDefinition {
  return {
    id: 'H-TEST', name: 'Test Hypothesis', description: 'A test hypothesis',
    nullHypothesis: 'H0: No difference', alternative: 'H1: There is a difference',
    direction: 'greater', predictedEffectSize: 0.5, alpha: 0.05, beta: 0.20,
    metrics: ['test_metric'],
    independentVariable: { name: 'strategy', levels: ['control', 'treatment'] },
    dependentVariable: { name: 'score', unit: 'percent', aggregation: 'mean' },
    controlVariables: [{ name: 'model', value: 'test' }],
    sampleSize: 30, testType: 'independent-t' as const,
    ...overrides,
  };
}

describe('HypothesisRegistry', () => {
  let registry: HypothesisRegistry;
  beforeEach(() => { registry = new HypothesisRegistry(); });

  test('should register a hypothesis', () => {
    registry.register(makeHyp());
    expect(registry.count()).toBe(1);
  });

  test('should reject duplicate registration', () => {
    registry.register(makeHyp({ id: 'H1' }));
    expect(() => registry.register(makeHyp({ id: 'H1' }))).toThrow();
  });

  test('should get hypothesis by id', () => {
    registry.register(makeHyp({ id: 'H1', name: 'First' }));
    expect(registry.getHypothesis('H1')!.name).toBe('First');
  });

  test('should return all hypotheses', () => {
    registry.register(makeHyp({ id: 'H1' }));
    registry.register(makeHyp({ id: 'H2' }));
    expect(registry.getAllHypotheses()).toHaveLength(2);
  });

  test('should start with untested status', () => {
    registry.register(makeHyp({ id: 'H1' }));
    expect(registry.getResult('H1')!.status).toBe('untested');
  });

  test('should update result status', () => {
    registry.register(makeHyp({ id: 'H1' }));
    registry.updateResult('H1', { status: 'confirmed', pValue: 0.01, effectSize: 0.6, conclusion: 'Confirmed' });
    expect(registry.getResult('H1')!.status).toBe('confirmed');
  });

  test('should track experiment history', () => {
    registry.register(makeHyp({ id: 'H1' }));
    registry.updateResult('H1', { status: 'confirmed', pValue: 0.01, effectSize: 0.6, conclusion: 'Test 1' });
    registry.updateResult('H1', { status: 'rejected', pValue: 0.2, effectSize: 0.1, conclusion: 'Test 2' });
    expect(registry.getHistory('H1')).toHaveLength(2);
  });

  test('should generate summary', () => {
    registry.register(makeHyp({ id: 'H1' }));
    registry.register(makeHyp({ id: 'H2' }));
    registry.updateResult('H1', { status: 'confirmed' });
    expect(registry.getSummary()).toContain('Confirmed: 1');
  });

  test('should get summary object', () => {
    registry.register(makeHyp({ id: 'H1' }));
    registry.updateResult('H1', { status: 'confirmed' });
    expect(registry.getSummaryObject().score).toBe(100);
  });

  test('should register multiple at once', () => {
    registry.registerAll([makeHyp({ id: 'H1' }), makeHyp({ id: 'H2' }), makeHyp({ id: 'H3' })]);
    expect(registry.count()).toBe(3);
  });

  test('should remove a hypothesis', () => {
    registry.register(makeHyp({ id: 'H1' }));
    expect(registry.remove('H1')).toBe(true);
    expect(registry.count()).toBe(0);
  });

  test('should search hypotheses', () => {
    registry.register(makeHyp({ id: 'H-CACHE', name: 'Context Caching', description: 'Cache performance' }));
    registry.register(makeHyp({ id: 'H-ROUTE', name: 'Routing', description: 'Route optimization' }));
    expect(registry.search('cache')).toHaveLength(1);
  });

  test('should filter by tag', () => {
    registry.register(makeHyp({ id: 'H1', tags: ['performance'] }));
    registry.register(makeHyp({ id: 'H2', tags: ['safety'] }));
    expect(registry.getHypothesesByTag('performance')).toHaveLength(1);
  });

  test('should reset a result', () => {
    registry.register(makeHyp({ id: 'H1' }));
    registry.updateResult('H1', { status: 'confirmed' });
    registry.resetResult('H1');
    expect(registry.getResult('H1')!.status).toBe('untested');
  });
});

describe('HypothesisTestRunner', () => {
  let registry: HypothesisRegistry;
  let runner: HypothesisTestRunner;
  beforeEach(() => {
    registry = new HypothesisRegistry();
    runner = new HypothesisTestRunner(registry);
  });

  test('should run a single experiment', async () => {
    registry.register(makeHyp({ id: 'H1' }));
    const result = await runner.runExperiment({
      id: 'exp-1', hypothesisId: 'H1',
      controlConfig: { strategy: 'control' },
      treatmentConfig: { strategy: 'treatment' },
      sampleSize: 30, repetitions: 2, tasks: ['task-a', 'task-b'],
    });
    expect(result.experimentId).toBe('exp-1');
    expect(result.controlData.length).toBeGreaterThan(0);
  });

  test('should run all hypotheses', async () => {
    registry.register(makeHyp({ id: 'H1' }));
    registry.register(makeHyp({ id: 'H2' }));
    const results = await runner.runAllHypotheses({ tasks: ['task-1'], repetitions: 2 });
    expect(results).toHaveLength(2);
  });

  test('should get runner stats', async () => {
    registry.register(makeHyp({ id: 'H1' }));
    await runner.runExperiment({
      id: 'exp-1', hypothesisId: 'H1',
      controlConfig: {}, treatmentConfig: {},
      sampleSize: 30, repetitions: 1, tasks: ['task-1'],
    });
    expect(runner.getStats().totalExperiments).toBe(1);
  });

  test('should throw for unknown hypothesis', async () => {
    await expect(runner.runExperiment({
      id: 'exp-x', hypothesisId: 'H-UNKNOWN',
      controlConfig: {}, treatmentConfig: {},
      sampleSize: 10, repetitions: 1, tasks: [],
    })).rejects.toThrow('Hypothesis H-UNKNOWN not found');
  });

  test('should track progress via callback', async () => {
    registry.register(makeHyp({ id: 'H1' }));
    const progressUpdates: number[] = [];
    const progressRunner = new HypothesisTestRunner(registry, (id, status, progress) => {
      if (status === 'running') progressUpdates.push(progress);
    });
    await progressRunner.runExperiment({
      id: 'exp-1', hypothesisId: 'H1',
      controlConfig: {}, treatmentConfig: {},
      sampleSize: 30, repetitions: 2, tasks: ['task-a'],
    });
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});