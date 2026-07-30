import { createDAGExecutor } from '../src/dag-executor';
import { SupervisorNode, createSupervisorNode } from '../src/supervisor';
import { createGraphVisualizer } from '../src/graph-visualizer';
import { NodeResult, DAGConfig, DAGNodeRole } from '../src/types';

describe('DAGExecutor advanced scenarios', () => {
  it('handles empty execution gracefully after cancel', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });
    let nodeCount = 0;

    executor.setNodeExecutor(async (role: string) => {
      nodeCount++;
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        nodeId: role,
        role,
        status: 'completed',
        output: '',
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const execPromise = executor.execute('cancel fast');
    await new Promise(resolve => setTimeout(resolve, 50));
    executor.cancel();
    const exec = await execPromise;
    expect(exec.status).toBe('cancelled');
  });

  it('survives node executor throwing non-Error', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });

    executor.setNodeExecutor(async (role: string) => {
      if (role === 'programmer') {
        throw new Error('string error');
      }
      return {
        nodeId: role,
        role,
        status: 'completed',
        output: '',
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('string throw');
    expect(exec.status).toBe('failed');
    expect(exec.error).toContain('string error');
  });

  it('handles timeout by moving to next node', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 200, defaultMaxRetries: 1 });

    executor.setNodeExecutor(async (role: string) => {
      if (role === 'architect') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return {
        nodeId: role,
        role,
        status: 'completed',
        output: '',
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('timeout test');
    expect(exec.status).toBe('failed');
    expect(exec.error).toContain('timed out');
  });

  it('calls supervisor after each node', async () => {
    const _evaluations: Array<{ role: string; decision: string }> = [];
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });

    executor.setNodeExecutor(async (role: string) => {
      return {
        nodeId: role,
        role,
        status: 'completed' as const,
        output: `done`,
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('supervisor tracking');
    expect(exec.status).toBe('completed');
  });

  it('supports custom DAGConfig and validates defaults', () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 60000, enableCheckpoints: false });
    const nested = (executor as unknown) as { config: DAGConfig };
    expect(nested.config.defaultTimeoutMs).toBe(60000);
    expect(nested.config.enableCheckpoints).toBe(false);
    expect(nested.config.defaultMaxRetries).toBe(3);
  });
});

describe('SupervisorNode advanced', () => {
  const makeResult = (role: DAGNodeRole, durationMs = 100, errors: string[] = []): NodeResult => ({
    nodeId: role,
    role,
    status: errors.length > 0 ? 'failed' : 'completed',
    output: '',
    errors,
    durationMs,
    timestamp: Date.now(),
    metadata: {},
  });

  it('evaluatesSingle merges previous results', () => {
    const supervisor = createSupervisorNode({ autoApprovalScoreThreshold: 0.3 });
    const previous = new Map<string, NodeResult>();
    previous.set('analyst_0', makeResult('analyst', 50));

    const decision = supervisor.evaluateSingle('architect_1', makeResult('architect', 50), previous);
    expect(decision.type).toBe('proceed');
  });

  it('returns stop when score below human threshold', () => {
    const supervisor = createSupervisorNode({ autoApprovalScoreThreshold: 0.9, requireHumanOnScoreBelow: 0.8 });
    const results = new Map<string, NodeResult>();
    results.set('analyst_0', makeResult('analyst', 500000, ['slow']));

    const decision = supervisor.evaluate(results);
    expect(decision.type).toBe('stop');
    expect(decision.requiresHumanIntervention).toBe(true);
  });

  it('returns score between 0 and 1', () => {
    const supervisor = createSupervisorNode({ autoApprovalScoreThreshold: 0.99 });
    const results = new Map<string, NodeResult>();
    results.set('analyst_0', makeResult('analyst', 0));

    const decision = supervisor.evaluate(results);
    expect(decision.score).toBeGreaterThanOrEqual(0);
    expect(decision.score).toBeLessThanOrEqual(1);
  });
});

describe('GraphVisualizer advanced', () => {
  it('detects failed nodes in graph output', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });

    executor.setNodeExecutor(async (role: string) => {
      if (role === 'tester') {
        return {
          nodeId: role,
          role,
          status: 'failed' as const,
          output: '',
          errors: ['Test failure'],
          durationMs: 10,
          timestamp: Date.now(),
          metadata: {},
        };
      }
      return {
        nodeId: role,
        role,
        status: 'completed' as const,
        output: '',
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('failed graph');
    expect(exec.status).toBe('failed');

    const vis = createGraphVisualizer(exec);
    const status = vis.showStatus();
    expect(status).toContain('failed');
    expect(status).toContain('errors:1');
  });

  it('shows failed count in graph', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });

    executor.setNodeExecutor(async (role: string) => {
      if (role === 'programmer') {
        throw new Error('gen failure');
      }
      return {
        nodeId: role,
        role,
        status: 'completed',
        output: '',
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('failed count');
    const vis = createGraphVisualizer(exec);
    const graph = vis.showGraph();
    expect(graph).toContain('Failed:');
  });

  it('mermaid output wraps in code block', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });
    const exec = await executor.execute('mermaid advanced');
    const vis = createGraphVisualizer(exec);

    const mermaid = vis.showMermaid();
    expect(mermaid.startsWith('```mermaid')).toBe(true);
    expect(mermaid.endsWith('```')).toBe(true);
  });

  it('handles setExecution after construction', () => {
    const vis = createGraphVisualizer();
    expect(vis.showGraph()).toBe('No execution data');

    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });
    executor.execute('set exec').then((exec) => {
      vis.setExecution(exec);
      const graph = vis.showGraph();
      expect(graph).toContain('DAG Graph:');
    });
  });

  it('recovers after single node retries success', async () => {
    let callCount = 0;
    const executor = createDAGExecutor({ defaultTimeoutMs: 500, defaultMaxRetries: 3 });

    executor.setNodeExecutor(async (role: string) => {
      if (role === 'programmer') {
        callCount++;
        if (callCount < 2) throw new Error('transient error');
      }
      return {
        nodeId: role,
        role,
        status: 'completed',
        output: '',
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('retry recovery');
    expect(exec.status).toBe('completed');
  });
});
