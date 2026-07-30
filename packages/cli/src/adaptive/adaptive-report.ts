import { OperationalEvent, OperationalPattern } from './pattern-types';
import { createLogger } from '@ideia/logger';
import { AdaptiveScores } from './adaptive-score';
import { Recommendation } from './recommendation-engine';
import { CycleControlResult } from './cycle-controller';
const logger = createLogger('adaptive-report');

export interface AdaptiveReport {
  generatedAt: string;
  eventCount: number;
  patterns: OperationalPattern[];
  adaptiveScores: AdaptiveScores;
  recommendations: Recommendation[];
  cycleControl: CycleControlResult;
  summary: string[];
}

export function buildAdaptiveReport(params: {
  events: OperationalEvent[];
  patterns: OperationalPattern[];
  scores: AdaptiveScores;
  recommendations: Recommendation[];
  cycleControl: CycleControlResult;
}): AdaptiveReport {
  const summary: string[] = [
    `${params.events.length} evento(s) analisado(s)`,
    `${params.patterns.length} padrão(ões) detectado(s)`,
    `${params.recommendations.length} recomendação(ões) gerada(s)`,
    `Ciclo: ${params.cycleControl.nextAction} (repeat: ${params.cycleControl.shouldRepeat}, escalate: ${params.cycleControl.shouldEscalate})`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    eventCount: params.events.length,
    patterns: params.patterns,
    adaptiveScores: params.scores,
    recommendations: params.recommendations,
    cycleControl: params.cycleControl,
    summary,
  };
}
