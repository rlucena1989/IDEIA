"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetManager = void 0;
const DEFAULT_BUDGET_BY_LEVEL = {
    N0: 500,
    N1: 2000,
    N2: 4000,
    N3: 8000,
    N4: 15000,
    N5: 25000,
};
class BudgetManager {
    defaultBudgets;
    budgets = new Map();
    customBudgets = new Map();
    constructor(defaultBudgets = DEFAULT_BUDGET_BY_LEVEL) {
        this.defaultBudgets = defaultBudgets;
    }
    getBudget(taskType, level) {
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
    setCustomBudget(taskType, budget) {
        this.customBudgets.set(taskType, budget);
    }
    estimateTaskTokens(taskType, level) {
        const base = this.defaultBudgets[level] ?? 4000;
        const multipliers = {
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
exports.BudgetManager = BudgetManager;
//# sourceMappingURL=token-budget.js.map