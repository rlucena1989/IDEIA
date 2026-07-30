import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
import { BudgetAllocation, BudgetCategory, BudgetAlert, BudgetPeriod, CostRecord } from './types';
const logger = createLogger('budget-manager');

export class BudgetManager extends EventEmitter {
  private _budgets: Map<string, BudgetAllocation> = new Map();
  private _alertCooldownMs: number;

  constructor(alertCooldownMs = 3600000) {
    super();
    this._alertCooldownMs = alertCooldownMs;
  }

  setBudget(allocation: BudgetAllocation): void {
    this._budgets.set(allocation.project, allocation);
    this.emit('budget-set', allocation);
  }

  getBudget(project: string): BudgetAllocation | undefined {
    return this._budgets.get(project);
  }

  removeBudget(project: string): boolean {
    return this._budgets.delete(project);
  }

  getAllBudgets(): BudgetAllocation[] {
    return Array.from(this._budgets.values());
  }

  async recordCost(record: CostRecord): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const budget = this._budgets.get(record.project);
    if (!budget) return alerts;

    budget.spent += record.amount;
    budget.remaining = budget.total - budget.spent;

    const utilization = budget.spent / budget.total;
    const categoryAlert = this._checkCategoryAlerts(budget, record);
    if (categoryAlert) alerts.push(categoryAlert);

    if (utilization >= 0.9) {
      const alert = this._createAlert('critical', record.project, utilization);
      if (alert) {
        budget.alerts.push(alert);
        alerts.push(alert);
        this.emit('budget-alert', alert);
      }
    } else if (utilization >= 0.75) {
      const alert = this._createAlert('warning', record.project, utilization);
      if (alert) {
        budget.alerts.push(alert);
        alerts.push(alert);
        this.emit('budget-alert', alert);
      }
    }

    return alerts;
  }

  getBudgetStatus(project: string): { utilization: number; projectedUtilization: number; daysRemaining: number } | null {
    const budget = this._budgets.get(project);
    if (!budget) return null;
    const now = new Date();
    const total = budget.endDate.getTime() - budget.startDate.getTime();
    const elapsed = now.getTime() - budget.startDate.getTime();
    const daysRemaining = Math.ceil((total - elapsed) / 86400000);
    const periodProgress = Math.min(1, Math.max(0, elapsed / total));
    const utilization = budget.total > 0 ? budget.spent / budget.total : 0;
    const expectedSpend = budget.total * Math.min(1, periodProgress);
    const projectedUtilization = expectedSpend > 0 ? budget.spent / expectedSpend : 0;
    return { utilization, projectedUtilization, daysRemaining: Math.max(0, daysRemaining) };
  }

  getTotalBudget(): number {
    return Array.from(this._budgets.values()).reduce((s, b) => s + b.total, 0);
  }

  getTotalSpent(): number {
    return Array.from(this._budgets.values()).reduce((s, b) => s + b.spent, 0);
  }

  getUnacknowledgedAlerts(): BudgetAlert[] {
    return Array.from(this._budgets.values()).flatMap(b => b.alerts.filter(a => !a.acknowledged));
  }

  acknowledgeAlert(project: string, alertIndex: number): void {
    const budget = this._budgets.get(project);
    if (budget && budget.alerts[alertIndex]) {
      budget.alerts[alertIndex].acknowledged = true;
    }
  }

  reset(project: string): void {
    const budget = this._budgets.get(project);
    if (budget) {
      budget.spent = 0;
      budget.remaining = budget.total;
      budget.alerts = [];
    }
  }

  private _checkCategoryAlerts(budget: BudgetAllocation, record: CostRecord): BudgetAlert | null {
    for (const cat of budget.categories) {
      if (cat.spent > cat.allocated * cat.threshold) {
        return {
          type: cat.spent > cat.allocated ? 'exceeded' : 'warning',
          message: `Category "${cat.name}" over threshold: ${cat.spent}/${cat.allocated}`,
          threshold: cat.allocated * cat.threshold,
          currentValue: cat.spent,
          timestamp: new Date(),
          acknowledged: false,
        };
      }
    }
    return null;
  }

  private _createAlert(type: 'warning' | 'critical', project: string, utilization: number): BudgetAlert | null {
    const lastAlert = this._getLastAlert(project, type);
    if (lastAlert && (Date.now() - lastAlert.timestamp.getTime()) < this._alertCooldownMs) {
      return null;
    }
    return {
      type,
      message: `Budget ${type}: ${project} at ${(utilization * 100).toFixed(1)}%`,
      threshold: type === 'critical' ? 0.9 : 0.75,
      currentValue: utilization,
      timestamp: new Date(),
      acknowledged: false,
    };
  }

  private _getLastAlert(project: string, type: string): BudgetAlert | undefined {
    const budget = this._budgets.get(project);
    if (!budget) return undefined;
    return [...budget.alerts].reverse().find(a => a.type === type);
  }
}
