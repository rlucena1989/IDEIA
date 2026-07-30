import { readFileSync, existsSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

interface BundleBudget {
  maxSizeKb: number; currentSizeKb: number; warnThreshold: number;
}

interface PerformanceBudget {
  bundles: Record<string, BundleBudget>;
  metrics: Record<string, Record<string, number>>;
  budgets: Record<string, Record<string, number | string>>;
  history: Array<{ date: string; bundleKb: number; note: string }>;
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  current: number;
  limit: number;
  type: 'bundle' | 'metric' | 'budget';
}

function loadBudget(): PerformanceBudget {
  const path = resolve(ROOT, 'performance-budget.json');
  if (!existsSync(path)) {
    console.error('performance-budget.json not found');
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function measureBundle(name: string): number {
  const bundlePaths: Record<string, string> = {
    cli: 'packages/cli/dist/index.js',
    plugin: 'packages/ideia-plugin/lib/bundle.js',
    'event-bus': 'packages/event-bus/dist/index.js',
  };
  const relPath = bundlePaths[name];
  if (!relPath) return 0;
  const fullPath = resolve(ROOT, relPath);
  if (!existsSync(fullPath)) {
    if (name === 'plugin') {
      const alt = resolve(ROOT, 'packages/ideia-plugin/src/browser/ideia-frontend-module.ts');
      if (!existsSync(alt)) return 0;
      return Math.round(statSync(alt).size / 1024);
    }
    return 0;
  }
  return Math.round(statSync(fullPath).size / 1024);
}

function updateBudgetWithMeasurements(budget: PerformanceBudget): void {
  for (const [name, bundleBudget] of Object.entries(budget.bundles)) {
    const measured = measureBundle(name);
    if (measured > 0) bundleBudget.currentSizeKb = measured;
  }
  const budgetPath = resolve(ROOT, 'performance-budget.json');
  writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
}

function checkBundleSize(name: string, b: BundleBudget): CheckResult {
  const pct = (b.currentSizeKb / b.maxSizeKb) * 100;
  const passed = b.currentSizeKb <= b.maxSizeKb;
  const flag = b.currentSizeKb > b.maxSizeKb ? 'EXCEEDED' : pct > b.warnThreshold * 100 ? 'NEAR_LIMIT' : 'OK';
  return {
    name, passed, type: 'bundle',
    current: b.currentSizeKb, limit: b.maxSizeKb,
    message: `${name}: ${b.currentSizeKb}KB / ${b.maxSizeKb}KB (${pct.toFixed(1)}%) — ${flag}`,
  };
}

function checkMetrics(budget: PerformanceBudget): CheckResult[] {
  const results: CheckResult[] = [];
  for (const [name, thresholds] of Object.entries(budget.metrics)) {
    if (thresholds.maxMs !== undefined) {
      const current = (thresholds as Record<string, number>).currentMs ?? 0;
      const passed = current <= thresholds.maxMs;
      results.push({
        name: `metric.${name}`, passed, type: 'metric',
        current, limit: thresholds.maxMs,
        message: `${name}: ${current}ms / ${thresholds.maxMs}ms — ${passed ? 'OK' : 'EXCEEDED'}`,
      });
    }
    if (thresholds.minPerSecond !== undefined) {
      const current = (thresholds as Record<string, number>).currentTps ?? 0;
      const passed = current >= thresholds.minPerSecond;
      results.push({
        name: `metric.${name}`, passed, type: 'metric',
        current, limit: thresholds.minPerSecond,
        message: `${name}: ${current} tps / ${thresholds.minPerSecond} tps — ${passed ? 'OK' : 'BELOW_MIN'}`,
      });
    }
    if (thresholds.maxMb !== undefined) {
      const current = (thresholds as Record<string, number>).currentMb ?? 0;
      const passed = current <= thresholds.maxMb;
      results.push({
        name: `metric.${name}`, passed, type: 'metric',
        current, limit: thresholds.maxMb,
        message: `${name}: ${current}MB / ${thresholds.maxMb}MB — ${passed ? 'OK' : 'EXCEEDED'}`,
      });
    }
    if (thresholds.minRatio !== undefined) {
      const current = (thresholds as Record<string, number>).currentRatio ?? 0;
      const passed = current >= thresholds.minRatio;
      results.push({
        name: `metric.${name}`, passed, type: 'metric',
        current, limit: thresholds.minRatio,
        message: `${name}: ${current} / ${thresholds.minRatio} — ${passed ? 'OK' : 'BELOW_MIN'}`,
      });
    }
    if (thresholds.maxSeconds !== undefined) {
      const current = (thresholds as Record<string, number>).currentSeconds ?? 0;
      const passed = current <= thresholds.maxSeconds;
      results.push({
        name: `metric.${name}`, passed, type: 'metric',
        current, limit: thresholds.maxSeconds,
        message: `${name}: ${current}s / ${thresholds.maxSeconds}s — ${passed ? 'OK' : 'EXCEEDED'}`,
      });
    }
  }
  return results;
}

function generateReport(results: CheckResult[], allPassed: boolean, budget: PerformanceBudget): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    version: budget.version ?? 'unknown',
    allPassed,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
    },
    results: results.map(r => ({
      name: r.name,
      passed: r.passed,
      type: r.type,
      current: r.current,
      limit: r.limit,
      message: r.message,
    })),
    budgets: budget.budgets,
  };
}

async function main() {
  const budget = loadBudget();
  const args = process.argv.slice(2);
  const ci = args.includes('--ci');
  const report = args.includes('--report');
  const measure = args.includes('--measure') || ci;
  let allPassed = true;
  const results: CheckResult[] = [];

  if (measure) {
    updateBudgetWithMeasurements(budget);
    console.log('Real bundle sizes measured and saved to performance-budget.json\n');
  } else {
    console.log('Using configured sizes (use --measure to measure actual bundles)\n');
  }

  console.log('Performance Budget Check\n');

  for (const [name, bundleBudget] of Object.entries(budget.bundles)) {
    const result = checkBundleSize(name, bundleBudget);
    results.push(result);
    console.log(`  ${result.passed ? 'PASS' : 'FAIL'} ${result.message}`);
    if (!result.passed) allPassed = false;
  }

  const metricResults = checkMetrics(budget);
  for (const mr of metricResults) {
    results.push(mr);
    console.log(`  ${mr.passed ? 'PASS' : 'FAIL'} ${mr.message}`);
    if (!mr.passed) allPassed = false;
  }

  if (report) {
    const reportData = generateReport(results, allPassed, budget);
    const reportsDir = resolve(ROOT, 'reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = resolve(reportsDir, `performance-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(reportData, null, 2) + '\n');
    console.log(`\nReport saved to ${reportPath}`);
  }

  if (ci && !allPassed) {
    console.error('\nPerformance budget exceeded — failing CI');
    process.exit(1);
  }

  if (allPassed) {
    console.log('\nAll budgets within limits');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
