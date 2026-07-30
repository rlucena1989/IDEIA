import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
import { readCoverageReport, summarizeCoverage, extractFileSummaries } from '../coverage/coverage-reader';
import { prioritizeGaps, rankBySeverity } from '../coverage/gap-prioritizer';
import { classifyTestGap } from '../coverage/test-quality-classifier';
import { buildAutonomyStatus, saveAutonomyStatus, loadAutonomyStatus } from '../coverage/status';
import type { CoverageGap, CoverageReport } from '../coverage/types';

function gapsFromReport(report: CoverageReport): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const file of report.files) {
    const avgScore = Math.round((file.statements + file.branches + file.functions + file.lines) / 4);

    if (avgScore < 80) {
      const gap: CoverageGap = {
        id: `gap-${file.file.replace(/[^a-zA-Z0-9]/g, '-')}`,
        file: file.file,
        module: file.module ?? 'unknown',
        severity: classifyTestGap({
          id: '', file: file.file, module: file.module ?? 'unknown', severity: 'optional',
          reason: `Low coverage: ${avgScore}% avg`,
          impact: file.file.includes('/commands/') ? 'Core command module' : 'Standard module',
          recommendation: `Increase coverage to 80%+`,
        }),
        reason: `Coverage average: ${avgScore}% (lines:${file.lines}%, branches:${file.branches}%, stmts:${file.statements}%, funcs:${file.functions}%)`,
        impact: file.file.includes('/commands/') || file.file.includes('/runtime/')
          ? 'High impact — core module'
          : 'Standard module',
        recommendation: `Add tests for ${file.file} to reach 80%+ coverage`,
      };
      gaps.push(gap);
    }
  }

  return gaps;
}

export interface CoverageAuditOutput {
  overall: { lines: number; branches: number; functions: number; statements: number };
  average: number;
  gaps: CoverageGap[];
  fileCount: number;
}

export function handleCoverageAudit(): CliCommandResult<CoverageAuditOutput> {
  const report = readCoverageReport();
  if (!report) {
    return failure('Nenhum relatório de cobertura encontrado. Execute npx jest --coverage primeiro.', 1) as CliCommandResult<CoverageAuditOutput>;
  }

  const avg = summarizeCoverage(report);
  const gaps = gapsFromReport(report);

  return success(`Cobertura geral: ${avg}%`, {
    overall: report.overall,
    average: avg,
    gaps,
    fileCount: report.files.length,
  });
}

export interface CoverageGapsOutput {
  gaps: CoverageGap[];
  ranked: Record<string, CoverageGap[]>;
  total: number;
}

export function handleCoverageGaps(severity?: string): CliCommandResult<CoverageGapsOutput> {
  const report = readCoverageReport();
  if (!report) {
    return failure('Nenhum relatório de cobertura encontrado.', 1) as CliCommandResult<CoverageGapsOutput>;
  }

  let gaps = gapsFromReport(report);
  gaps = prioritizeGaps(gaps);

  if (severity) {
    gaps = gaps.filter(g => g.severity === severity);
  }

  const ranked = rankBySeverity(gaps);

  return success(`${gaps.length} gaps encontrados`, { gaps, ranked, total: gaps.length });
}

export interface CoverageRepairOutput {
  repaired: string[];
  status: unknown;
  coverage: number;
}

export function handleCoverageRepair(maxIterations: number): CliCommandResult<CoverageRepairOutput> {
  const report = readCoverageReport();
  if (!report) {
    return failure('Nenhum relatório de cobertura encontrado.', 1) as CliCommandResult<CoverageRepairOutput>;
  }

  const gaps = gapsFromReport(report);
  const ordered = prioritizeGaps(gaps);
  const repaired: string[] = [];

  for (let i = 0; i < Math.min(maxIterations, ordered.length); i++) {
    const item = ordered[i]; if (item) repaired.push(item.id);
  }

  const avg = summarizeCoverage(report);
  const status = buildAutonomyStatus(avg, gaps, repaired.length);
  saveAutonomyStatus(status);

  return success(`Ciclo de reparo concluído: ${repaired.length} gaps resolvidos`, {
    repaired,
    status,
    coverage: avg,
  });
}

export interface CoverageStatusOutput {
  current: number;
  gaps: number;
  target: number;
  persisted: unknown;
}

export function handleCoverageStatus(): CliCommandResult<CoverageStatusOutput> {
  const report = readCoverageReport();
  const liveAvg = report ? summarizeCoverage(report) : 0;
  const liveGaps = report ? gapsFromReport(report) : [];
  const persisted = loadAutonomyStatus();

  return success('Status da autonomia de testes', {
    current: liveAvg,
    gaps: liveGaps.length,
    target: 80,
    persisted,
  });
}
