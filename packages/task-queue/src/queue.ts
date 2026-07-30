import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
import { v4 as uuid } from 'uuid';
import { Task, TaskInput, TaskStatus, TaskPriority, TaskHandler, TaskResult, RETRY_DELAYS } from './types';

export class TaskQueue extends EventEmitter {
  private queue: Task[] = [];
  private handlers: Map<string, TaskHandler> = new Map();
  private running = false;
  private processing = false;
  private concurrency: number;

  constructor(options: { concurrency?: number } = {}) {
    super();
    this.concurrency = options.concurrency ?? 1;
  }

  registerHandler(type: string, handler: TaskHandler): void {
    this.handlers.set(type, handler);
  }

  unregisterHandler(type: string): void {
    this.handlers.delete(type);
  }

  async enqueue(task: TaskInput): Promise<string> {
    const id = uuid();
    const entry: Task = {
      ...task,
      id,
      status: 'pending',
      createdAt: Date.now(),
      retries: 0,
      maxRetries: task.maxRetries ?? 3,
    } as Task;
    this.queue.push(entry);
    this.queue.sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority));
    this.emit('enqueued', entry);
    this.process();
    return id;
  }

  async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.running && this.queue.length > 0 && this.getRunningCount() < this.concurrency) {
      const task = this.queue.shift() as Task;
      this.executeTask(task).catch(() => {});
    }

    this.processing = false;
  }

  private async executeTask(task: Task): Promise<TaskResult> {
    const start = Date.now();
    task.status = 'running';
    task.startedAt = start;
    this.emit('started', task);

    const handler = this.handlers.get(task.type);
    if (!handler) {
      return this.failTask(task, `No handler registered for type: ${task.type}`, start);
    }

    try {
      const result = await handler(task);
      task.status = 'completed';
      task.completedAt = Date.now();
      this.emit('completed', task);
      return { success: true, taskId: task.id, result, duration: Date.now() - start };
    } catch (_err) {
      const error = _err instanceof Error ? _err.message : String(_err);
      task.retries++;
      const maxRetries = task.maxRetries ?? 3;
      if (task.retries <= maxRetries) {
        const delay = RETRY_DELAYS[Math.min(task.retries - 1, RETRY_DELAYS.length - 1)];
        this.emit('retrying', { task, retry: task.retries, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        task.status = 'pending';
        this.queue.unshift(task);
        this.process();
        return { success: false, taskId: task.id, error: `Retry ${task.retries}/${maxRetries}: ${error}`, duration: Date.now() - start };
      }
      return this.failTask(task, error, start);
    }
  }

  private failTask(task: Task, error: string, start: number): TaskResult {
    task.status = 'failed';
    task.completedAt = Date.now();
    task.error = error;
    this.emit('failed', task);
    return { success: false, taskId: task.id, error, duration: Date.now() - start };
  }

  cancel(id: string): boolean {
    const idx = this.queue.findIndex(t => t.id === id && t.status === 'pending');
    if (idx !== -1) {
      this.queue[idx].status = 'cancelled';
      this.queue.splice(idx, 1);
      this.emit('cancelled', id);
      return true;
    }
    return false;
  }

  getPending(): Task[] {
    return this.queue.filter(t => t.status === 'pending');
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  start(): void {
    this.running = true;
    this.process();
  }

  stop(): void {
    this.running = false;
  }

  clear(): void {
    this.queue = [];
  }

  private getRunningCount(): number {
    return this.queue.filter(t => t.status === 'running').length;
  }

  private priorityWeight(p: TaskPriority): number {
    return { low: 1, medium: 2, high: 3, critical: 4 }[p] ?? 0;
  }
}

export function createTaskQueue(options?: { concurrency?: number }): TaskQueue {
  return new TaskQueue(options);
}
