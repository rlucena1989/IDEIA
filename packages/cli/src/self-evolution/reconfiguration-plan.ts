import { EvolutionPlan, EvolutionChange } from './evolution-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('reconfiguration-plan');

export function buildReconfigurationPlan(changes: EvolutionChange[]): EvolutionPlan {
  return {
    planId: `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    changes,
    requiresApproval: changes.some(c => c.type === 'migrate' || c.type === 'replace'),
    rollbackAvailable: true,
  };
}
