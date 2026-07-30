import { BudgetCheckResult, BudgetConfig, MetricSnapshot, PerformanceReport } from './types';
import { createLogger } from '@ideia/logger';
const DEFAULT_BUDGET: BudgetConfig = { metrics: [
  { name: 'bundle_size', type: 'size', budget: 500000, unit: 'bytes', severity: 'fail' },
  { name: 'api_latency', type: 'latency', budget: 500, unit: 'ms', severity: 'warn' },
  { name: 'llm_latency', type: 'latency', budget: 10000, unit: 'ms', severity: 'warn' },
  { name: 'file_read_latency', type: 'latency', budget: 100, unit: 'ms', severity: 'warn' },
  { name: 'memory_usage', type: 'memory', budget: 200, unit: 'MB', severity: 'fail' },
] };
export class PerformanceMonitor {
  private budget: BudgetConfig;
  private history: MetricSnapshot[] = [];
  private maxHistory = 10000;
  constructor(customBudget?: BudgetConfig) { this.budget = customBudget || JSON.parse(JSON.stringify(DEFAULT_BUDGET)); }
  setBudget(metricName: string, budgetValue: number): boolean {
    const m = this.budget.metrics.find(m => m.name === metricName);
    if (!m) return false; m.budget = budgetValue; return true;
  }
  resetBudget(): void { this.budget = JSON.parse(JSON.stringify(DEFAULT_BUDGET)); }
  recordMetric(name: string, value: number, tags: Record<string,string> = {}): void {
    this.history.push({ name, value, timestamp: new Date().toISOString(), tags });
    if (this.history.length > this.maxHistory) this.history.shift();
  }
  checkBudget(name: string, value: number): BudgetCheckResult | null {
    const metric = this.budget.metrics.find(m => m.name === name);
    if (!metric) return null;
    const passed = value <= metric.budget;
    return { metric: name, value, budget: metric.budget, passed, severity: metric.severity };
  }
  checkAll(): PerformanceReport {
    const results: BudgetCheckResult[] = [];
    for (const m of this.budget.metrics) {
      const recent = this.history.filter(h => h.name === m.name).slice(-5);
      const avg = recent.length > 0 ? recent.reduce((s, h) => s + h.value, 0) / recent.length : 0;
      results.push({ metric: m.name, value: Math.round(avg * 100) / 100, budget: m.budget, passed: avg <= m.budget, severity: m.severity });
    }
    const passed = results.filter(r => r.passed).length;
    return { totalChecks: results.length, passed, failed: results.length - passed, results, score: Math.round(passed / results.length * 100) };
  }
  getMetricHistory(name: string): MetricSnapshot[] { return this.history.filter(h => h.name === name); }
  getBudget(): BudgetConfig { return { ...this.budget, metrics: [...this.budget.metrics] }; }
}
export function createPerformanceMonitor(customBudget?: BudgetConfig): PerformanceMonitor { return new PerformanceMonitor(customBudget); }
