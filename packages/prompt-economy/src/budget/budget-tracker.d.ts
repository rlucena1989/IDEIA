import { BudgetAllocation, TokenBudget } from '../types';
export declare class BudgetTracker {
    private allocations;
    private stageBudgets;
    allocate(taskId: string, budget: TokenBudget): BudgetAllocation;
    spend(taskId: string, tokens: number, stage?: string): void;
    getRemaining(taskId: string): number;
    getSpent(taskId: string): number;
    isExhausted(taskId: string): boolean;
    isWarning(taskId: string): boolean;
    getUsageReport(taskId: string): {
        spent: number;
        remaining: number;
        pctUsed: number;
        stages: Record<string, number>;
    } | null;
    reset(taskId: string): void;
    resetAll(): void;
}
//# sourceMappingURL=budget-tracker.d.ts.map