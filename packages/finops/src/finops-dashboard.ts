import { CostTracker } from './cost-tracker';
import { createLogger } from '@ideia/logger';
import { BudgetManager } from './budget-manager';
import { CostAnomalyDetector } from './cost-anomaly-detector';
import { ResourceOptimizer } from './resource-optimizer';
import { CostAllocationEngine } from './cost-allocation-engine';
import { CostForecast, ShowbackReport, CostRecord } from './types';
const logger = createLogger('finops-dashboard');

export interface DashboardData {
  totalSpend: number;
  budgetUtilization: number;
  dailyAverage: number;
  weeklyTrend: number;
  activeAlerts: number;
  anomalies: number;
  forecast: CostForecast | null;
  spendBySource: Record<string, number>;
  spendByProject: Record<string, number>;
  topRecommendations: Array<{ title: string; savings: number }>;
}

export class FinOpsDashboard {
  constructor(
    private _costTracker: CostTracker,
    private _budgetManager: BudgetManager,
    private _anomalyDetector: CostAnomalyDetector,
    private _resourceOptimizer: ResourceOptimizer,
    private _allocationEngine: CostAllocationEngine,
  ) {}

  getSummary(): DashboardData {
    const totalSpend = this._costTracker.getTotalCost();
    const dailyAverage = this._costTracker.getDailyAverage(30);
    const weeklyTotals = this._costTracker.getDailyTotals(14);
    const weeklyAvg = weeklyTotals.length > 0
      ? weeklyTotals.reduce((s, v) => s + v, 0) / weeklyTotals.length
      : 0;
    const prevWeekTotals = weeklyTotals.slice(0, 7);
    const currWeekTotals = weeklyTotals.slice(7);
    const prevAvg = prevWeekTotals.length > 0
      ? prevWeekTotals.reduce((s, v) => s + v, 0) / prevWeekTotals.length
      : 0;
    const currAvg = currWeekTotals.length > 0
      ? currWeekTotals.reduce((s, v) => s + v, 0) / currWeekTotals.length
      : 0;
    const weeklyTrend = prevAvg > 0 ? (currAvg - prevAvg) / prevAvg : 0;
    const totalBudget = this._budgetManager.getTotalBudget();
    const totalSpent = this._budgetManager.getTotalSpent();
    const budgetUtilization = totalBudget > 0 ? totalSpent / totalBudget : 0;

    const records = this._costTracker.getRecords(1000);
    const anomalies = this._anomalyDetector.detect(records);
    const recommendations = this._resourceOptimizer.getAllRecommendations();

    return {
      totalSpend,
      budgetUtilization,
      dailyAverage,
      weeklyTrend,
      activeAlerts: this._budgetManager.getUnacknowledgedAlerts().length,
      anomalies: anomalies.length,
      forecast: null,
      spendBySource: this._costTracker.getCostBySource(),
      spendByProject: this._costTracker.getCostByProject(),
      topRecommendations: recommendations.slice(0, 5).map(r => ({
        title: r.title,
        savings: r.estimatedSavings,
      })),
    };
  }

  getCostBreakdown(records: CostRecord[]): ShowbackReport {
    return {
      period: 'current',
      generatedAt: new Date(),
      projects: [],
      totalCost: this._costTracker.getTotalCost(),
      savings: 0,
    };
  }

  getTrendData(days: number): Array<{ date: string; total: number }> {
    const totals = this._costTracker.getDailyTotals(days);
    const now = new Date();
    return totals.map((total, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
      return { date: date.toISOString().slice(0, 10), total };
    });
  }

  refresh(): void {}
}
