import type { EngineReport, EngineState, EngineMode } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('acceleration-utils');

export async function sendWebhookAlerts(
  alerts: { level: string; message: string }[],
  webhookUrl: string
): Promise<void> {
  for (const alert of alerts.filter(a => a.level === 'critical' || a.level === 'warning')) {
    if (!webhookUrl) continue;
    try {
      const body = JSON.stringify({
        level: alert.level,
        message: alert.message,
        timestamp: new Date().toISOString(),
        source: 'acceleration-engine'
      });
      const http = webhookUrl.startsWith('https') ? await import('https') : await import('http');
      const req = http.request(
        webhookUrl,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        () => {}
      );
      req.write(body);
      req.end();
    } catch { /* silent */ }
  }
}

export function buildPreviousReport(
  previousState: EngineState,
  config: { mode: string },
  currentData: {
    forecast: EngineReport['forecast'];
    precision: EngineReport['precision'];
    quality: EngineReport['quality'];
    scorecard: EngineReport['scorecard'];
    coverage: EngineReport['coverage'];
    gaps: EngineReport['gaps'];
    maturity: EngineReport['maturity'];
    history: EngineReport['history'];
  }
): EngineReport | null {
  if (!previousState.lastRunAt) return null;
  return {
    startedAt: previousState.lastRunAt,
    finishedAt: previousState.lastRunAt,
    mode: (previousState.lastMode ?? config.mode) as EngineMode,
    forecast: currentData.forecast,
    precision: currentData.precision,
    quality: {
      approved: previousState.lastSuccess ?? false,
      score: previousState.quality ?? 0,
      reasons: []
    },
    scorecard: currentData.scorecard,
    coverage: currentData.coverage,
    gaps: currentData.gaps,
    maturity: currentData.maturity,
    history: currentData.history,
    results: [],
    totalDurationMs: 0,
    success: previousState.lastSuccess ?? false
  };
}

export function printEngineSummary(report: EngineReport): void {
  logger.info('\n[engine] === CYCLE COMPLETE ===');
  logger.info('[engine] Mode: ${report.mode}');
  logger.info('[engine] Scorecard: ${report.scorecard.score}/100 (${report.scorecard.status})');
  logger.info('[engine] Coverage: ${report.coverage.total}% (lines=${report.coverage.lines}%, branches=${report.coverage.branches}%)');
  logger.info('[engine] Maturity: ${report.maturity.score} (${report.maturity.level})');
  logger.info('[engine] Gaps: ${report.gaps.length}');
  logger.info('[engine] Quality: ${report.quality.score}/100 (${report.quality.approved ? \'APPROVED\' : \'REJECTED\'})');
  logger.info('[engine] Duration: ${report.totalDurationMs}ms');
  logger.info('[engine] Success: ${report.success}');
  logger.info('[engine] Precision: confidence=${report.precision.confidence}, variance=${report.precision.variance}, stable=${report.precision.stable}');
  logger.info('[engine] Feedback: ${report.mode}\n');
}
