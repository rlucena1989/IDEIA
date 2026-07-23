import { RecoveryPlan } from './recovery-plan';

export interface RecoveryResult {
  ok: boolean;
  planId: string;
  appliedSteps: string[];
  notes: string[];
}

export function executeRecovery(plan: RecoveryPlan): RecoveryResult {
  const appliedSteps = plan.steps.filter(s => s.required).map(s => s.stepId);

  return {
    ok: !plan.escalationRequired,
    planId: plan.planId,
    appliedSteps,
    notes: plan.escalationRequired
      ? ['Escalation required after recovery execution.']
      : ['Recovery executed successfully.'],
  };
}
