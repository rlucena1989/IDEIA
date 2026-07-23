import { EngineMode, Forecast, PrecisionReport, ScorecardAnalysis, CoverageAnalysis, HistorySummary } from './types';

export interface DecisionResult {
  mode: EngineMode;
  concurrency: number;
  useCache: boolean;
  reason: string;
}

export function decideExecution(
  currentMode: EngineMode,
  forecast: Forecast,
  precision: PrecisionReport,
  scorecard: ScorecardAnalysis,
  coverage: CoverageAnalysis,
  history: HistorySummary
): DecisionResult {
  const reasons: string[] = [];

  let mode = currentMode;
  let concurrency = mode === 'fast' ? 8 : mode === 'balanced' ? 4 : 2;
  let useCache = true;

  if (forecast.risk === 'high') {
    mode = 'deep';
    concurrency = 2;
    reasons.push('risco alto forca modo deep');
  }

  if (!precision.stable && mode !== 'deep') {
    mode = 'deep';
    concurrency = 2;
    reasons.push('precisao instavel forca modo deep');
  }

  if (scorecard.status === 'critical' || coverage.status === 'critical') {
    mode = 'deep';
    concurrency = 1;
    reasons.push('scorecard/coverage critico forca modo deep com concorrencia 1');
  }

  if (forecast.risk === 'low' && precision.stable && scorecard.status === 'good' && history.successRate > 0.9) {
    mode = 'fast';
    concurrency = 8;
    reasons.push('condicoes ideais permitem modo fast');
  }

  if (history.runs > 0 && history.successRate < 0.5) {
    useCache = false;
    reasons.push('historico de falhas alto — cache desabilitado');
  }

  return {
    mode,
    concurrency,
    useCache,
    reason: reasons.join('; ') || 'decisao padrao mantida'
  };
}
