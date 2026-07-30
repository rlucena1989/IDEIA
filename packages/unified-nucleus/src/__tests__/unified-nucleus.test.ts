import { NucleusOrchestrator, type NucleusComponent } from '../nucleus-orchestrator';
import { IntentRouter, type Intent, type IntentType } from '../intent-router';
import { ExecutionPipeline, type PipelineStep } from '../execution-pipeline';

describe('NucleusOrchestrator', () => {
  let orchestrator: NucleusOrchestrator;

  beforeEach(() => {
    orchestrator = new NucleusOrchestrator({ enableCircuitBreaker: true });
  });

  it('should register a component', () => {
    const mockAgent = { execute: async (_t: string, _c: Record<string, unknown>) => 'result' };
    orchestrator.registerComponent('agent', mockAgent);
    const status = orchestrator.getStatus();
    expect(status.components.length).toBeGreaterThanOrEqual(1);
    expect(status.components.find(c => c.component === 'agent')).toBeDefined();
  });

  it('should return healthy status initially', () => {
    const status = orchestrator.getStatus();
    expect(status.healthy).toBe(true);
    expect(status.tasksProcessed).toBe(0);
    expect(status.errorRate).toBe(0);
  });

  it('should return component health on healthCheck', () => {
    orchestrator.registerComponent('memory', {});
    const health = orchestrator.healthCheck();
    expect(health.length).toBeGreaterThanOrEqual(1);
    expect(health[0]).toHaveProperty('component');
    expect(health[0]).toHaveProperty('status');
    expect(health[0]).toHaveProperty('lastCheck');
  });

  it('should open circuit breaker after failures', async () => {
    const mockAgent = { execute: async (_t: string, _c: Record<string, unknown>) => { throw new Error('fail'); } };
    orchestrator.registerComponent('agent', mockAgent);

    for (let i = 0; i < 6; i++) {
      try { await orchestrator.execute('task', {}); } catch { continue; }
    }

    const status = orchestrator.getStatus();
    const agentHealth = status.components.find(c => c.component === 'agent');
    expect(agentHealth).toBeDefined();
    expect(agentHealth!.status).toBe('down');
  });

  it('should execute task with registered agent component', async () => {
    const mockAgent = { execute: async (t: string, _c: Record<string, unknown>) => `done: ${t}` };
    orchestrator.registerComponent('agent', mockAgent);
    const result = await orchestrator.execute('test-task', {});
    expect(result).toBe('done: test-task');
  });

  it('should reset circuit breakers and state', () => {
    const mockAgent = { execute: async (_t: string, _c: Record<string, unknown>) => { throw new Error('fail'); } };
    orchestrator.registerComponent('agent', mockAgent);
    orchestrator.reset();
    const status = orchestrator.getStatus();
    expect(status.tasksProcessed).toBe(0);
    expect(status.errorRate).toBe(0);
    expect(status.healthy).toBe(true);
  });

  it('should reject execute when no agent is registered', async () => {
    await expect(orchestrator.execute('task', {})).rejects.toThrow('No agent component registered');
  });
});

describe('IntentRouter', () => {
  const router = new IntentRouter();

  function makeStatus(componentStatus: 'healthy' | 'degraded' | 'down' = 'healthy') {
    return {
      healthy: componentStatus === 'healthy',
      components: [
        { component: 'knowledge' as NucleusComponent, status: componentStatus, lastCheck: Date.now(), latencyMs: 0, errorCount: 0 },
        { component: 'agent' as NucleusComponent, status: componentStatus, lastCheck: Date.now(), latencyMs: 0, errorCount: 0 },
        { component: 'tool' as NucleusComponent, status: componentStatus, lastCheck: Date.now(), latencyMs: 0, errorCount: 0 },
        { component: 'llm' as NucleusComponent, status: componentStatus, lastCheck: Date.now(), latencyMs: 0, errorCount: 0 },
        { component: 'memory' as NucleusComponent, status: componentStatus, lastCheck: Date.now(), latencyMs: 0, errorCount: 0 },
        { component: 'planner' as NucleusComponent, status: componentStatus, lastCheck: Date.now(), latencyMs: 0, errorCount: 0 },
      ],
      uptime: 1000,
      tasksProcessed: 10,
      avgLatencyMs: 50,
      errorRate: 0.1,
    };
  }

  function makeIntent(type: IntentType): Intent {
    return { type, payload: 'test', context: {}, priority: 5, timestamp: Date.now() };
  }

  it('should route query intent to knowledge', () => {
    const decision = router.route(makeIntent('query'), makeStatus());
    expect(decision.primaryComponent).toBe('knowledge');
  });

  it('should route command intent to agent', () => {
    const decision = router.route(makeIntent('command'), makeStatus());
    expect(decision.primaryComponent).toBe('agent');
  });

  it('should include fallback components in routing decision', () => {
    const decision = router.route(makeIntent('query'), makeStatus());
    expect(decision.fallbackComponents.length).toBeGreaterThan(0);
    expect(decision.fallbackComponents).toContain('llm');
  });

  it('should calculate high confidence for healthy components', () => {
    const decision = router.route(makeIntent('analyze'), makeStatus('healthy'));
    expect(decision.confidence).toBe(0.9);
  });

  it('should calculate low confidence for down components', () => {
    const decision = router.route(makeIntent('analyze'), makeStatus('down'));
    expect(decision.confidence).toBe(0.1);
  });

  it('should route create intent to tool', () => {
    const decision = router.route(makeIntent('create'), makeStatus());
    expect(decision.primaryComponent).toBe('tool');
  });

  it('should route learn intent to memory', () => {
    const decision = router.route(makeIntent('learn'), makeStatus());
    expect(decision.primaryComponent).toBe('memory');
  });

  it('should route debug intent to agent', () => {
    const decision = router.route(makeIntent('debug'), makeStatus());
    expect(decision.primaryComponent).toBe('agent');
  });
});

describe('ExecutionPipeline', () => {
  const pipeline = new ExecutionPipeline();

  it('should execute sequential steps', async () => {
    const steps: PipelineStep[] = [
      { component: 'llm', action: 'analyze', params: { text: 'hello' }, timeoutMs: 1000, retries: 0 },
      { component: 'tool', action: 'transform', params: { format: 'upper' }, timeoutMs: 1000, retries: 0 },
    ];

    const result = await pipeline.execute(steps, {});
    expect(result.success).toBe(true);
    expect(result.steps.length).toBe(2);
    expect(result.steps[0].component).toBe('llm');
    expect(result.steps[1].component).toBe('tool');
  });

  it('should enforce step timeout', async () => {
    const steps: PipelineStep[] = [
      { component: 'llm', action: 'slow', params: {}, timeoutMs: 1, retries: 0 },
    ];

    const result = await pipeline.execute(steps, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('should retry on failure up to configured retries', async () => {
    const steps: PipelineStep[] = [
      { component: 'llm', action: 'fail', params: {}, timeoutMs: 1000, retries: 2 },
    ];

    const result = await pipeline.execute(steps, {});
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return error when a step fails', async () => {
    const steps: PipelineStep[] = [
      { component: 'llm', action: 'fail', params: {}, timeoutMs: 1000, retries: 0 },
    ];

    const result = await pipeline.execute(steps, {});
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.steps.length).toBe(0);
  });

  it('should return empty result for no steps', async () => {
    const result = await pipeline.execute([], {});
    expect(result.success).toBe(true);
    expect(result.steps.length).toBe(0);
    expect(result.output).toBeUndefined();
    expect(result.error).toBeNull();
  });
});
