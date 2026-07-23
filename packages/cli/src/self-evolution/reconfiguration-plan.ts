import { EvolutionPlan, EvolutionChange } from './evolution-types';

export function buildReconfigurationPlan(changes: EvolutionChange[]): EvolutionPlan {
  return {
    planId: `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    changes,
    requiresApproval: changes.some(c => c.type === 'migrate' || c.type === 'replace'),
    rollbackAvailable: true,
  };
}
