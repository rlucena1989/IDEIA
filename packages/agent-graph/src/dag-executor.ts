import crypto from 'crypto';
import { createLogger } from '@ideia/logger';
import { SupervisorNode } from './supervisor';
import { DAGConfig, DAGExecution, DAGNode, DAGNodeRole, DAGExecutionStatus, NodeResult, DEFAULT_DAG_CONFIG } from './types';

const logger = createLogger('agent-graph:dag-executor');

export type NodeExecutorFn = (role: string, task: string) => Promise<NodeResult>;

const DEFAULT_ROLES: DAGNodeRole[] = ['analyst', 'architect', 'programmer', 'reviewer', 'tester', 'devops'];

export class DAGExecutor {
  private config: DAGConfig;
  private _execution: DAGExecution | null = null;
  private nodeExecutor: NodeExecutorFn | null = null;

  constructor(config?: Partial<DAGConfig>) {
    this.config = { ...DEFAULT_DAG_CONFIG, ...config };
  }

  setNodeExecutor(fn: NodeExecutorFn): void {
    this.nodeExecutor = fn;
  }

  get status(): DAGExecutionStatus {
    return this._execution?.status ?? 'idle';
  }

  pause(): void {
    if (this._execution) {
      this._execution.status = 'paused';
      this._execution.pausedAt = Date.now();
    }
  }

  resume(): void {
    if (this._execution && this._execution.status === 'paused') {
      this._execution.status = 'running';
    }
  }

  cancel(): void {
    if (this._execution) {
      this._execution.status = 'cancelled';
      this._execution.completedAt = Date.now();
    }
  }

  async execute(task: string): Promise<DAGExecution> {
    if (this._execution?.status === 'running') {
      throw new Error('DAGExecutor is already running');
    }

    const id = `dag_${crypto.randomUUID().slice(0, 8)}`;
    const nodes: DAGNode[] = DEFAULT_ROLES.map((role, i) => ({
      id: `${role}_${i}`,
      role,
      status: 'pending' as const,
      timeoutMs: this.config.defaultTimeoutMs,
      attempt: 0,
      maxRetries: this.config.defaultMaxRetries,
    }));

    this._execution = {
      id,
      task,
      status: 'running',
      nodes,
      edges: [],
      results: new Map(),
      currentNodeId: null,
      startedAt: Date.now(),
      completedAt: null,
      pausedAt: null,
      error: null,
    };

    const supervisor = new SupervisorNode({
      autoApprovalScoreThreshold: this.config.autoApprovalScoreThreshold,
      requireHumanOnScoreBelow: this.config.requireHumanOnScoreBelow,
    });

    try {
      for (const node of nodes) {
        node.status = 'running';
        this._execution.currentNodeId = node.id;
        const executor = this.nodeExecutor ?? (async (role: string, _task: string) => ({
          nodeId: node.id, role: role as DAGNodeRole, status: 'completed' as const, output: '', errors: [], durationMs: 10, timestamp: Date.now(), metadata: {},
        }));
        const result = await executor(node.role, task);
        this._execution.results.set(node.id, result);
        node.status = result.status;

        const decision = supervisor.evaluateIntermediate(result);
        if (decision.type === 'stop') {
          this._execution.status = 'failed';
          this._execution.error = decision.reason;
          this._execution.completedAt = Date.now();
          return this._execution;
        }
      }

      this._execution.status = 'completed';
      this._execution.completedAt = Date.now();
    } catch (err) {
      this._execution.status = 'failed';
      this._execution.error = String(err);
      this._execution.completedAt = Date.now();
    }

    return this._execution;
  }

  getStatus(): DAGExecution | null {
    return this._execution;
  }

  getExecution(): DAGExecution | null {
    return this._execution;
  }
}

export function createDAGExecutor(config?: Partial<DAGConfig>): DAGExecutor {
  return new DAGExecutor(config);
}
