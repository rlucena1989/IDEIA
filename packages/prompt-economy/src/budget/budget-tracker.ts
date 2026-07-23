import { BudgetAllocation, TokenBudget } from '../types';

export class BudgetTracker {
  private allocations: Map<string, BudgetAllocation> = new Map();
  private stageBudgets: Map<string, Map<string, number>> = new Map();

  allocate(taskId: string, budget: TokenBudget): BudgetAllocation {
    const allocation: BudgetAllocation = {
      taskId,
      budget,
      spent: 0,
      startedAt: new Date().toISOString(),
      stageBudgets: {},
    };
    this.allocations.set(taskId, allocation);
    return { ...allocation };
  }

  spend(taskId: string, tokens: number, stage?: string): void {
    const allocation = this.allocations.get(taskId);
    if (!allocation) throw new Error(`No allocation for task: ${taskId}`);

    allocation.spent += tokens;

    if (stage) {
      if (!allocation.stageBudgets[stage]) {
        allocation.stageBudgets[stage] = 0;
      }
      allocation.stageBudgets[stage] += tokens;
    }
  }

  getRemaining(taskId: string): number {
    const allocation = this.allocations.get(taskId);
    if (!allocation) return 0;
    return Math.max(0, allocation.budget.maxTokens - allocation.spent);
  }

  getSpent(taskId: string): number {
    return this.allocations.get(taskId)?.spent ?? 0;
  }

  isExhausted(taskId: string): boolean {
    const allocation = this.allocations.get(taskId);
    if (!allocation) return false;
    return allocation.spent >= allocation.budget.hardLimit;
  }

  isWarning(taskId: string): boolean {
    const allocation = this.allocations.get(taskId);
    if (!allocation) return false;
    const threshold = allocation.budget.maxTokens * allocation.budget.warningThreshold;
    return allocation.spent >= threshold;
  }

  getUsageReport(taskId: string): { spent: number; remaining: number; pctUsed: number; stages: Record<string, number> } | null {
    const allocation = this.allocations.get(taskId);
    if (!allocation) return null;

    return {
      spent: allocation.spent,
      remaining: this.getRemaining(taskId),
      pctUsed: allocation.budget.maxTokens > 0
        ? Math.round((allocation.spent / allocation.budget.maxTokens) * 100)
        : 0,
      stages: allocation.stageBudgets,
    };
  }

  reset(taskId: string): void {
    this.allocations.delete(taskId);
  }

  resetAll(): void {
    this.allocations.clear();
  }
}
