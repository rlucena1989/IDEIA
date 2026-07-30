import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
const logger = createLogger('task-use-case');

export interface TaskSpec {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskListOutput {
  tasks: TaskSpec[];
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export class TaskUseCase {
  private tasks: Map<string, TaskSpec> = new Map();

  createTask(name: string, description: string, priority: number, tags: string[]): CliCommandResult<TaskSpec> {
    try {
      const task: TaskSpec = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name,
        description,
        status: 'pending',
        priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags,
      };
      this.tasks.set(task.id, task);
      return success(`Task "${name}" created`, task);
    } catch (err) {
      return failure(`Failed to create task: ${err instanceof Error ? err.message : String(err)}`) as CliCommandResult<TaskSpec>;
    }
  }

  updateTaskStatus(taskId: string, status: TaskSpec['status']): CliCommandResult<TaskSpec> {
    const task = this.tasks.get(taskId);
    if (!task) return failure(`Task not found: ${taskId}`, 1) as CliCommandResult<TaskSpec>;

    task.status = status;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    return success(`Task "${task.name}" status updated to ${status}`, task);
  }

  assignTask(taskId: string, assignedTo: string): CliCommandResult<TaskSpec> {
    const task = this.tasks.get(taskId);
    if (!task) return failure(`Task not found: ${taskId}`, 1) as CliCommandResult<TaskSpec>;

    task.assignedTo = assignedTo;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    return success(`Task "${task.name}" assigned to ${assignedTo}`, task);
  }

  getTask(taskId: string): CliCommandResult<TaskSpec> {
    const task = this.tasks.get(taskId);
    if (!task) return failure(`Task not found: ${taskId}`, 1) as CliCommandResult<TaskSpec>;
    return success('Task found', task);
  }

  listTasks(status?: TaskSpec['status']): CliCommandResult<TaskListOutput> {
    const all = Array.from(this.tasks.values());
    const filtered = status ? all.filter(t => t.status === status) : all;

    const output: TaskListOutput = {
      tasks: filtered,
      total: all.length,
      pending: all.filter(t => t.status === 'pending').length,
      running: all.filter(t => t.status === 'running').length,
      completed: all.filter(t => t.status === 'completed').length,
      failed: all.filter(t => t.status === 'failed').length,
    };

    return success(`Found ${filtered.length} tasks`, output);
  }

  deleteTask(taskId: string): CliCommandResult<void> {
    const task = this.tasks.get(taskId);
    if (!task) return failure(`Task not found: ${taskId}`, 1) as CliCommandResult<void>;

    this.tasks.delete(taskId);
    return success(`Task "${task.name}" deleted`);
  }
}

export function createTaskUseCase(): TaskUseCase {
  return new TaskUseCase();
}
