
export interface Task {
  id: string;
  type: string;
  input: unknown;
  context?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  ok: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

export interface TaskEngine {
  run(task: Task): Promise<TaskResult>;
  cancel(taskId: string): Promise<void>;
  status(taskId: string): TaskStatus;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export class LocalTaskEngine implements TaskEngine {
  private active = new Map<string, { task: Task; startTime: number }>();
  private completed = new Map<string, TaskResult>();
  private cancelled = new Set<string>();

  async run(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    this.active.set(task.id, { task, startTime });

    try {
      const output = await this.executeTask(task);
      const durationMs = Date.now() - startTime;
      const result: TaskResult = { taskId: task.id, ok: true, output, durationMs };
      this.active.delete(task.id);
      this.completed.set(task.id, result);
      return result;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const result: TaskResult = { taskId: task.id, ok: false, output: null, error: err instanceof Error ? err.message : String(err), durationMs };
      this.active.delete(task.id);
      this.completed.set(task.id, result);
      return result;
    }
  }

  async cancel(taskId: string): Promise<void> {
    if (this.completed.has(taskId)) return;
    this.active.delete(taskId);
    this.cancelled.add(taskId);
  }

  status(taskId: string): TaskStatus {
    if (this.active.has(taskId)) return 'running';
    if (this.cancelled.has(taskId)) return 'cancelled';
    const result = this.completed.get(taskId);
    if (result) return result.ok ? 'completed' : 'failed';
    return 'pending';
  }

  private async executeTask(task: Task): Promise<unknown> {
    return { executed: true, taskId: task.id, type: task.type, input: task.input };
  }
}
