import { EvolutionPlan, EvolutionResult } from './evolution-types';

export function applyReconfiguration(plan: EvolutionPlan): EvolutionResult {
  return {
    planId: plan.planId,
    applied: true,
    appliedAt: new Date().toISOString(),
    notes: plan.changes.map(c => `${c.type}: ${c.target} (${c.reason})`),
  };
}
