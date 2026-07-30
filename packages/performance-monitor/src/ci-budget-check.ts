import { writeFileSync, mkdirSync, existsSync} from 'fs';
import { join } from 'path';
import { BundleAnalyzer} from './bundle-analyzer';
import { createLogger } from '@ideia/logger';

const logger = createLogger('performance-monitor:ci-budget-check');

export interface BudgetDefinition {
  label: string;
  metric: string;
  current: number;
  target: number;
  unit: string;
  severity: 'warn' | 'fail';
}

export interface BudgetCheckReport {
  passed: boolean;
  timestamp: string;
  budgets: BudgetDefinition[];
  violations: string[];
  score: number;
}

const DEFAULT_BUDGETS: Omit<BudgetDefinition, 'current'>[] = [
  { label: 'Bundle (gzip)', metric: 'bundle_gzip', target: 2.5, unit: 'MB', severity: 'fail' },
  { label: 'Bundle (brotli)', metric: 'bundle_brotli', target: 1.8, unit: 'MB', severity: 'fail' },
  { label: 'Startup (cold)', metric: 'startup_cold', target: 2000, unit: 'ms', severity: 'fail' },
  { label: 'Startup (warm)', metric: 'startup_warm', target: 1000, unit: 'ms', severity: 'warn' },
  { label: 'TTFT (local)', metric: 'ttft_local', target: 500, unit: 'ms', severity: 'fail' },
  { label: 'TTFT (cloud)', metric: 'ttft_cloud', target: 200, unit: 'ms', severity: 'fail' },
  { label: 'Memory (idle)', metric: 'memory_idle', target: 200, unit: 'MB', severity: 'fail' },
  { label: 'Search P99', metric: 'search_p99', target: 100, unit: 'ms', severity: 'fail' },
  { label: 'Editor scroll FPS', metric: 'scroll_fps', target: 55, unit: 'fps', severity: 'warn' },
  { label: 'LSP hover P99', metric: 'lsp_hover', target: 100, unit: 'ms', severity: 'warn' },
  { label: 'Event delivery P99', metric: 'event_delivery', target: 5, unit: 'ms', severity: 'warn' },
  { label: 'Build time', metric: 'build_time', target: 45000, unit: 'ms', severity: 'warn' },
  { label: 'Test suite', metric: 'test_suite', target: 60000, unit: 'ms', severity: 'warn' },
  { label: 'Large file open', metric: 'large_file_open', target: 300, unit: 'ms', severity: 'warn' },
];

export class CiBudgetChecker {
  private budgets: Omit<BudgetDefinition, 'current'>[];
  private resultsDir: string;

  constructor(budgets?: Omit<BudgetDefinition, 'current'>[], resultsDir?: string) {
    this.budgets = budgets || DEFAULT_BUDGETS;
    this.resultsDir = resultsDir || join(process.cwd(), '.benchmark-results');
  }

  async check(metrics: Record<string, number>): Promise<BudgetCheckReport> {
    const budgets: BudgetDefinition[] = this.budgets.map(b => ({
      ...b,
      current: metrics[b.metric] ?? -1,
    }));

    const violations: string[] = [];
    for (const b of budgets) {
      if (b.current < 0) continue;
      if (b.current > b.target) {
        violations.push(`${b.label}: ${b.current}${b.unit} exceeds budget ${b.target}${b.unit}`);
      }
    }

    const passed = violations.length === 0;
    const passing = budgets.filter(b => b.current >= 0 && b.current <= b.target).length;
    const total = budgets.filter(b => b.current >= 0).length;
    const score = total > 0 ? Math.round((passing / total) * 100) : 0;

    const report: BudgetCheckReport = {
      passed,
      timestamp: new Date().toISOString(),
      budgets,
      violations,
      score,
    };

    await this.saveReport(report);
    return report;
  }

  async analyzeBundleAndCheck(): Promise<BudgetCheckReport> {
    const analyzer = new BundleAnalyzer(process.cwd());
    const bundle = await analyzer.analyze();
    const metrics: Record<string, number> = {
      bundle_gzip: this.bytesToMB(bundle.totalGzip),
      bundle_brotli: this.bytesToMB(bundle.totalBrotli),
    };
    return this.check(metrics);
  }

  private async saveReport(report: BudgetCheckReport): Promise<void> {
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
    const baselinePath = join(this.resultsDir, 'budget-check.json');
    writeFileSync(baselinePath, JSON.stringify(report, null, 2));
    logger.info(`Budget check saved to ${baselinePath}`);
  }

  private bytesToMB(bytes: number): number {
    return Math.round((bytes / 1024 / 1024) * 100) / 100;
  }
}

export function createCiBudgetChecker(budgets?: Omit<BudgetDefinition, 'current'>[], resultsDir?: string): CiBudgetChecker {
  return new CiBudgetChecker(budgets, resultsDir);
}
