export type ReleaseTarget = 'v2.1' | 'v2.2' | 'post-v2.2';

export interface FeatureCandidate {
  id: string;
  title: string;
  description: string;
  impact: number;
  risk: number;
  effort: number;
  dependencyCount: number;
  boostsAutonomy: boolean;
  stabilizesBase: boolean;
}

export interface FeatureDecision {
  featureId: string;
  target: ReleaseTarget;
  reason: string;
  priorityScore: number;
}

export function scoreFeature(feature: FeatureCandidate): number {
  const benefit = feature.impact + (feature.stabilizesBase ? 20 : 0) + (feature.boostsAutonomy ? 15 : 0);
  const penalty = feature.risk + feature.effort + feature.dependencyCount * 5;
  return benefit - penalty;
}

export function decideTarget(feature: FeatureCandidate): ReleaseTarget {
  if (feature.stabilizesBase && feature.risk <= 4) return 'v2.1';
  if (feature.boostsAutonomy && feature.risk <= 6) return 'v2.2';
  return 'post-v2.2';
}

export function computeDecisions(features: FeatureCandidate[]): FeatureDecision[] {
  return features.map(f => ({
    featureId: f.id,
    target: decideTarget(f),
    reason: generateReason(f),
    priorityScore: scoreFeature(f),
  }));
}

function generateReason(feature: FeatureCandidate): string {
  const target = decideTarget(feature);
  if (target === 'v2.1') {
    return `Estabiliza a base (risk=${feature.risk}, impact=${feature.impact}). Prioridade alta para confiabilidade.`;
  }
  if (target === 'v2.2') {
    return `Amplia autonomia (risk=${feature.risk}, impact=${feature.impact}). Requer base estável primeiro.`;
  }
  return `Alto risco (${feature.risk}) ou baixo retorno imediato. Postergado para maturidade maior.`;
}
