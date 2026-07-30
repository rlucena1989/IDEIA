import { DefaultSelfHealingEngine, DefaultErrorBudgetCalculator, DefaultGracefulShutdown } from './self-healing';
import { SelfHealingPolicy, EscalationPolicy } from './types';

describe('DefaultSelfHealingEngine', () => {
  const testPolicy = (overrides: Partial<SelfHealingPolicy> = {}): SelfHealingPolicy => ({
    id: 'test-policy',
    name: 'Test Restart Policy',
    condition: 'restart-on-fail',
    actions: [{ type: 'restart', params: { target: 'engine' } }],
    cooldown: 1000,
    maxAttempts: 3,
    ...overrides,
  });

  it('should register and execute healing policies', async () => {
    const engine = new DefaultSelfHealingEngine();
    engine.registerPolicy(testPolicy());
    const results = await engine.triggerCheck();
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('completed');
  });

  it('should track action history', async () => {
    const engine = new DefaultSelfHealingEngine();
    engine.registerPolicy(testPolicy());
    await engine.triggerCheck();
    const history = engine.getActions();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].policyId).toBe('test-policy');
  });

  it('should track recovery attempts', async () => {
    const engine = new DefaultSelfHealingEngine();
    engine.registerPolicy(testPolicy({ id: 'attempt-track' }));
    expect(engine.getAttempts('attempt-track')).toBe(0);
    await engine.triggerCheck();
    expect(engine.getAttempts('attempt-track')).toBe(0);
  });

  it('should escalate when max attempts reached', async () => {
    const engine = new DefaultSelfHealingEngine();
    engine.registerStrategy('restart', async () => { throw new Error('Simulated failure'); });
    engine.registerPolicy(testPolicy({
      id: 'escalate-policy',
      actions: [{ type: 'restart', params: {} }],
      maxAttempts: 2,
    }));

    const escalations: string[] = [];
    engine.onEscalation((e: EscalationPolicy) => escalations.push(e.id));

    await engine.triggerCheck();
    await engine.triggerCheck();

    expect(escalations.length).toBe(1);
    expect(escalations[0]).toBe('escalate-policy');
  });

  it('should not execute actions when max attempts already exceeded', async () => {
    const engine = new DefaultSelfHealingEngine();
    let executionCount = 0;
    engine.registerStrategy('restart', async () => { executionCount++; throw new Error('fail'); });
    engine.registerPolicy(testPolicy({
      id: 'exceeded-policy',
      actions: [{ type: 'restart', params: {} }],
      maxAttempts: 2,
    }));

    await engine.triggerCheck();
    await engine.triggerCheck();
    await engine.triggerCheck();

    expect(executionCount).toBe(2);
  });

  it('should support custom remediation strategies', async () => {
    const engine = new DefaultSelfHealingEngine();
    const customAction = jest.fn().mockResolvedValue(undefined);
    engine.registerStrategy('restart', customAction);
    engine.registerPolicy(testPolicy());
    await engine.triggerCheck();
    expect(customAction).toHaveBeenCalledWith({ target: 'engine' });
  });

  it('should skip healing when health check reports all healthy', async () => {
    const mockHealthRegistry = {
      runAll: jest.fn().mockResolvedValue([
        { healthy: true, name: 'nats', latencyMs: 5 },
        { healthy: true, name: 'llm', latencyMs: 10 },
      ]),
      getStatus: jest.fn(),
      register: jest.fn(),
      onStatusChanged: {} as unknown,
    };
    const engine = new DefaultSelfHealingEngine();
    engine.registerPolicy(testPolicy());
    const results = await engine.triggerCheck();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('completed');
  });
});

describe('DefaultErrorBudgetCalculator', () => {
  it('should track budget consumption', () => {
    const budget = new DefaultErrorBudgetCalculator();
    const initial = budget.getBudget('test-svc');
    expect(initial.consumed).toBe(0);
    budget.consume('test-svc', 100);
    const after = budget.getBudget('test-svc');
    expect(after.consumed).toBe(100);
    expect(after.remaining).toBe(after.totalBudget - 100);
  });

  it('should detect exhausted budget', () => {
    const budget = new DefaultErrorBudgetCalculator();
    expect(budget.isExhausted('test-svc')).toBe(false);
    budget.consume('test-svc', 1000);
    expect(budget.isExhausted('test-svc')).toBe(true);
  });

  it('should reset all budgets', () => {
    const budget = new DefaultErrorBudgetCalculator();
    budget.consume('svc-a', 500);
    budget.consume('svc-b', 300);
    budget.resetAll();
    expect(budget.getBudget('svc-a').consumed).toBe(0);
    expect(budget.getBudget('svc-b').consumed).toBe(0);
  });
});

describe('DefaultGracefulShutdown', () => {
  it('should shutdown all registered handlers', async () => {
    const shutdown = new DefaultGracefulShutdown();
    const handler = jest.fn().mockResolvedValue(undefined);
    shutdown.register('test', handler);
    await shutdown.shutdownAll();
    expect(handler).toHaveBeenCalled();
  });

  it('should track shutdown status', async () => {
    const shutdown = new DefaultGracefulShutdown();
    shutdown.register('svc-a', jest.fn().mockResolvedValue(undefined));
    shutdown.register('svc-b', jest.fn().mockResolvedValue(undefined));
    await shutdown.shutdownAll();
    const status = shutdown.getStatus();
    expect(status.completedServices).toContain('svc-a');
    expect(status.completedServices).toContain('svc-b');
    expect(status.pendingServices).toHaveLength(0);
  });
});
