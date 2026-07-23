/** Interface que define a estrutura de test result. */
export interface TestResult {
  phase: 'lint' | 'typecheck' | 'unit' | 'build' | 'security';
  passed: boolean;
  durationMs: number;
  output: string;
  errors: string[];
}

/** Interface que define a estrutura de test loop report. */
export interface TestLoopReport {
  sessionId: string;
  overallPassed: boolean;
  results: TestResult[];
  startedAt: string;
  completedAt: string;
  autoFixApplied: boolean;
}

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();

function runCommand(cmd: string, args: string[], label: string): TestResult {
  const start = Date.now();
  try {
    const result = spawnSync(cmd, args, { cwd: ROOT, shell: true, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    const durationMs = Date.now() - start;
    const passed = result.status === 0;
    const output = (result.stdout || '').substring(0, 2000);
    const errors = passed ? [] : [(result.stderr || '').substring(0, 500)];
    return { phase: label as TestResult['phase'], passed, durationMs, output, errors };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { phase: label as TestResult['phase'], passed: false, durationMs: Date.now() - start, output: '', errors: [message] };
  }
}

/**
 * Executa test loop.
 * @returns O resultado da operação.
 */
export function runTestLoop(): TestLoopReport {
  const sessionId = `test_${Date.now().toString(36)}`;
  const startedAt = new Date().toISOString();
  const results: TestResult[] = [];

  results.push(runCommand('npx', ['eslint', 'packages/cli/src/**/*.ts', '--format', 'compact'], 'lint'));
  results.push(runCommand('npx', ['tsc', '--noEmit', '-p', 'packages/cli/tsconfig.json'], 'typecheck'));
  results.push(runCommand('npx', ['jest', '--passWithNoTests', '--no-cache'], 'unit'));
  results.push(runCommand('npm', ['run', 'build'], 'build'));
  results.push(runCommand('npm', ['audit', '--omit=dev'], 'security'));

  const overallPassed = results.every(r => r.passed);
  const report: TestLoopReport = {
    sessionId, overallPassed, results,
    startedAt, completedAt: new Date().toISOString(),
    autoFixApplied: false,
  };

  fs.mkdirSync(path.join(ROOT, '.ai/reports/test-loop'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.ai/reports/test-loop', `${sessionId}.json`), JSON.stringify(report, null, 2));

  return report;
}

/**
 * Formata test report.
 * @param report - Valor report.
 * @returns O resultado da operação.
 */
export function formatTestReport(report: TestLoopReport): string {
  const lines: string[] = [];
  lines.push(`# Test Loop Report: ${report.sessionId}`);
  lines.push('');
  lines.push(`**Resultado:** ${report.overallPassed ? '✅ APROVADO' : '❌ FALHOU'}`);
  lines.push(`**Duracao:** ${Date.parse(report.completedAt) - Date.parse(report.startedAt)}ms`);
  lines.push('');
  lines.push('| Fase | Status | Duracao | Erros |');
  lines.push('|------|--------|---------|-------|');
  for (const r of report.results) {
    lines.push(`| ${r.phase} | ${r.passed ? '✅' : '❌'} | ${r.durationMs}ms | ${r.errors.length} |`);
  }
  lines.push('');
  if (!report.overallPassed) {
    lines.push('## Falhas');
    lines.push('');
    for (const r of report.results) {
      if (!r.passed && r.errors.length > 0) {
        lines.push(`### ${r.phase}`);
        lines.push('```');
        lines.push(r.errors.join('\n'));
        lines.push('```');
      }
    }
  }
  return lines.join('\n');
}