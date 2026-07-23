export interface BudgetConfig { metrics: { name: string; type: 'latency'|'size'|'memory'|'calls'; budget: number; unit: string; severity: 'warn'|'fail' }[]; }
export interface MetricSnapshot { name: string; value: number; timestamp: string; tags: Record<string,string>; }
export interface BudgetCheckResult { metric: string; value: number; budget: number; passed: boolean; severity: string; }
export interface PerformanceReport { totalChecks: number; passed: number; failed: number; results: BudgetCheckResult[]; score: number; }
