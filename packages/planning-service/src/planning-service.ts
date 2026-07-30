import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import type { Plan, PlanStep, PlanStatus, PlanHistoryEntry, PlanValidation, PlanEvent } from './types';
const logger = createLogger('planning-service');

export class PlanningService {
  private plans: Map<string, Plan> = new Map();
  private history: PlanHistoryEntry[] = [];
  private listeners: Array<(event: PlanEvent) => void> = [];
  private persistPath?: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath;
  }

  private emit(event: PlanEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Silently ignore listener errors
      }
    }
  }

  createPlan(name: string, description: string, steps: Omit<PlanStep, 'id' | 'status'>[]): Plan {
    const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const planSteps: PlanStep[] = steps.map((s, i) => ({
      ...s,
      id: `step-${i}-${Date.now()}`,
      status: 'draft' as PlanStatus,
    }));

    const plan: Plan = {
      id,
      name,
      description,
      status: 'draft',
      steps: planSteps,
      createdAt: now,
      updatedAt: now,
    };

    this.plans.set(id, plan);
    const event: PlanEvent = { planId: id, action: 'created', timestamp: now, details: `Plan "${name}" created` };
    this.history.push(event);
    this.emit(event);
    return plan;
  }

  executePlan(planId: string): Plan | undefined {
    const plan = this.plans.get(planId);
    if (!plan) {
      return undefined;
    }

    plan.status = 'active';
    plan.updatedAt = new Date().toISOString();
    plan.steps = plan.steps.map((s, i) => ({
      ...s,
      status: i === 0 ? 'active' : 'draft',
      startedAt: i === 0 ? new Date().toISOString() : undefined,
    }));

    const event: PlanEvent = { planId, action: 'created', timestamp: plan.updatedAt, details: 'Plan execution started' };
    this.history.push(event);
    this.emit(event);
    return plan;
  }

  completeStep(planId: string, stepId: string): Plan | undefined {
    const plan = this.plans.get(planId);
    if (!plan) {
      return undefined;
    }

    const stepIndex = plan.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return undefined;
    }

    const now = new Date().toISOString();
    plan.steps[stepIndex] = { ...plan.steps[stepIndex], status: 'completed', completedAt: now };

    if (stepIndex + 1 < plan.steps.length) {
      plan.steps[stepIndex + 1] = { ...plan.steps[stepIndex + 1], status: 'active', startedAt: now };
    }

    const allDone = plan.steps.every(s => s.status === 'completed');
    if (allDone) {
      plan.status = 'completed';
      plan.completedAt = now;
    }

    plan.updatedAt = now;
    const event: PlanEvent = { planId, action: 'step_completed', timestamp: now, details: `Step ${stepId} completed` };
    this.history.push(event);
    this.emit(event);
    return plan;
  }

  getPlanStatus(planId: string): Plan | undefined {
    return this.plans.get(planId);
  }

  getPlanHistory(planId?: string): PlanHistoryEntry[] {
    if (planId) {
      return this.history.filter(h => h.planId === planId);
    }
    return [...this.history];
  }

  getPlan(id: string): Plan | undefined {
    return this.plans.get(id);
  }

  cancelPlan(id: string): Plan | undefined {
    const plan = this.plans.get(id);
    if (!plan) return undefined;

    const now = new Date().toISOString();
    plan.status = 'cancelled';
    plan.updatedAt = now;
    plan.steps = plan.steps.map(s => ({
      ...s,
      status: s.status === 'active' ? 'cancelled' : s.status,
    }));

    const event: PlanEvent = { planId: id, action: 'cancelled', timestamp: now, details: `Plan "${plan.name}" cancelled` };
    this.history.push(event);
    this.emit(event);
    return plan;
  }

  failPlan(id: string, reason: string): Plan | undefined {
    const plan = this.plans.get(id);
    if (!plan) return undefined;

    const now = new Date().toISOString();
    plan.status = 'failed';
    plan.updatedAt = now;
    plan.failReason = reason;
    plan.steps = plan.steps.map(s => ({
      ...s,
      status: s.status === 'active' ? 'failed' : s.status,
    }));

    const event: PlanEvent = { planId: id, action: 'failed', timestamp: now, details: reason };
    this.history.push(event);
    this.emit(event);
    return plan;
  }

  listPlans(status?: PlanStatus): Plan[] {
    const all = Array.from(this.plans.values());
    if (status) {
      return all.filter(p => p.status === status);
    }
    return all;
  }

  validatePlan(id: string): PlanValidation {
    const plan = this.plans.get(id);
    if (!plan) {
      return { valid: false, errors: ['Plan not found'], rules: ['plan-exists'] };
    }

    const errors: string[] = [];
    const rules: string[] = ['plan-exists', 'has-steps', 'valid-status', 'ordered-steps'];

    if (!plan.name || plan.name.trim().length === 0) {
      errors.push('Plan name is required');
    }

    if (!plan.steps || plan.steps.length === 0) {
      errors.push('Plan must have at least one step');
    }

    if (!['draft', 'active', 'completed', 'failed', 'cancelled'].includes(plan.status)) {
      errors.push(`Invalid plan status: ${plan.status}`);
    }

    for (let i = 0; i < plan.steps.length; i++) {
      if (plan.steps[i].order !== i) {
        errors.push(`Step ${i} has incorrect order (expected ${i}, got ${plan.steps[i].order})`);
        break;
      }
    }

    return { valid: errors.length === 0, errors, rules };
  }

  addEventListener(callback: (event: PlanEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  async save(filePath?: string): Promise<void> {
    const target = filePath || this.persistPath;
    if (!target) throw new Error('No persist path configured');

    const data = JSON.stringify({
      plans: Array.from(this.plans.entries()),
      history: this.history,
    }, null, 2);

    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, data, 'utf-8');
  }

  async load(filePath?: string): Promise<void> {
    const target = filePath || this.persistPath;
    if (!target) throw new Error('No persist path configured');

    const raw = await fs.promises.readFile(target, 'utf-8');
    const data = JSON.parse(raw);

    this.plans = new Map(data.plans);
    this.history = data.history;
  }
}
