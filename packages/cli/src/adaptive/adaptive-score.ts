import { OperationalPattern } from './pattern-types';

export interface AdaptiveScores {
  consistencyWeight: number;
  hardeningWeight: number;
  generationWeight: number;
  evolutionWeight: number;
}

export function computeAdaptiveScores(patterns: OperationalPattern[]): AdaptiveScores {
  const criticalCount = patterns.filter(p => p.impact === 'critical').length;
  const highCount = patterns.filter(p => p.impact === 'high').length;

  return {
    consistencyWeight: 1 + criticalCount * 0.2 + highCount * 0.1,
    hardeningWeight: 1 + criticalCount * 0.15,
    generationWeight: 1 - Math.min(0.2, highCount * 0.05),
    evolutionWeight: 1 + patterns.length * 0.05,
  };
}
