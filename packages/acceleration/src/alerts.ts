import { Alert, Thresholds, ScorecardAnalysis, CoverageAnalysis, HistorySummary } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('alerts');

export function buildAlerts(
  thresholds: Thresholds,
  scorecard: ScorecardAnalysis,
  coverage: CoverageAnalysis,
  history: HistorySummary
): Alert[] {
  const alerts: Alert[] = [];

  if (scorecard.score < thresholds.scorecardMin) {
    alerts.push({ level: 'critical', message: `scorecard abaixo do minimo: ${scorecard.score}` });
  }

  if (coverage.total < thresholds.coverageMin) {
    alerts.push({ level: 'warning', message: `coverage abaixo do minimo: ${coverage.total}` });
  }

  if (history.successRate < thresholds.historySuccessMin) {
    alerts.push({ level: 'critical', message: `taxa de sucesso historica baixa: ${history.successRate}` });
  }

  return alerts;
}
