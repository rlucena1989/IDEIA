import { DevkitState } from '../state/state-types';
import { createLogger } from '@ideia/logger';
import { ConsistencyReport } from '../state/consistency-types';
import { ConsistencyCheckResult } from './consistency-checker';
import { DevkitStateMetric } from '../state/state-types';

export interface HardeningReport {
  generatedAt: string;
  stateSummary: string;
  consistencyStatus: ConsistencyCheckResult;
  metricsSnapshot: DevkitStateMetric[];
  recommendations: string[];
}

export function buildHardeningReport(
  state: DevkitState,
  consistencyResult: ConsistencyCheckResult
): HardeningReport {
  const recommendations: string[] = [];

  if (!consistencyResult.ok) {
    recommendations.push('Resolver bloqueadores de consistência antes de avançar');
  }
  if (consistencyResult.attentionCount > 0) {
    recommendations.push(`Revisar ${consistencyResult.attentionCount} área(s) com atenção`);
  }
  if (state.blockers.length > 0) {
    recommendations.push(`Resolver ${state.blockers.length} bloqueador(es) pendente(s)`);
  }

  return {
    generatedAt: new Date().toISOString(),
    stateSummary: state.summary,
    consistencyStatus: consistencyResult,
    metricsSnapshot: state.metrics,
    recommendations,
  };
}
