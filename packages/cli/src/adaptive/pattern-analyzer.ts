import { OperationalEvent, OperationalPattern } from './pattern-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('pattern-analyzer');

export function analyzePatterns(events: OperationalEvent[]): OperationalPattern[] {
  const inconsistentDocs = events.filter(
    e => e.type === 'consistency' && e.outcome === 'warning'
  ).length;

  const repairLoops = events.filter(
    e => e.type === 'evolution' && e.command.includes('repair')
  ).length;

  const blockedExecs = events.filter(
    e => e.outcome === 'blocked'
  ).length;

  const failedGens = events.filter(
    e => e.type === 'generation' && e.outcome === 'failed'
  ).length;

  const patterns: OperationalPattern[] = [];

  if (inconsistentDocs >= 3) {
    patterns.push({
      patternId: 'pattern-consistency-docs',
      name: 'Inconsistência documental recorrente',
      description: 'Falhas recorrentes em documentação e consistência.',
      frequency: inconsistentDocs,
      confidence: 0.87,
      impact: 'high',
      triggers: ['consistency warning', 'documentation drift'],
      recommendedAction: 'repair',
    });
  }

  if (repairLoops >= 2) {
    patterns.push({
      patternId: 'pattern-repair-loop',
      name: 'Loop de reparo recorrente',
      description: 'O sistema entra repetidamente em reparo para estabilizar o estado.',
      frequency: repairLoops,
      confidence: 0.81,
      impact: 'medium',
      triggers: ['repair command', 'blocked execution'],
      recommendedAction: 'review',
    });
  }

  if (blockedExecs >= 3) {
    patterns.push({
      patternId: 'pattern-blocked-execution',
      name: 'Bloqueios frequentes de execução',
      description: 'Múltiplas execuções bloqueadas por decisão governada.',
      frequency: blockedExecs,
      confidence: 0.85,
      impact: 'critical',
      triggers: ['blocked execution', 'governance block'],
      recommendedAction: 'review',
    });
  }

  if (failedGens >= 2) {
    patterns.push({
      patternId: 'pattern-generation-failure',
      name: 'Falhas de geração recorrentes',
      description: 'Geração de artefatos falhando repetidamente.',
      frequency: failedGens,
      confidence: 0.78,
      impact: 'high',
      triggers: ['generation failure', 'low generation score'],
      recommendedAction: 'repair',
    });
  }

  return patterns;
}
