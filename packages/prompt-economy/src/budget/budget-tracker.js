"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetTracker = void 0;
class BudgetTracker {
    allocations = new Map();
    stageBudgets = new Map();
    allocate(taskId, budget) {
        const allocation = {
            taskId,
            budget,
            spent: 0,
            startedAt: new Date().toISOString(),
            stageBudgets: {},
        };
        this.allocations.set(taskId, allocation);
        return { ...allocation };
    }
    spend(taskId, tokens, stage) {
        const allocation = this.allocations.get(taskId);
        if (!allocation)
            throw new Error(`No allocation for task: ${taskId}`);
        allocation.spent += tokens;
        if (stage) {
            if (!allocation.stageBudgets[stage]) {
                allocation.stageBudgets[stage] = 0;
            }
            allocation.stageBudgets[stage] += tokens;
        }
    }
    getRemaining(taskId) {
        const allocation = this.allocations.get(taskId);
        if (!allocation)
            return 0;
        return Math.max(0, allocation.budget.maxTokens - allocation.spent);
    }
    getSpent(taskId) {
        return this.allocations.get(taskId)?.spent ?? 0;
    }
    isExhausted(taskId) {
        const allocation = this.allocations.get(taskId);
        if (!allocation)
            return false;
        return allocation.spent >= allocation.budget.hardLimit;
    }
    isWarning(taskId) {
        const allocation = this.allocations.get(taskId);
        if (!allocation)
            return false;
        const threshold = allocation.budget.maxTokens * allocation.budget.warningThreshold;
        return allocation.spent >= threshold;
    }
    getUsageReport(taskId) {
        const allocation = this.allocations.get(taskId);
        if (!allocation)
            return null;
        return {
            spent: allocation.spent,
            remaining: this.getRemaining(taskId),
            pctUsed: allocation.budget.maxTokens > 0
                ? Math.round((allocation.spent / allocation.budget.maxTokens) * 100)
                : 0,
            stages: allocation.stageBudgets,
        };
    }
    reset(taskId) {
        this.allocations.delete(taskId);
    }
    resetAll() {
        this.allocations.clear();
    }
}
exports.BudgetTracker = BudgetTracker;
//# sourceMappingURL=budget-tracker.js.map