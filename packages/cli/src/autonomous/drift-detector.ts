import { DriftSignal } from './autonomous-types';

export function detectDrift(currentScore: number, expectedScore: number): DriftSignal | null {
  const delta = expectedScore - currentScore;

  if (delta <= 5) return null;

  return {
    driftId: `drift-${Date.now()}`,
    dimension: 'performance',
    severity: delta > 20 ? 'critical' : delta > 10 ? 'high' : 'medium',
    description: `Score drift detected: ${delta} points below expected.`,
    detectedAt: new Date().toISOString(),
  };
}
