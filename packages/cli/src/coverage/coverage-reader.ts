import path from 'node:path';
import { createLogger } from '@ideia/logger';
import type { CoverageFileSummary, CoverageReport } from './types';
import { getIO } from '../io';
const logger = createLogger('coverage-reader');

const ROOT = getIO().fs.cwd();

interface JestCoverageItem {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

interface JestCoverageData {
  [filePath: string]: {
    lines: JestCoverageItem;
    statements: JestCoverageItem;
    functions: JestCoverageItem;
    branches: JestCoverageItem;
    branchesTrue?: JestCoverageItem;
  };
}

function inferModule(file: string): string {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.includes('/commands/')) return 'commands';
  if (normalized.includes('/governance/')) return 'governance';
  if (normalized.includes('/planner/')) return 'planner';
  if (normalized.includes('/coverage/')) return 'coverage';
  if (normalized.includes('/runtime/')) return 'runtime';
  if (normalized.includes('/quality/')) return 'quality';
  if (normalized.includes('/utils/')) return 'utils';
  if (normalized.includes('/io/')) return 'io';
  return 'other';
}

export function readCoverageReport(customPath?: string): CoverageReport | null {
  const searchPaths = customPath
    ? [customPath]
    : [
        path.join(ROOT, 'coverage', 'coverage-summary.json'),
        path.join(ROOT, 'packages', 'cli', 'coverage', 'coverage-summary.json'),
      ];

  let raw: string | null = null;
  let foundPath = '';

  for (const p of searchPaths) {
    try {
      raw = getIO().fs.read(p, 'utf8');
      foundPath = p;
      break;
    } catch {
      continue;
    }
  }

  if (!raw) return null;

  const data: JestCoverageData = JSON.parse(raw);

  const total = data['total'];
  if (!total) return null;

  const report: CoverageReport = {
    overall: {
      statements: total.statements?.pct ?? 0,
      branches: total.branches?.pct ?? 0,
      functions: total.functions?.pct ?? 0,
      lines: total.lines?.pct ?? 0,
    },
    files: [],
  };

  for (const [filePath, metrics] of Object.entries(data)) {
    if (filePath === 'total') continue;
    const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const summary: CoverageFileSummary = {
      file: relative,
      statements: metrics.statements?.pct ?? 0,
      branches: metrics.branches?.pct ?? 0,
      functions: metrics.functions?.pct ?? 0,
      lines: metrics.lines?.pct ?? 0,
      uncoveredLines: [],
      module: inferModule(relative),
    };
    report.files.push(summary);
  }

  return report;
}

export function summarizeCoverage(report: CoverageReport): number {
  const { statements, branches, functions, lines } = report.overall;
  return Math.round((statements + branches + functions + lines) / 4);
}

export function extractFileSummaries(report: CoverageReport) {
  return report.files.map(f => ({
    file: f.file,
    module: f.module ?? 'unknown',
    uncoveredCount: f.uncoveredLines.length,
    coverageScore: Math.round((f.statements + f.branches + f.functions + f.lines) / 4),
  }));
}
