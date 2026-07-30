import { Recommendation } from './recommendation-engine';
import { createLogger } from '@ideia/logger';
import { AdaptivePolicy, DEFAULT_ADAPTIVE_POLICY } from './adaptive-policy';
const logger = createLogger('cycle-controller');

export interface CycleControlResult {
  shouldRepeat: boolean;
  shouldEscalate: boolean;
  nextAction: Recommendation['action'] | 'stop';
  notes: string[];
}

export function controlCycle(
  recommendations: Recommendation[],
  policy: AdaptivePolicy = DEFAULT_ADAPTIVE_POLICY
): CycleControlResult {
  const critical = recommendations.some(r => r.priority === 'critical');
  const repeatedRepair = recommendations.filter(r => r.action === 'repair').length >= 2;
  const highConfidence = recommendations.some(r => r.confidence >= policy.minConfidenceForAutoAction);

  if (critical) {
    return {
      shouldRepeat: false,
      shouldEscalate: true,
      nextAction: 'block',
      notes: ['Critical recommendation found. Escalation required.'],
    };
  }

  if (repeatedRepair) {
    return {
      shouldRepeat: true,
      shouldEscalate: true,
      nextAction: 'review',
      notes: ['Repeated repair pattern detected. Review required.'],
    };
  }

  if (!highConfidence && recommendations.length > 0) {
    return {
      shouldRepeat: false,
      shouldEscalate: false,
      nextAction: 'defer',
      notes: ['Low confidence recommendations. Deferring to next cycle.'],
    };
  }

  return {
    shouldRepeat: false,
    shouldEscalate: false,
    nextAction: recommendations[0]?.action ?? 'stop',
    notes: ['Normal adaptive cycle.'],
  };
}
