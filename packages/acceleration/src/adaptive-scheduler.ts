import { EngineMode } from './types';
import { HistorySummary } from './history-analyzer';
import { HealthCheckResult } from './types';

export interface ScheduleDecision {
  suggestedMode: EngineMode;
  reason: string;
}

export function adaptSchedule(
  currentMode: EngineMode,
  history: HistorySummary,
  health: HealthCheckResult
): ScheduleDecision {
  if (!health.healthy) {
    return { suggestedMode: 'deep', reason: 'saude do ambiente comprometida' };
  }

  if (history.runs > 0 && history.successRate < 0.7) {
    return { suggestedMode: 'deep', reason: `taxa de sucesso baixa (${Math.round(history.successRate * 100)}%)` };
  }

  if (history.runs > 5 && history.successRate > 0.95 && history.averageQualityScore > 85) {
    return { suggestedMode: 'fast', reason: 'historico de alta qualidade permite modo rapido' };
  }

  return { suggestedMode: currentMode, reason: 'mantendo modo atual' };
}
