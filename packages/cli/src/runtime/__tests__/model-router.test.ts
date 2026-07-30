import {
  routeTask,
  routeBatch,
  estimateBatchCost,
  buildFallbackChain,
  ModelRouterConfig,
} from '../model-router';
import { TaskNode } from '../orchestration-types';

function makeTask(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 't1',
    name: 'Test Task',
    description: 'A test task',
    phase: 'diagnosis',
    status: 'ready',
    dependsOn: [],
    blockedBy: [],
    riskLevel: 'low',
    estimatedEffort: 'hours',
    canParallelize: true,
    isDeterministic: false,
    requiresLLM: true,
    requiredModelTier: 'lightweight',
    ...overrides,
  };
}

describe('routeTask', () => {
  it('should route deterministic tasks to deterministic target', () => {
    const task = makeTask({ isDeterministic: true, requiresLLM: false });
    const result = routeTask(task);
    expect(result.target).toBe('deterministic');
    expect(result.estimatedCostUsd).toBe(0);
    expect(result.estimatedLatencyMs).toBe(1);
    expect(result.confidence).toBe(1);
  });

  it('should route local-solvable non-LLM low-risk tasks to local', () => {
    const task = makeTask({ isDeterministic: false, requiresLLM: false, riskLevel: 'low' });
    const result = routeTask(task);
    expect(result.target).toBe('local');
    expect(result.provider).toBe('ollama');
    expect(result.estimatedCostUsd).toBe(0);
  });

  it('should route high latency tasks to local fallback', () => {
    const task = makeTask({ requiresLLM: true, requiredModelTier: 'strong' });
    const result = routeTask(task, { latencyToleranceMs: 100 });
    expect(result.target).toBe('local');
    expect(result.reason).toContain('fallback para local');
    expect(result.confidence).toBe(0.6);
  });

  it('should route high risk tasks to strong model', () => {
    const task = makeTask({ riskLevel: 'high', requiresLLM: true });
    const result = routeTask(task);
    expect(result.target).toBe('strong');
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.confidence).toBe(0.95);
  });

  it('should route strong tier tasks to strong model', () => {
    const task = makeTask({ requiredModelTier: 'strong', requiresLLM: true });
    const result = routeTask(task);
    expect(result.target).toBe('strong');
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
  });

  it('should route cost-sensitive high-cost tasks to lightweight local model', () => {
    const task = makeTask({ riskLevel: 'medium', requiresLLM: true });
    const result = routeTask(task, { costSensitivity: 0.1 });
    expect(result.target).toBe('lightweight');
    expect(result.provider).toBe('ollama');
    expect(result.model).toBe('qwen2:0.5b');
  });

  it('should route to lightweight remote when cost is acceptable and latency is fine', () => {
    const task = makeTask({ requiredModelTier: 'lightweight', requiresLLM: true, riskLevel: 'medium' });
    const result = routeTask(task);
    expect(result.target).toBe('lightweight');
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o-mini');
  });

  it('should estimate cost for LLM tasks', () => {
    const highRisk = routeTask(makeTask({ riskLevel: 'high', requiresLLM: true, requiredModelTier: 'strong' }));
    expect(highRisk.estimatedCostUsd).toBeGreaterThan(0);

    const mediumRisk = routeTask(makeTask({ riskLevel: 'medium', requiresLLM: true }));
    expect(mediumRisk.estimatedCostUsd).toBeGreaterThan(0);

    const lowRisk = routeTask(makeTask({ riskLevel: 'low', requiresLLM: true }));
    expect(lowRisk.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('should return task id in result', () => {
    const task = makeTask({ id: 'my-task-42' });
    const result = routeTask(task);
    expect(result.taskId).toBe('my-task-42');
  });

  it('should prefer local when configured', () => {
    const task = makeTask({ isDeterministic: true });
    const result = routeTask(task, { preferLocal: true });
    expect(result.target).toBe('deterministic');
  });
});

describe('routeBatch', () => {
  it('should route multiple tasks', () => {
    const tasks = [
      makeTask({ id: 't1', isDeterministic: true, requiresLLM: false }),
      makeTask({ id: 't2', riskLevel: 'high', requiresLLM: true }),
      makeTask({ id: 't3', requiresLLM: true, riskLevel: 'low' }),
    ];
    const results = routeBatch(tasks);
    expect(results).toHaveLength(3);
    expect(results[0].target).toBe('deterministic');
    expect(results[1].target).toBe('strong');
  });

  it('should pass config to all tasks', () => {
    const tasks = [
      makeTask({ id: 't1', requiresLLM: true, requiredModelTier: 'strong' }),
      makeTask({ id: 't2', requiresLLM: true, requiredModelTier: 'strong' }),
    ];
    const results = routeBatch(tasks, { latencyToleranceMs: 100 });
    results.forEach(r => expect(r.target).toBe('local'));
  });
});

describe('estimateBatchCost', () => {
  it('should sum costs and latencies', () => {
    const routes = [
      routeTask(makeTask({ id: 't1', isDeterministic: true, requiresLLM: false })),
      routeTask(makeTask({ id: 't2', riskLevel: 'high', requiresLLM: true, requiredModelTier: 'strong' })),
    ];
    const estimate = estimateBatchCost(routes);
    expect(estimate.totalUsd).toBe(routes[0].estimatedCostUsd + routes[1].estimatedCostUsd);
    expect(estimate.totalLatencyMs).toBe(routes[0].estimatedLatencyMs + routes[1].estimatedLatencyMs);
  });

  it('should count parallelizable tasks', () => {
    const routes = [
      routeTask(makeTask({ id: 't1', isDeterministic: true, requiresLLM: false })),
      routeTask(makeTask({ id: 't2', requiresLLM: false, riskLevel: 'low' })),
      routeTask(makeTask({ id: 't3', riskLevel: 'high', requiresLLM: true, requiredModelTier: 'strong' })),
    ];
    const estimate = estimateBatchCost(routes);
    expect(estimate.parallelizable).toBe(2);
  });

  it('should handle empty routes', () => {
    const estimate = estimateBatchCost([]);
    expect(estimate.totalUsd).toBe(0);
    expect(estimate.totalLatencyMs).toBe(0);
    expect(estimate.parallelizable).toBe(0);
  });
});

describe('buildFallbackChain', () => {
  it('should return 3 routes in chain', () => {
    const task = makeTask({ id: 'ft1', requiresLLM: true, riskLevel: 'high' });
    const chain = buildFallbackChain(task);
    expect(chain).toHaveLength(3);
  });

  it('should start with deterministic fallback', () => {
    const task = makeTask({ id: 'ft2', requiresLLM: true, riskLevel: 'high' });
    const chain = buildFallbackChain(task);
    expect(chain[0].target).toBe('deterministic');
  });

  it('should have same task ID for all chain entries', () => {
    const task = makeTask({ id: 'ft3', requiresLLM: true, riskLevel: 'high' });
    const chain = buildFallbackChain(task);
    chain.forEach(r => expect(r.taskId).toBe('ft3'));
  });

  it('should include original route as last step', () => {
    const task = makeTask({ id: 'ft4', requiresLLM: true, riskLevel: 'high' });
    const chain = buildFallbackChain(task);
    expect(chain[2].target).toBe('strong');
  });
});
