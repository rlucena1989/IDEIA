import { OperationalFailure } from './failure-types';

export interface RecoveryStep {
  stepId: string;
  description: string;
  action: string;
  required: boolean;
}

export interface RecoveryPlan {
  planId: string;
  createdAt: string;
  failureId: string;
  steps: RecoveryStep[];
  escalationRequired: boolean;
}

export function buildRecoveryPlan(failure: OperationalFailure): RecoveryPlan {
  const steps: RecoveryStep[] = [];

  if (failure.type === 'integrity') {
    steps.push({
      stepId: 'step-verify-checksum',
      description: 'Recalculate and verify checksum.',
      action: 'recalculate-checksum',
      required: true,
    });
  }

  if (failure.type === 'synchronization') {
    steps.push({
      stepId: 'step-resync',
      description: 'Attempt synchronization again.',
      action: 'resync',
      required: true,
    });
  }

  if (failure.type === 'consistency') {
    steps.push({
      stepId: 'step-rebuild-state',
      description: 'Rebuild and validate state.',
      action: 'rebuild-state',
      required: true,
    });
  }

  if (steps.length === 0) {
    steps.push({
      stepId: 'step-retry',
      description: 'Retry the failed operation.',
      action: 'retry',
      required: true,
    });
  }

  return {
    planId: `plan-${failure.failureId}`,
    createdAt: new Date().toISOString(),
    failureId: failure.failureId,
    steps,
    escalationRequired: failure.severity === 'critical',
  };
}
