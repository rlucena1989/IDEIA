import { TokenBudget, ComplexityLevel, TaskType } from '../types';
export declare class BudgetManager {
    private defaultBudgets;
    private budgets;
    private customBudgets;
    constructor(defaultBudgets?: Record<ComplexityLevel, number>);
    getBudget(taskType: TaskType, level: ComplexityLevel): TokenBudget;
    setCustomBudget(taskType: TaskType, budget: Partial<TokenBudget>): void;
    estimateTaskTokens(taskType: TaskType, level: ComplexityLevel): number;
}
//# sourceMappingURL=token-budget.d.ts.map