import { QualityReport, Forecast, PrecisionReport, JobResult, ScorecardAnalysis, CoverageAnalysis } from './types';

export function qualityGate(
  results: JobResult[],
  forecast: Forecast,
  precision: PrecisionReport,
  scorecard?: ScorecardAnalysis,
  coverage?: CoverageAnalysis
): QualityReport {
  const failures = results.filter(r => r.status === 'failed').length;
  const total = results.length || 1;
  const failureRate = failures / total;

  let score = 100;
  score -= failures * 20;
  score -= Math.round(forecast.estimatedDurationMs / 1000);
  score -= Math.round((1 - precision.confidence) * 20);
  if (scorecard) score -= Math.round((100 - scorecard.score) * 0.3);
  if (coverage) score -= Math.round((100 - coverage.total) * 0.2);
  score = Math.max(0, Math.min(100, score));

  const reasons: string[] = [];
  if (failureRate > 0) reasons.push('ha falhas na execucao');
  if (!precision.stable) reasons.push('precisao instavel');
  if (forecast.risk === 'high') reasons.push('risco alto de carga');
  if (scorecard && scorecard.status === 'critical') reasons.push('scorecard critico');
  if (coverage && coverage.status === 'critical') reasons.push('coverage critico');

  return {
    approved: score >= 60 && failureRate === 0,
    score,
    reasons
  };
}
