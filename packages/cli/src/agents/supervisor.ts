import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';

export type AgentRole = 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops';

export interface AgentTask {
  id: string;
  role: AgentRole;
  title: string;
  description: string;
  input: unknown;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentMessage {
  from: AgentRole;
  to: AgentRole;
  taskId: string;
  type: 'request' | 'response' | 'artifact' | 'review';
  payload: unknown;
  timestamp: string;
}

export interface AgentReport {
  role: AgentRole;
  taskId: string;
  title: string;
  status: 'completed' | 'failed';
  durationMs: number;
  error?: string;
  output?: unknown;
}

export interface ExecutionReport {
  totalTasks: number;
  completed: number;
  failed: number;
  totalDurationMs: number;
  perAgent: AgentReport[];
  description: string;
}

const ROLES: AgentRole[] = ['analyst', 'architect', 'programmer', 'reviewer', 'tester', 'devops'];
const ROLE_DEPENDENCIES: Record<AgentRole, AgentRole[]> = {
  analyst: [],
  architect: ['analyst'],
  programmer: ['architect'],
  tester: ['programmer'],
  reviewer: ['programmer', 'tester'],
  devops: ['reviewer'],
};

export class MessagePool {
  private messages: AgentMessage[] = [];
  private emitter = new EventEmitter();

  publish(msg: AgentMessage): void {
    this.messages.push(msg);
    this.emitter.emit('message', msg);
  }

  subscribe(role: AgentRole, callback: (msg: AgentMessage) => void): () => void {
    const handler = (msg: AgentMessage) => { if (msg.to === role) callback(msg); };
    this.emitter.on('message', handler);
    return () => this.emitter.off('message', handler);
  }

  getMessagesFor(role: AgentRole): AgentMessage[] {
    return this.messages.filter(m => m.to === role);
  }

  getHistory(): AgentMessage[] {
    return [...this.messages];
  }
}

export class AgentSupervisor {
  private pool: MessagePool;
  private tasks: Map<string, AgentTask> = new Map();
  private handlers: Map<AgentRole, (task: AgentTask) => Promise<unknown>> = new Map();
  private executionTimeout = 300000;
  private onProgress?: (report: AgentReport) => void;

  constructor(pool: MessagePool) {
    this.pool = pool;
  }

  setExecutionTimeout(ms: number): void { this.executionTimeout = ms; }

  setOnProgress(cb: (report: AgentReport) => void): void { this.onProgress = cb; }

  registerHandler(role: AgentRole, handler: (task: AgentTask) => Promise<unknown>): void {
    this.handlers.set(role, handler);
  }

  async execute(description: string): Promise<ExecutionReport> {
    const overallStart = Date.now();
    const tasks = this.plan(description);
    const sorted = this.topologicalSort(tasks);

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const report: ExecutionReport = {
      totalTasks: sorted.length,
      completed: 0,
      failed: 0,
      totalDurationMs: 0,
      perAgent: [],
      description,
    };

    for (const task of sorted) {
      const deps = task.dependencies.map(d => taskMap.get(d)).filter((d): d is NonNullable<typeof d> => Boolean(d));
      const failedDep = deps.find(d => d.status === 'failed');
      if (failedDep) {
        task.status = 'failed';
        task.error = `Dependency failed: ${failedDep.title}`;
        this.tasks.set(task.id, task);
        report.failed++;
        this.onProgress?.({
          role: task.role, taskId: task.id, title: task.title,
          status: 'failed', durationMs: 0, error: task.error,
        });
        continue;
      }

      task.status = 'running';
      task.startedAt = new Date().toISOString();
      this.tasks.set(task.id, task);

      const handler = this.handlers.get(task.role);
      if (!handler) {
        task.status = 'failed';
        task.error = `No handler for role: ${task.role}`;
        task.completedAt = new Date().toISOString();
        this.tasks.set(task.id, task);
        report.failed++;
        this.onProgress?.({
          role: task.role, taskId: task.id, title: task.title,
          status: 'failed', durationMs: 0, error: task.error,
        });
        continue;
      }

      const taskStart = Date.now();
      try {
        const output = await Promise.race([
          handler(task),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Task ${task.id} timed out after ${this.executionTimeout}ms`)), this.executionTimeout)
          ),
        ]);
        task.output = output;
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        const durationMs = Date.now() - taskStart;
        this.pool.publish({
          from: task.role, to: 'analyst', taskId: task.id,
          type: 'response', payload: output,
          timestamp: new Date().toISOString(),
        });
        report.completed++;
        this.onProgress?.({ role: task.role, taskId: task.id, title: task.title, status: 'completed', durationMs, output });
      } catch (err) {
        task.status = 'failed';
        task.completedAt = new Date().toISOString();
        task.error = err instanceof Error ? err.message : String(err);
        const durationMs = Date.now() - taskStart;
        report.failed++;
        this.onProgress?.({ role: task.role, taskId: task.id, title: task.title, status: 'failed', durationMs, error: task.error });
      }

      this.tasks.set(task.id, task);
    }

    report.totalDurationMs = Date.now() - overallStart;

    for (const t of this.tasks.values()) {
      const rep = report.perAgent.find(p => p.taskId === t.id);
      if (!rep) {
        report.perAgent.push({
          role: t.role, taskId: t.id, title: t.title,
          status: t.status === 'completed' ? 'completed' : 'failed',
          durationMs: t.startedAt && t.completedAt
            ? new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()
            : 0,
          error: t.error,
          output: t.output,
        });
      }
    }

    return report;
  }

  private plan(description: string): AgentTask[] {
    const id = (role: AgentRole) => `task-${role}-${Date.now()}`;
    return ROLES.map(role => ({
      id: id(role),
      role,
      title: `${role}: ${description.slice(0, 60)}`,
      description,
      input: { description },
      dependencies: (ROLE_DEPENDENCIES[role] ?? []).map(d => id(d)),
      status: 'pending' as const,
    }));
  }

  private topologicalSort(tasks: AgentTask[]): AgentTask[] {
    const visited = new Set<string>();
    const result: AgentTask[] = [];
    const temp = new Set<string>();

    const visit = (task: AgentTask) => {
      if (temp.has(task.id)) return;
      if (visited.has(task.id)) return;
      temp.add(task.id);
      for (const depId of task.dependencies) {
        const dep = tasks.find(t => t.id === depId);
        if (dep) visit(dep);
      }
      temp.delete(task.id);
      visited.add(task.id);
      result.push(task);
    };

    for (const task of tasks) visit(task);
    return result;
  }
}

