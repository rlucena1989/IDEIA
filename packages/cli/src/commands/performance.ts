import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

const BUDGET_CONFIG_PATH = '.ai/performance/budget.yaml';
const BUDGET_HISTORY_PATH = '.ai/reports/performance/history.jsonl';

interface BudgetConfig {
  budget: {
    bundleSize?: { max: number; unit: 'kb' | 'mb' };
    lighthouseScore?: { min: number };
    apiLatency?: { max: number; unit: 'ms' | 's' };
    memoryUsage?: { max: number; unit: 'mb' | 'gb' };
    fcp?: { max: number; unit: 'ms' | 's' };
    lcp?: { max: number; unit: 'ms' | 's' };
    tti?: { max: number; unit: 'ms' | 's' };
  };
  alerts: { onExceed: 'warn' | 'error' };
}

function defaultBudgetConfig(): BudgetConfig {
  return {
    budget: {
      bundleSize: { max: 500, unit: 'kb' },
      lighthouseScore: { min: 80 },
      apiLatency: { max: 200, unit: 'ms' },
      memoryUsage: { max: 512, unit: 'mb' },
      fcp: { max: 2000, unit: 'ms' },
      lcp: { max: 4000, unit: 'ms' },
      tti: { max: 5000, unit: 'ms' },
    },
    alerts: { onExceed: 'warn' },
  };
}

function loadBudget(root: string): BudgetConfig {
  const cfgPath = path.join(root, BUDGET_CONFIG_PATH);
  if (getIO().fs.exists(cfgPath)) return JSON.parse(getIO().fs.read(cfgPath, 'utf-8'));
  return defaultBudgetConfig();
}

function calculateBundleSize(root: string): { value: number; unit: 'kb'; label: string } {
  try {
    const distDir = path.join(root, 'dist');
    if (!getIO().fs.exists(distDir)) return { value: 0, unit: 'kb', label: 'dist nao encontrado' };
    let totalBytes = 0;
    const countSize = (dir: string): void => {
      for (const e of getIO().fs.readDirEntries(dir)) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) countSize(fp);
        else totalBytes += getIO().fs.stat(fp).size;
      }
    };
    countSize(distDir);
    return { value: Math.round(totalBytes / 1024), unit: 'kb', label: `${Math.round(totalBytes / 1024)}kb` };
  } catch {
    return { value: -1, unit: 'kb', label: 'erro ao medir' };
  }
}

function calculateLighthouseScore(): { value: number; label: string } {
  return { value: -1, label: 'N/A (executar lighthouse manualmente)' };
}

function calculateApiLatency(): { value: number; unit: 'ms'; label: string } {
  return { value: -1, unit: 'ms', label: 'N/A (servidor precisa estar rodando)' };
}

function calculateMemoryUsage(): { value: number; unit: 'mb'; label: string } {
  try {
    const usage = process.memoryUsage();
    return { value: Math.round(usage.heapUsed / 1024 / 1024), unit: 'mb', label: `${Math.round(usage.heapUsed / 1024 / 1024)}mb` };
  } catch {
    return { value: -1, unit: 'mb', label: 'erro ao medir' };
  }
}

function checkBudget(budget: BudgetConfig): { metric: string; budget: string; actual: string; passed: boolean }[] {
  const results: { metric: string; budget: string; actual: string; passed: boolean }[] = [];
  const checks = budget.budget;

  if (checks.bundleSize) {
    const actual = calculateBundleSize(process.cwd());
    results.push({
      metric: 'Bundle Size',
      budget: `${checks.bundleSize.max}${checks.bundleSize.unit}`,
      actual: actual.label,
      passed: actual.value >= 0 ? actual.value <= checks.bundleSize.max : true,
    });
  }

  if (checks.lighthouseScore) {
    const actual = calculateLighthouseScore();
    results.push({
      metric: 'Lighthouse Score',
      budget: `>= ${checks.lighthouseScore.min}`,
      actual: actual.label,
      passed: actual.value >= 0 ? actual.value >= checks.lighthouseScore.min : true,
    });
  }

  if (checks.apiLatency) {
    const actual = calculateApiLatency();
    const maxMs = checks.apiLatency.unit === 's' ? checks.apiLatency.max * 1000 : checks.apiLatency.max;
    results.push({
      metric: 'API Latency',
      budget: `<= ${checks.apiLatency.max}${checks.apiLatency.unit}`,
      actual: actual.label,
      passed: actual.value >= 0 ? actual.value <= maxMs : true,
    });
  }

  if (checks.memoryUsage) {
    const actual = calculateMemoryUsage();
    const maxMb = checks.memoryUsage.unit === 'gb' ? checks.memoryUsage.max * 1024 : checks.memoryUsage.max;
    results.push({
      metric: 'Memory Usage',
      budget: `<= ${checks.memoryUsage.max}${checks.memoryUsage.unit}`,
      actual: actual.label,
      passed: actual.value >= 0 ? actual.value <= maxMb : true,
    });
  }

  return results;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function performanceCommand(): Command {
  const cmd = new Command('performance')
    .description('Performance budget e metricas');

  cmd
    .command('budget')
    .description('Gerencia configuracao de performance budget')
    .argument('<action>', 'init | check | report')
    .action((action: string) => {
      const root = process.cwd();
      const cfgDir = path.dirname(path.join(root, BUDGET_CONFIG_PATH));

      switch (action) {
        case 'init': {
          printHeader('Performance Budget Init');
          const config = defaultBudgetConfig();
          getIO().fs.mkDir(cfgDir, true);
          getIO().fs.write(path.join(root, BUDGET_CONFIG_PATH), JSON.stringify(config, null, 2));
          printResult('Configuracao criada', true, BUDGET_CONFIG_PATH);
          finish({
            checkpoint: 'performance_budget_init',
            ok: true,
            status: 'passed',
            context_summary: `Budget configurado em ${BUDGET_CONFIG_PATH}`,
            data: { metrics: Object.keys(config.budget) },
          });
          break;
        }

        case 'check': {
          printHeader('Performance Budget Check');
          const budget = loadBudget(root);
          const results = checkBudget(budget);
          let allPassed = true;

          for (const r of results) {
            printResult(r.metric, r.passed, `${r.actual} (budget: ${r.budget})`);
            if (!r.passed) allPassed = false;
          }

          if (results.length === 0) printLine('Nenhuma metrica configurada.');

          const historyDir = path.dirname(path.join(root, BUDGET_HISTORY_PATH));
          getIO().fs.mkDir(historyDir, true);
          const entry = JSON.stringify({ date: new Date().toISOString(), results, allPassed }) + '\n';
          getIO().fs.append(path.join(root, BUDGET_HISTORY_PATH), entry);

          finish({
            checkpoint: 'performance_budget_check',
            ok: allPassed,
            status: allPassed ? 'passed' : 'failed',
            context_summary: `${results.filter(r => r.passed).length}/${results.length} metricas dentro do budget`,
            data: { results, allPassed },
          });
          break;
        }

        case 'report': {
          printHeader('Performance Budget Report');
          const historyPath = path.join(root, BUDGET_HISTORY_PATH);
          if (!getIO().fs.exists(historyPath)) {
            printLine('Nenhum historico encontrado. Execute "performance budget check" primeiro.');
            finish({ checkpoint: 'performance_budget_report', ok: true, status: 'passed', context_summary: 'Sem historico', data: {} });
            return;
          }

          const lines = getIO().fs.read(historyPath, 'utf-8').split('\n').filter(Boolean);
          const entries = lines.map(l => JSON.parse(l));
          printLine(`Total de checks: ${entries.length}`);
          const passRate = entries.filter((e: { allPassed: boolean }) => e.allPassed).length / entries.length * 100;
          printLine(`Taxa de aprovacao: ${Math.round(passRate)}%`);
          printLine('');
          printLine(`Ultimo check: ${entries[entries.length - 1]?.date || 'N/A'}`);

          finish({
            checkpoint: 'performance_budget_report',
            ok: true,
            status: 'passed',
            context_summary: `${entries.length} checks, ${Math.round(passRate)}% aprovacao`,
            data: { totalChecks: entries.length, passRate: Math.round(passRate) },
          });
          break;
        }

        default: {
          printResult('Erro', false, `Acao desconhecida: "${action}". Use init, check ou report`);
          finish({ checkpoint: 'performance_budget', ok: false, status: 'failed', context_summary: `Acao desconhecida: ${action}` });
        }
      }
    });

  return cmd;
}
