import { getIO } from '../packages/cli/src/io';

interface BudgetEntry {
  maxSizeKb?: number;
  currentSizeKb?: number;
  warnThreshold?: number;
  maxMs?: number;
  p95MaxMs?: number;
  minPerSecond?: number;
  maxMb?: number;
  warnMb?: number;
  minRatio?: number;
  maxSeconds?: number;
  warnMs?: number;
  warnSeconds?: number;
  targetKb?: number;
  warningKb?: number;
  criticalKb?: number;
  currentKb?: number;
  targetMs?: number;
  warningMs?: number;
  criticalMs?: number;
  currentMs?: number;
  currentLocalMs?: number;
  currentCloudMs?: number;
  targetTps?: number;
  currentLocalTps?: number;
  currentCloudTps?: number;
  targetMb?: number;
  criticalMb?: number;
  currentMb?: number;
  p50TargetMs?: number;
  p95TargetMs?: number;
  p99TargetMs?: number;
  currentP50Ms?: number;
  currentP95Ms?: number;
  currentP99Ms?: number;
  targetSeconds?: number;
  criticalSeconds?: number;
  currentSeconds?: number;
  status?: string;
}

interface BudgetConfig {
  bundles?: Record<string, BudgetEntry>;
  metrics?: Record<string, BudgetEntry>;
  budgets?: Record<string, BudgetEntry>;
  lighthouse?: Record<string, number>;
  version?: string;
  updatedAt?: string;
  history?: Array<{ date: string; bundleKb: number; note: string }>;
}

interface CheckResult {
  name: string;
  category: string;
  measured: number;
  budget: number;
  unit: string;
  passed: boolean;
  driftPct: number;
  severity: 'ok' | 'warn' | 'fail';
}

interface TrackReport {
  timestamp: string;
  totalChecks: number;
  passed: number;
  failed: number;
  warned: number;
  score: number;
  results: CheckResult[];
}

function calcDrift(measured: number, budget: number): number {
  if (budget === 0) return measured === 0 ? 0 : 100;
  return Math.round(((measured - budget) / budget) * 10000) / 100;
}

function classifySeverity(passed: boolean, driftPct: number): 'ok' | 'warn' | 'fail' {
  if (passed) return driftPct > 10 ? 'warn' : 'ok';
  return 'fail';
}

function checkBundleEntries(budgets: Record<string, BudgetEntry>, results: CheckResult[]): void {
  for (const [name, entry] of Object.entries(budgets)) {
    if (entry.maxSizeKb != null && entry.currentSizeKb != null) {
      const drift = calcDrift(entry.currentSizeKb, entry.maxSizeKb);
      const passed = entry.currentSizeKb <= entry.maxSizeKb;
      results.push({
        name: `bundle.${name}`,
        category: 'bundle',
        measured: entry.currentSizeKb,
        budget: entry.maxSizeKb,
        unit: 'KB',
        passed,
        driftPct: drift,
        severity: classifySeverity(passed, drift),
      });
    }
  }
}

function checkMetricEntries(metrics: Record<string, BudgetEntry>, results: CheckResult[]): void {
  const metricChecks: Array<{
    key: string;
    label: string;
    measured: number | undefined;
    budget: number | undefined;
    unit: string;
    inverse?: boolean;
  }> = [];

  for (const [name, entry] of Object.entries(metrics)) {
    switch (name) {
      case 'ttft': {
        if (entry.currentMs != null) {
          metricChecks.push({ key: 'ttft.avg', label: 'TTFT avg', measured: entry.currentMs, budget: entry.maxMs, unit: 'ms' });
        }
        break;
      }
      case 'tps': {
        if (entry.currentLocalTps != null && entry.targetTps != null) {
          metricChecks.push({ key: 'tps.local', label: 'TPS local', measured: entry.currentLocalTps, budget: entry.targetTps, unit: 'tps', inverse: true });
        }
        if (entry.currentCloudTps != null && entry.targetTps != null) {
          metricChecks.push({ key: 'tps.cloud', label: 'TPS cloud', measured: entry.currentCloudTps, budget: entry.targetTps, unit: 'tps', inverse: true });
        }
        break;
      }
      case 'memoryHeap': {
        if (entry.currentMb != null) {
          metricChecks.push({ key: 'memory.heap', label: 'Heap memory', measured: entry.currentMb, budget: entry.maxMb ?? entry.criticalMb, unit: 'MB' });
        }
        break;
      }
      case 'startupTime': {
        if (entry.currentMs != null) {
          metricChecks.push({ key: 'startup.time', label: 'Startup time', measured: entry.currentMs, budget: entry.maxMs ?? entry.criticalMs, unit: 'ms' });
        }
        break;
      }
      case 'apiResponseTimeP50': {
        metricChecks.push({ key: 'api.p50', label: 'API p50', measured: entry.currentP50Ms, budget: entry.maxMs, unit: 'ms' });
        break;
      }
      case 'apiResponseTimeP95': {
        metricChecks.push({ key: 'api.p95', label: 'API p95', measured: entry.currentP95Ms, budget: entry.maxMs, unit: 'ms' });
        break;
      }
      case 'apiResponseTimeP99': {
        metricChecks.push({ key: 'api.p99', label: 'API p99', measured: entry.currentP99Ms, budget: entry.maxMs, unit: 'ms' });
        break;
      }
      case 'testExecutionTime': {
        if (entry.currentSeconds != null) {
          metricChecks.push({ key: 'test.execution', label: 'Test execution', measured: entry.currentSeconds, budget: entry.maxSeconds ?? entry.criticalSeconds, unit: 's' });
        }
        break;
      }
      case 'buildTime': {
        if (entry.currentSeconds != null) {
          metricChecks.push({ key: 'build.time', label: 'Build time', measured: entry.currentSeconds, budget: entry.maxSeconds ?? entry.criticalSeconds, unit: 's' });
        }
        break;
      }
      case 'eventBusLatency': {
        metricChecks.push({ key: 'eventbus.latency', label: 'Event bus latency', measured: entry.currentMs, budget: entry.maxMs, unit: 'ms' });
        break;
      }
    }
  }

  for (const check of metricChecks) {
    if (check.measured == null || check.budget == null) continue;
    if (check.inverse) {
      const drift = calcDrift(check.budget, check.measured);
      const passed = check.measured >= check.budget;
      results.push({
        name: check.key,
        category: 'metric',
        measured: check.measured,
        budget: check.budget,
        unit: check.unit,
        passed,
        driftPct: drift,
        severity: classifySeverity(passed, drift),
      });
    } else {
      const drift = calcDrift(check.measured, check.budget);
      const passed = check.measured <= check.budget;
      results.push({
        name: check.key,
        category: 'metric',
        measured: check.measured,
        budget: check.budget,
        unit: check.unit,
        passed,
        driftPct: drift,
        severity: classifySeverity(passed, drift),
      });
    }
  }
}

function checkDashboardBudgets(budgets: Record<string, BudgetEntry>, results: CheckResult[]): void {
  for (const [name, entry] of Object.entries(budgets)) {
    if (entry.currentKb != null && entry.targetKb != null) {
      const drift = calcDrift(entry.currentKb, entry.targetKb);
      const passed = entry.currentKb <= entry.targetKb;
      results.push({
        name: `budget.${name}.size`,
        category: 'budget',
        measured: entry.currentKb,
        budget: entry.targetKb,
        unit: 'KB',
        passed,
        driftPct: drift,
        severity: classifySeverity(passed, drift),
      });
    }
    if (entry.currentMs != null && entry.targetMs != null) {
      const drift = calcDrift(entry.currentMs, entry.targetMs);
      const passed = entry.currentMs <= entry.targetMs;
      results.push({
        name: `budget.${name}.time`,
        category: 'budget',
        measured: entry.currentMs,
        budget: entry.targetMs,
        unit: 'ms',
        passed,
        driftPct: drift,
        severity: classifySeverity(passed, drift),
      });
    }
    if (entry.currentSeconds != null && entry.targetSeconds != null) {
      const drift = calcDrift(entry.currentSeconds, entry.targetSeconds);
      const passed = entry.currentSeconds <= entry.targetSeconds;
      results.push({
        name: `budget.${name}.duration`,
        category: 'budget',
        measured: entry.currentSeconds,
        budget: entry.targetSeconds,
        unit: 's',
        passed,
        driftPct: drift,
        severity: classifySeverity(passed, drift),
      });
    }
  }
}

function runChecks(config: BudgetConfig): CheckResult[] {
  const results: CheckResult[] = [];

  if (config.bundles) {
    checkBundleEntries(config.bundles, results);
  }
  if (config.metrics) {
    checkMetricEntries(config.metrics, results);
  }
  if (config.budgets) {
    checkDashboardBudgets(config.budgets, results);
  }

  return results;
}

function generateReport(results: CheckResult[]): TrackReport {
  const totalChecks = results.length;
  const passed = results.filter(r => r.passed && r.severity !== 'warn').length;
  const warned = results.filter(r => r.severity === 'warn').length;
  const failed = results.filter(r => !r.passed).length;
  const score = totalChecks > 0 ? Math.round(((passed + warned) / totalChecks) * 100) : 100;

  return {
    timestamp: new Date().toISOString(),
    totalChecks,
    passed,
    failed,
    warned,
    score,
    results,
  };
}

function printReport(report: TrackReport, jsonMode: boolean): void {
  if (jsonMode) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return;
  }

  const io = getIO();

  io.shell.execString('echo', []);
  io.shell.execString('echo', [`Performance Budget Check — ${report.timestamp}`]);
  io.shell.execString('echo', [`${'='.repeat(60)}`]);

  for (const r of report.results) {
    const icon = !r.passed ? 'FAIL' : r.severity === 'warn' ? 'WARN' : 'PASS';
    const pad = r.name.padEnd(30);
    io.shell.execString('echo', [`  [${icon}] ${pad} ${r.measured}${r.unit} / ${r.budget}${r.unit} (${r.driftPct > 0 ? '+' : ''}${r.driftPct}%)`]);
  }

  io.shell.execString('echo', [`${'='.repeat(60)}`]);
  io.shell.execString('echo', [`Score: ${report.score}/100 | Passed: ${report.passed} | Warned: ${report.warned} | Failed: ${report.failed} | Total: ${report.totalChecks}`]);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const ciMode = args.includes('--ci');

  const io = getIO();
  const budgetPath = io.fs.cwd() + '/performance-budget.json';

  if (!io.fs.exists(budgetPath)) {
    io.shell.execString('echo', ['ERROR: performance-budget.json not found at ' + budgetPath]);
    process.exit(1);
  }

  let config: BudgetConfig;
  try {
    config = JSON.parse(io.fs.read(budgetPath, 'utf-8'));
  } catch (e) {
    io.shell.execString('echo', ['ERROR: Failed to parse performance-budget.json: ' + String(e)]);
    process.exit(1);
  }

  const results = runChecks(config);
  const report = generateReport(results);

  const resultsDir = io.fs.cwd() + '/.ai/performance';
  if (!io.fs.exists(resultsDir)) {
    io.fs.mkDir(resultsDir, true);
  }
  io.fs.write(resultsDir + '/results.json', JSON.stringify(report, null, 2));

  printReport(report, jsonMode);

  if (ciMode && report.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  const io = getIO();
  io.shell.execString('echo', ['FATAL: ' + String(err)]);
  process.exit(1);
});
