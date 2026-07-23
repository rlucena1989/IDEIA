import fs from 'node:fs';
import path from 'node:path';
import { EngineConfig, EngineReport } from './types';

export function writeReport(config: EngineConfig, report: EngineReport) {
  fs.mkdirSync(config.reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(config.reportDir, `report-${timestamp}.json`);
  const mdPath = path.join(config.reportDir, `report-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const md = [
    `# AI Devkit Report`,
    ``,
    `- Mode: ${report.mode}`,
    `- Success: ${report.success}`,
    `- Total Duration: ${report.totalDurationMs}ms`,
    `- Quality Score: ${report.quality.score}`,
    `- Approved: ${report.quality.approved}`,
    ``,
    `## Scorecard`,
    `- Score: ${report.scorecard.score}`,
    `- Trend: ${report.scorecard.trend}`,
    `- Status: ${report.scorecard.status}`,
    ``,
    `## Coverage`,
    `- Total: ${report.coverage.total}`,
    `- Lines: ${report.coverage.lines}`,
    `- Branches: ${report.coverage.branches}`,
    `- Functions: ${report.coverage.functions}`,
    `- Status: ${report.coverage.status}`,
    ``,
    `## Gaps (${report.gaps.length})`,
    ...report.gaps.map(g => `- [${g.severity}] ${g.description}`),
    ``,
    `## Maturity`,
    `- Score: ${report.maturity.score}`,
    `- Level: ${report.maturity.level}`,
    ``,
    `## History (${report.history.runs} runs)`,
    `- Success Rate: ${(report.history.successRate * 100).toFixed(1)}%`,
    `- Avg Quality: ${report.history.averageQualityScore.toFixed(1)}`,
    `- Avg Duration: ${report.history.averageDurationMs.toFixed(0)}ms`,
    ``,
    `## Reasons`,
    ...report.quality.reasons.map(r => `- ${r}`),
    ``,
    `## Results`,
    ...report.results.map(r => `- ${r.name}: ${r.status} (${r.durationMs}ms)`),
    ``
  ].join('\n');

  fs.writeFileSync(mdPath, md, 'utf8');
}
