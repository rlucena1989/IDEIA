import { ShowbackReport, CostRecord, BudgetAllocation } from './types';
import { createLogger } from '@ideia/logger';
import { CostAllocationEngine } from './cost-allocation-engine';
import { BudgetManager } from './budget-manager';
const logger = createLogger('showback-report-generator');

export class ShowbackReportGenerator {
  constructor(
    private _allocationEngine: CostAllocationEngine,
    private _budgetManager: BudgetManager,
  ) {}

  async generate(records: CostRecord[], period: string): Promise<ShowbackReport> {
    const report = await this._allocationEngine.generateShowbackReport(records, period);
    const enriched = report.projects.map(p => {
      const budget = this._budgetManager.getBudget(p.project);
      return {
        ...p,
        trend: this._calculateTrend(records, p.project),
        budgetUtilization: budget ? budget.spent / Math.max(1, budget.total) : 0,
      };
    });
    return {
      ...report,
      projects: enriched,
      generatedAt: new Date(),
    };
  }

  async generateBySource(records: CostRecord[], period: string): Promise<ShowbackReport> {
    const report = await this.generate(records, period);
    return {
      ...report,
      projects: report.projects.map(p => ({
        ...p,
        bySource: this._aggregateBySource(records, p.project),
      })),
    };
  }

  async generateByProvider(records: CostRecord[], period: string): Promise<ShowbackReport> {
    const report = await this.generate(records, period);
    return {
      ...report,
      projects: report.projects.map(p => ({
        ...p,
        byProvider: this._aggregateByProvider(records, p.project),
      })),
    };
  }

  async generateExecutiveSummary(records: CostRecord[], period: string): Promise<{
    totalCost: number;
    totalSavings: number;
    projectsOverBudget: number;
    topSpenders: Array<{ project: string; cost: number }>;
    anomalies: number;
  }> {
    const report = await this.generate(records, period);
    const sortedByCost = [...report.projects].sort((a, b) => b.totalCost - a.totalCost);
    const overBudget = report.projects.filter(p => p.budgetUtilization > 1);
    return {
      totalCost: report.totalCost,
      totalSavings: report.savings,
      projectsOverBudget: overBudget.length,
      topSpenders: sortedByCost.slice(0, 5).map(p => ({ project: p.project, cost: p.totalCost })),
      anomalies: 0,
    };
  }

  toCSV(report: ShowbackReport): string {
    const header = 'Project,TotalCost,Source,BudgetUtilization,Trend';
    const rows = report.projects.flatMap(p =>
      Object.entries(p.bySource).map(([source, cost]) =>
        `${p.project},${cost.toFixed(2)},${source},${(p.budgetUtilization * 100).toFixed(1)}%,${(p.trend * 100).toFixed(1)}%`,
      ),
    );
    return [header, ...rows].join('\n');
  }

  toJSON(report: ShowbackReport): string {
    return JSON.stringify(report, null, 2);
  }

  private _calculateTrend(records: CostRecord[], project: string): number {
    const projectRecords = records.filter(r => r.project === project);
    if (projectRecords.length < 7) return 0;
    const recent = projectRecords.slice(-7);
    const first = recent[0]?.amount ?? 0;
    const last = recent[recent.length - 1]?.amount ?? 0;
    return first > 0 ? (last - first) / first : 0;
  }

  private _aggregateBySource(records: CostRecord[], project: string): Record<string, number> {
    return records
      .filter(r => r.project === project)
      .reduce((acc, r) => {
        acc[r.source] = (acc[r.source] ?? 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);
  }

  private _aggregateByProvider(records: CostRecord[], project: string): Record<string, number> {
    return records
      .filter(r => r.project === project)
      .reduce((acc, r) => {
        acc[r.provider] = (acc[r.provider] ?? 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);
  }
}
