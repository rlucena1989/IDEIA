import { Alert, EngineMode, FeedbackDecision } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('feedback-controller');

export function decideFeedback(
  alerts: Alert[],
  currentMode: EngineMode,
  context: { lastSuccess?: boolean } = {}
): FeedbackDecision {
  const hasCritical = alerts.some(a => a.level === 'critical');
  const hasWarning = alerts.some(a => a.level === 'warning');

  // COR-05: fallback para modo fast quando balanced/deep falham
  if (context.lastSuccess === false && currentMode !== 'fast') {
    return { nextMode: 'fast', shouldPause: false, reason: 'modo profundo falhou — fallback para fast' };
  }

  if (hasCritical) {
    return { nextMode: 'deep', shouldPause: true, reason: 'alertas criticos detectados' };
  }

  if (hasWarning && currentMode !== 'deep') {
    return { nextMode: 'deep', shouldPause: false, reason: 'alertas de atencao detectados' };
  }

  return { nextMode: currentMode, shouldPause: false, reason: 'execucao estavel' };
}
