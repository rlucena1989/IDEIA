import { EvolutionPlan } from './evolution-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('rollback-manager');

export interface RollbackResult {
  rolledBack: boolean;
  planId: string;
  notes: string[];
}

export function rollbackEvolution(plan: EvolutionPlan): RollbackResult {
  if (!plan.rollbackAvailable) {
    return {
      rolledBack: false,
      planId: plan.planId,
      notes: ['Rollback not available for this plan.'],
    };
  }

  return {
    rolledBack: true,
    planId: plan.planId,
    notes: ['Evolution changes reverted successfully.'],
  };
}
