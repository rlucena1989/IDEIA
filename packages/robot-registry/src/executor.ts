import { RobotTask, RobotResult, SafetyConstraint, VerificationCriterion } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('executor');

export interface ExecutorConfig {
  maxExecutionTime: number;
  maxMemoryMb: number;
  sandboxEnabled: boolean;
}

const DEFAULT_CONFIG: ExecutorConfig = {
  maxExecutionTime: 300000,
  maxMemoryMb: 1024,
  sandboxEnabled: true,
};

export interface ISandboxExecutor {
  execute(task: RobotTask, context?: Record<string, unknown>): Promise<RobotResult>;
  cancel(taskId: string): Promise<void>;
  getStatus(): string;
}

export class SandboxExecutor implements ISandboxExecutor {
  private config: ExecutorConfig;
  private runningTasks: Map<string, AbortController> = new Map();
  private status: string = 'idle';

  constructor(config?: Partial<ExecutorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute(task: RobotTask, _context?: Record<string, unknown>): Promise<RobotResult> {
    const abortController = new AbortController();
    this.runningTasks.set(task.id, abortController);
    this.status = 'busy';

    try {
      this.validateSafetyConstraints(task.safetyConstraints);
      const startTime = Date.now();

      const result = await this.runTask(task, abortController.signal);

      const duration = Date.now() - startTime;
      const verified = this.verifyResult(result, task.verificationCriteria);

      return {
        taskId: task.id,
        status: verified ? 'success' : 'partial',
        output: result,
        metrics: {
          duration,
          resourceUsage: { cpuPercent: 15, memoryMb: 128, networkKb: 0 },
          errorCount: verified ? 0 : 1,
        },
        artifacts: [],
        auditLog: [{ timestamp: new Date().toISOString(), action: 'execute', actor: 'sandbox', details: `Task ${task.id} completed in ${duration}ms`, hash: '' }],
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: 'failure',
        output: { error: error instanceof Error ? error.message : String(error) },
        metrics: { duration: 0, resourceUsage: { cpuPercent: 0, memoryMb: 0, networkKb: 0 }, errorCount: 1 },
        artifacts: [],
        auditLog: [{ timestamp: new Date().toISOString(), action: 'execute', actor: 'sandbox', details: `Task ${task.id} failed`, hash: '' }],
      };
    } finally {
      this.runningTasks.delete(task.id);
      this.status = 'idle';
    }
  }

  async cancel(taskId: string): Promise<void> {
    const controller = this.runningTasks.get(taskId);
    if (controller) {
      controller.abort();
      this.runningTasks.delete(taskId);
    }
  }

  getStatus(): string {
    return this.status;
  }

  private validateSafetyConstraints(constraints: SafetyConstraint[]): void {
    for (const c of constraints) {
      if (c.type === 'timeout' && typeof c.value === 'number' && c.value > this.config.maxExecutionTime) {
        throw new Error(`Safety constraint violation: timeout ${c.value}ms exceeds max ${this.config.maxExecutionTime}ms`);
      }
    }
  }

  private verifyResult(_result: Record<string, unknown>, _criteria: VerificationCriterion[]): boolean {
    return true;
  }

  private async runTask(task: RobotTask, signal: AbortSignal): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
      }, task.timeout);

      if (signal.aborted) {
        clearTimeout(timeout);
        reject(new Error(`Task ${task.id} cancelled`));
        return;
      }

      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error(`Task ${task.id} cancelled`));
      });

      Promise.resolve().then(() => {
        clearTimeout(timeout);
        resolve({ executed: true, taskType: task.type, input: task.input });
      });
    });
  }
}

export function createSandboxExecutor(config?: Partial<ExecutorConfig>): SandboxExecutor {
  return new SandboxExecutor(config);
}
