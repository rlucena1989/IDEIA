import { TokenBudget, ComplexityLevel, TaskType } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('token-budget');

const DEFAULT_BUDGET_BY_LEVEL: Record<ComplexityLevel, number> = {
  N0: 500,
  N1: 2000,
  N2: 4000,
  N3: 8000,
  N4: 15000,
  N5: 25000,
};

export class BudgetManager {
  private budgets: Map<string, TokenBudget> = new Map();
  private customBudgets: Map<TaskType, Partial<TokenBudget>> = new Map();

  constructor(private defaultBudgets: Record<ComplexityLevel, number> = DEFAULT_BUDGET_BY_LEVEL) {}

  getBudget(taskType: TaskType, level: ComplexityLevel): TokenBudget {
    const maxTokens = this.defaultBudgets[level] ?? 4000;
    const custom = this.customBudgets.get(taskType);

    return {
      taskType,
      complexityLevel: level,
      maxTokens: custom?.maxTokens ?? maxTokens,
      warningThreshold: custom?.warningThreshold ?? 0.8,
      hardLimit: custom?.hardLimit ?? maxTokens * 1.5,
    };
  }

  setCustomBudget(taskType: TaskType, budget: Partial<TokenBudget>): void {
    this.customBudgets.set(taskType, budget);
  }

  estimateTaskTokens(taskType: TaskType, level: ComplexityLevel): number {
    const base = this.defaultBudgets[level] ?? 4000;

    const multipliers: Record<string, number> = {
      feature: 1.0,
      bugfix: 0.8,
      refactor: 0.9,
      test: 0.6,
      documentation: 0.5,
      devops: 0.7,
      review: 0.4,
      question: 0.2,
      unknown: 0.5,
    };

    return Math.round(base * (multipliers[taskType] ?? 0.5));
  }
}
