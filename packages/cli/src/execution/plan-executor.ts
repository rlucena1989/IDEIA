import type { Task, TaskResult, TaskEngine } from './task-engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('plan-executor');

export interface PlanStep {
  id: string;
  name: string;
  type: string;
  input: unknown;
  dependsOn: string[];
}

export interface Plan {
  id: string;
  name: string;
  steps: PlanStep[];
  metadata?: Record<string, unknown>;
}

export interface PlanResult {
  planId: string;
  ok: boolean;
  stepResults: Map<string, TaskResult>;
  error?: string;
  durationMs: number;
}

export interface PlanExecutor {
  execute(plan: Plan): Promise<PlanResult>;
  cancel(planId: string): Promise<void>;
  status(planId: string): PlanStatus;
}

export type PlanStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

export class LocalPlanExecutor implements PlanExecutor {
  private engine: TaskEngine;
  private active = new Set<string>();
  private completed = new Map<string, PlanResult>();
  private cancelled = new Set<string>();

  constructor(engine: TaskEngine) {
    this.engine = engine;
  }

  async execute(plan: Plan): Promise<PlanResult> {
    const startTime = Date.now();
    const planId = plan.id;
    this.active.add(planId);

    const stepResults = new Map<string, TaskResult>();

    try {
      for (const step of plan.steps) {
        if (this.cancelled.has(planId)) {
          const durationMs = Date.now() - startTime;
          const result: PlanResult = { planId, ok: false, stepResults, error: 'Cancelled', durationMs };
          this.completed.set(planId, result);
          return result;
        }

        const allDepsMet = step.dependsOn.every(dep => {
          const r = stepResults.get(dep);
          return r && r.ok;
        });

        if (!allDepsMet) {
          stepResults.set(step.id, { taskId: step.id, ok: false, output: null, error: `Dependency not met: ${step.dependsOn.join(', ')}`, durationMs: 0 });
          continue;
        }

        const task: Task = { id: step.id, type: step.type, input: step.input };
        const taskResult = await this.engine.run(task);
        stepResults.set(step.id, taskResult);

        if (!taskResult.ok) {
          const durationMs = Date.now() - startTime;
          const result: PlanResult = { planId, ok: false, stepResults, error: `Step ${step.name} failed: ${taskResult.error}`, durationMs };
          this.active.delete(planId);
          this.completed.set(planId, result);
          return result;
        }
      }

      const durationMs = Date.now() - startTime;
      const result: PlanResult = { planId, ok: true, stepResults, durationMs };
      this.active.delete(planId);
      this.completed.set(planId, result);
      return result;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const result: PlanResult = { planId, ok: false, stepResults, error: err instanceof Error ? err.message : String(err), durationMs };
      this.active.delete(planId);
      this.completed.set(planId, result);
      return result;
    }
  }

  async cancel(planId: string): Promise<void> {
    if (this.completed.has(planId)) return;
    this.active.delete(planId);
    this.cancelled.add(planId);
  }

  status(planId: string): PlanStatus {
    if (this.active.has(planId)) return 'executing';
    if (this.cancelled.has(planId)) return 'cancelled';
    const result = this.completed.get(planId);
    if (result) return result.ok ? 'completed' : 'failed';
    return 'pending';
  }
}
