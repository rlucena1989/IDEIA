import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { AgentCoordinator } from './agent-coordinator';

export interface PlannedStep {
  id: string;
  description: string;
  agentRole: string;
  dependsOn: string[];
  estimatedMinutes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlannedStep[];
  artifacts: string[];
  estimatedEffort: number;
  status: 'draft' | 'reviewed' | 'approved' | 'rejected' | 'executing' | 'completed';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface PlannerExecutorConfig {
  requireApproval: boolean;
  autoExecute: boolean;
  maxPlanSteps: number;
}

const DEFAULT_CONFIG: PlannerExecutorConfig = {
  requireApproval: true,
  autoExecute: false,
  maxPlanSteps: 10,
};

function detectAgentRole(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes('analys') || lower.includes('requirement') || lower.includes('understand')) return 'analyst';
  if (lower.includes('architect') || lower.includes('design') || lower.includes('structure')) return 'architect';
  if (lower.includes('implement') || lower.includes('code') || lower.includes('develop') || lower.includes('program')) return 'programmer';
  if (lower.includes('review') || lower.includes('inspect') || lower.includes('audit')) return 'reviewer';
  if (lower.includes('test') || lower.includes('coverage') || lower.includes('verify')) return 'tester';
  if (lower.includes('deploy') || lower.includes('devops') || lower.includes('infrastructure')) return 'devops';
  return 'programmer';
}

function decomposeGoal(goal: string, maxSteps: number): Omit<PlannedStep, 'id'>[] {
  const rawSteps: Omit<PlannedStep, 'id'>[] = [];
  const sentences = goal.split(/[.\n;]+/).map(s => s.trim()).filter(s => s.length > 10);

  for (let i = 0; i < Math.min(sentences.length, maxSteps); i++) {
    const desc = sentences[i];
    const role = detectAgentRole(desc);
    rawSteps.push({
      description: desc,
      agentRole: role,
      dependsOn: [],
      estimatedMinutes: 15,
      status: 'pending',
    });
  }

  if (rawSteps.length === 0) {
    rawSteps.push(
      { description: `Analyze requirements: ${goal}`, agentRole: 'analyst', dependsOn: [], estimatedMinutes: 15, status: 'pending' },
      { description: `Design solution: ${goal}`, agentRole: 'architect', dependsOn: [], estimatedMinutes: 15, status: 'pending' },
      { description: `Implement solution: ${goal}`, agentRole: 'programmer', dependsOn: [], estimatedMinutes: 30, status: 'pending' },
    );
  }

  return rawSteps;
}

export class PlannerExecutorPipeline {
  private plans: Map<string, Plan> = new Map();
  private config: PlannerExecutorConfig;

  constructor(config: Partial<PlannerExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  createPlan(goal: string, _context?: Record<string, unknown>): Plan {
    const id = randomUUID();
    const rawSteps = decomposeGoal(goal, this.config.maxPlanSteps);
    const steps: PlannedStep[] = rawSteps.map((s, i) => ({
      ...s,
      id: `step_${i + 1}`,
      dependsOn: i > 0 ? [`step_${i}`] : [],
    }));

    const estimatedEffort = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);

    const plan: Plan = {
      id,
      goal,
      steps,
      artifacts: [],
      estimatedEffort,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    this.plans.set(id, plan);
    return { ...plan };
  }

  reviewPlan(planId: string, _reviewer: string): Plan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    if (plan.status !== 'draft') throw new Error(`Cannot review plan in status: ${plan.status}`);

    plan.status = 'reviewed';
    return { ...plan };
  }

  approvePlan(planId: string, reviewer: string): Plan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    if (plan.status !== 'reviewed') throw new Error(`Cannot approve plan in status: ${plan.status}`);

    plan.status = 'approved';
    plan.approvedAt = new Date().toISOString();
    plan.approvedBy = reviewer;
    return { ...plan };
  }

  rejectPlan(planId: string, reviewer: string, _reason: string): Plan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    plan.status = 'rejected';
    plan.approvedBy = reviewer;
    return { ...plan };
  }

  async executePlan(planId: string, coordinator: AgentCoordinator): Promise<Plan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    if (this.config.requireApproval && plan.status !== 'approved') {
      throw new Error(`Plan must be approved before execution. Current status: ${plan.status}`);
    }

    plan.status = 'executing';

    const executed = new Set<string>();

    while (executed.size < plan.steps.length) {
      let progress = false;

      for (const step of plan.steps) {
        if (executed.has(step.id)) continue;

        const depsMet = step.dependsOn.every(dep => executed.has(dep));
        if (!depsMet) continue;

        progress = true;
        step.status = 'in_progress';

        try {
          const result = await coordinator.executePipeline(
            [step.agentRole],
            { goal: plan.goal, step: step.description }
          );
          step.status = 'completed';
          executed.add(step.id);
          if (result.results?.[step.agentRole]) {
            plan.artifacts.push(JSON.stringify(result.results[step.agentRole]));
          }
        } catch (_err) {
          step.status = 'failed';
          executed.add(step.id);
        }
      }

      if (!progress) break;
    }

    plan.status = 'completed';
    return { ...plan };
  }

  getPlan(planId: string): Plan | undefined {
    const plan = this.plans.get(planId);
    return plan ? { ...plan } : undefined;
  }

  listPlans(status?: Plan['status']): Plan[] {
    const all = Array.from(this.plans.values());
    if (status) return all.filter(p => p.status === status).map(p => ({ ...p }));
    return all.map(p => ({ ...p }));
  }
}

export function createPlannerExecutorPipeline(config?: Partial<PlannerExecutorConfig>): PlannerExecutorPipeline {
  return new PlannerExecutorPipeline(config);
}
