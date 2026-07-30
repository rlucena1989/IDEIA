import { createLogger } from '@ideia/logger';
import { ExecutionStep, StepStatus } from './pipeline-types';

export class PlanExecutor {
  private steps: ExecutionStep[] = [];
  private logger = createLogger('pipeline-executor');

  async execute(plan: { tasks: Array<{ id: string; description: string }> }): Promise<ExecutionStep[]> {
    this.steps = plan.tasks.map(t => ({
      id: t.id, name: t.description, description: t.description,
      status: 'pending' as StepStatus,
    }));

    for (const step of this.steps) {
      step.status = 'running';
      step.startedAt = Date.now();
      this.logger.info(`Executing step: ${step.name}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      step.status = 'completed';
      step.completedAt = Date.now();
      step.result = `Step '${step.name}' completed`;
    }

    return this.steps;
  }

  getSteps(): ExecutionStep[] { return [...this.steps]; }

  getStatus(): { total: number; completed: number; failed: number } {
    return { total: this.steps.length, completed: this.steps.filter(s => s.status === 'completed').length, failed: this.steps.filter(s => s.status === 'failed').length };
  }
}
