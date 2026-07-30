import { EvolutionDecision, EvolutionDecisionContext } from './decision-types';
import { createLogger } from '@ideia/logger';
import { EvolutionPolicy, DEFAULT_EVOLUTION_POLICY } from './evolution-policy';
const logger = createLogger('decision-engine');

export function decideEvolution(
  ctx: EvolutionDecisionContext,
  policy: EvolutionPolicy = DEFAULT_EVOLUTION_POLICY
): EvolutionDecision {
  if (ctx.hardeningScore < policy.minHardeningScore || ctx.consistencyScore < policy.minConsistencyScore) {
    return {
      action: 'repair',
      rationale: 'Hardening or consistency below operational threshold.',
      risk: 'high',
      confidence: 0.9,
      requiresApproval: policy.requireApprovalOnRepair,
    };
  }

  if (policy.blockOnCriticalDelta && ctx.deltaSummary.critical > 0) {
    return {
      action: 'block',
      rationale: 'Critical delta detected in state evolution.',
      risk: 'critical',
      confidence: 0.98,
      requiresApproval: true,
    };
  }

  if (ctx.generationScore < policy.minGenerationScore) {
    return {
      action: 'generate',
      rationale: 'Generation layer needs materialization improvement.',
      risk: 'medium',
      confidence: 0.84,
      requiresApproval: false,
    };
  }

  return {
    action: 'sync',
    rationale: 'System is healthy and should synchronize current state.',
    risk: 'low',
    confidence: 0.92,
    requiresApproval: false,
  };
}
