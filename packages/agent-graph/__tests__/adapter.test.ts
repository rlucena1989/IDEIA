import { createDAGExecutor } from '../src/dag-executor';
import { createSupervisorNode } from '../src/supervisor';
import { createGraphVisualizer } from '../src/graph-visualizer';
import {
  NodeResult, DAGNodeRole,
} from '../src/types';

describe('DAGExecutor', () => {
  it('executes full pipeline successfully', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });
    const exec = await executor.execute('build login system');

    expect(exec.status).toBe('completed');
    expect(exec.results.size).toBe(6);
    expect(exec.nodes.every((n: { status: string }) => n.status === 'completed')).toBe(true);
    expect(exec.id).toMatch(/^dag_/);
  });

  it('throws error if already running', async () => {
    const executor = createDAGExecutor();
    const execPromise = executor.execute('test task');

    await expect(executor.execute('second task')).rejects.toThrow('already running');

    await execPromise;
  });

  it('supports pause and resume', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });

    const execPromise = executor.execute('pause test');
    executor.pause();
    const status = executor.getStatus()!;
    expect(status.status).toBe('paused');

    executor.resume();
    const resumed = executor.getStatus()!;
    expect(resumed.status).toBe('running');

    await execPromise;
  });

  it('supports cancel', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });

    const execPromise = executor.execute('cancel test');
    executor.cancel();
    const status = executor.getStatus()!;
    expect(status.status).toBe('cancelled');

    await execPromise;
  });

  it('adapts node executor via setNodeExecutor', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });

    const capturedRoles: string[] = [];
    executor.setNodeExecutor(async (role: string, task: string) => {
      capturedRoles.push(role);
      return {
        nodeId: role,
        role,
        status: 'completed',
        output: `${role} done: ${task}`,
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('custom executor');
    expect(exec.status).toBe('completed');
    expect(capturedRoles).toEqual(['analyst', 'architect', 'programmer', 'reviewer', 'tester', 'devops']);
  });

  it('reports failure when node fails permanently', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 2 });

    executor.setNodeExecutor(async (role: string) => {
      if (role === 'programmer') {
        throw new Error('Code generation failed');
      }
      return {
        nodeId: role,
        role,
        status: 'completed',
        output: `${role} ok`,
        errors: [],
        durationMs: 10,
        timestamp: Date.now(),
        metadata: {},
      };
    });

    const exec = await executor.execute('failing task');
    expect(exec.status).toBe('failed');
    expect(exec.error).toContain('programmer');
  });
});

describe('SupervisorNode', () => {
  const makeResult = (role: DAGNodeRole, status: NodeResult['status'], durationMs = 100, errors: string[] = []): NodeResult => ({
    nodeId: role,
    role,
    status,
    output: `${role} output`,
    errors,
    durationMs,
    timestamp: Date.now(),
    metadata: {},
  });

  it('returns proceed on high score', () => {
    const supervisor = createSupervisorNode({ autoApprovalScoreThreshold: 0.3 });
    const results = new Map<string, NodeResult>();
    results.set('analyst_0', makeResult('analyst', 'completed', 50));
    results.set('architect_1', makeResult('architect', 'completed', 50));

    const decision = supervisor.evaluate(results);
    expect(decision.type).toBe('proceed');
    expect(decision.autoApproved).toBe(true);
  });

  it('returns stop when nodes fail', () => {
    const supervisor = createSupervisorNode();
    const results = new Map<string, NodeResult>();
    results.set('reviewer_3', makeResult('reviewer', 'failed', 0, ['Review failed']));

    const decision = supervisor.evaluate(results);
    expect(decision.type).toBe('stop');
    expect(decision.requiresHumanIntervention).toBe(true);
  });

  it('returns requestReview on medium score', () => {
    const supervisor = createSupervisorNode({ autoApprovalScoreThreshold: 0.9, requireHumanOnScoreBelow: 0.1 });
    const results = new Map<string, NodeResult>();
    results.set('analyst_0', makeResult('analyst', 'completed', 300000));
    results.set('architect_1', makeResult('architect', 'completed', 300000));

    const decision = supervisor.evaluate(results);
    expect(decision.type).toBe('requestReview');
    expect(decision.autoApproved).toBe(false);
  });
});

describe('GraphVisualizer', () => {
  it('shows graph string representation', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });
    const exec = await executor.execute('visualizer test');
    const vis = createGraphVisualizer(exec);

    const graph = vis.showGraph();
    expect(graph).toContain('DAG Graph:');
    expect(graph).toContain('analyst');
    expect(graph).toContain('architect');
    expect(graph).toContain('devops');
    expect(graph).toContain('[✓]');
  });

  it('shows status summary', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });
    const exec = await executor.execute('status test');
    const vis = createGraphVisualizer(exec);

    const status = vis.showStatus();
    expect(status).toContain('Execution:');
    expect(status).toContain('Status: completed');
    expect(status).toContain('analyst');
  });

  it('returns placeholder for empty execution', () => {
    const vis = createGraphVisualizer();
    expect(vis.showGraph()).toBe('No execution data');
    expect(vis.showStatus()).toBe('No execution data');
  });

  it('generates mermaid output', async () => {
    const executor = createDAGExecutor({ defaultTimeoutMs: 5000, defaultMaxRetries: 1 });
    const exec = await executor.execute('mermaid test');
    const vis = createGraphVisualizer(exec);

    const mermaid = vis.showMermaid();
    expect(mermaid).toContain('```mermaid');
    expect(mermaid).toContain('flowchart TD');
    expect(mermaid).toContain('-->');
  });
});
