import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import {
  TaskService, TaskDefinition, TaskExecution, TaskProvider, ProblemMatcher, ProblemMatch, TaskOptions,
} from './types';

class DefaultTaskExecution implements TaskExecution {
  readonly id: string;
  readonly definition: TaskDefinition;
  status: 'running' | 'completed' | 'failed' | 'cancelled' = 'running';
  exitCode?: number;
  output = '';
  startedAt = new Date();
  completedAt?: Date;

  constructor(definition: TaskDefinition) {
    this.id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.definition = definition;
  }
}

export class DefaultTaskService implements TaskService {
  private providers: TaskProvider[] = [];
  private running = new Map<string, DefaultTaskExecution>();
  private onStartedEmitter = new Emitter<TaskExecution>();
  private onCompletedEmitter = new Emitter<TaskExecution>();

  get onTaskStarted() { return this.onStartedEmitter.event; }
  get onTaskCompleted() { return this.onCompletedEmitter.event; }

  registerProvider(provider: TaskProvider): void {
    this.providers.push(provider);
  }

  async run(taskDef: TaskDefinition): Promise<TaskExecution> {
    const execution = new DefaultTaskExecution(taskDef);
    this.running.set(execution.id, execution);
    this.onStartedEmitter.fire(execution);

    try {
      execution.status = 'completed';
      execution.exitCode = 0;
    } catch (err) {
      execution.status = 'failed';
      execution.exitCode = 1;
      execution.output = (err as Error).message;
    }

    execution.completedAt = new Date();
    this.running.delete(execution.id);
    this.onCompletedEmitter.fire(execution);
    return execution;
  }

  cancel(executionId: string): void {
    const exec = this.running.get(executionId);
    if (exec) {
      exec.status = 'cancelled';
      exec.completedAt = new Date();
      this.running.delete(executionId);
      this.onCompletedEmitter.fire(exec);
    }
  }

  getRunningTasks(): TaskExecution[] {
    return Array.from(this.running.values());
  }
}

export class NpmTaskProvider implements TaskProvider {
  readonly id = 'npm';

  async provideTasks(): Promise<TaskDefinition[]> {
    return [
      {
        type: 'npm',
        label: 'npm run build',
        command: 'npm run build',
        group: 'build',
        problemMatchers: ['$tsc'],
      },
      {
        type: 'npm',
        label: 'npm run test',
        command: 'npm run test',
        group: 'test',
      },
      {
        type: 'npm',
        label: 'npm run lint',
        command: 'npm run lint',
        group: 'build',
      },
    ];
  }
}

export class TypeScriptProblemMatcher implements ProblemMatcher {
  readonly name = '$tsc';

  parseLine(line: string): ProblemMatch | null {
    const match = line.match(/^(.+)\((\d+),(\d+)\):\s+(error|warning|info)\s+(\w+\d+)?:?\s*(.+)$/);
    if (!match) return null;

    return {
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      severity: match[4] as 'error' | 'warning' | 'info',
      message: match[6],
      code: match[5],
    };
  }
}
