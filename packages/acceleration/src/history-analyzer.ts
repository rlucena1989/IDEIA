import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { HistorySummary } from './types';
export { HistorySummary };
const logger = createLogger('history-analyzer');

interface ReportFile {
  success: boolean;
  quality?: { score: number };
  totalDurationMs?: number;
}

export function analyzeHistory(reportDir: string): HistorySummary {
  if (!fs.existsSync(reportDir)) {
    return { successRate: 1, averageQualityScore: 80, averageDurationMs: 0, runs: 0 };
  }

  const files = fs.readdirSync(reportDir).filter(file => file.endsWith('.json'));
  const reports: ReportFile[] = [];

  for (const file of files) {
    try {
      reports.push(JSON.parse(fs.readFileSync(path.join(reportDir, file), 'utf8')) as ReportFile);
    } catch {
      // ignore invalid report
    }
  }

  if (reports.length === 0) {
    return { successRate: 1, averageQualityScore: 80, averageDurationMs: 0, runs: 0 };
  }

  const runs = reports.length;
  const successRate = reports.filter(r => r.success).length / runs;
  const averageQualityScore = reports.reduce((sum, r) => sum + (r.quality?.score ?? 0), 0) / runs;
  const averageDurationMs = reports.reduce((sum, r) => sum + (r.totalDurationMs ?? 0), 0) / runs;

  return {
    successRate,
    averageQualityScore,
    averageDurationMs,
    runs
  };
}
