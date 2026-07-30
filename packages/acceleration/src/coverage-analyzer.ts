import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import { CoverageAnalysis } from './types';
const logger = createLogger('coverage-analyzer');

export function analyzeCoverage(): CoverageAnalysis {
  const summaryPath = 'coverage/coverage-summary.json';

  if (!fs.existsSync(summaryPath)) {
    return { total: 0, lines: 0, branches: 0, functions: 0, status: 'critical' };
  }

  try {
    const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const total = data.total;
    if (!total) return { total: 0, lines: 0, branches: 0, functions: 0, status: 'critical' };

    const lines = Math.round(total.lines?.pct ?? 0);
    const branches = Math.round(total.branches?.pct ?? 0);
    const functions = Math.round(total.functions?.pct ?? 0);
    const avg = Math.round(total.statements?.pct ?? total.lines?.pct ?? 0);

    return {
      total: avg,
      lines,
      branches,
      functions,
      status: avg >= 80 ? 'good' : avg >= 60 ? 'warning' : 'critical'
    };
  } catch {
    return { total: 0, lines: 0, branches: 0, functions: 0, status: 'critical' };
  }
}
