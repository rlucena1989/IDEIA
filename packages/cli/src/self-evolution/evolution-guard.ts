import { EvolutionPlan } from './evolution-types';

export interface EvolutionCheck {
  allowed: boolean;
  reason: string;
}

export function validateEvolution(plan: EvolutionPlan, healthScore: number): EvolutionCheck {
  if (healthScore < 60 && plan.requiresApproval) {
    return {
      allowed: false,
      reason: 'Health score too low for approved evolution.',
    };
  }

  if (plan.changes.length === 0) {
    return {
      allowed: false,
      reason: 'No changes in evolution plan.',
    };
  }

  return {
    allowed: true,
    reason: 'Evolution plan is allowed.',
  };
}
