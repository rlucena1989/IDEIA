import { OperationalFailure } from './failure-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('fallback-policy');

export interface FallbackAction {
  action: 'retry' | 'skip' | 'degrade' | 'block' | 'switch-target' | 'repair-mode';
  reason: string;
  allowed: boolean;
}

export function resolveFallback(failure: OperationalFailure): FallbackAction {
  if (failure.severity === 'critical' || failure.type === 'critical') {
    return {
      action: 'block',
      reason: 'Critical failure requires block.',
      allowed: false,
    };
  }

  if (failure.type === 'transient') {
    return {
      action: 'retry',
      reason: 'Transient failures may be retried.',
      allowed: true,
    };
  }

  if (failure.type === 'integrity' || failure.type === 'consistency') {
    return {
      action: 'repair-mode',
      reason: 'Integrity or consistency requires repair.',
      allowed: true,
    };
  }

  return {
    action: 'degrade',
    reason: 'Fallback to degraded mode.',
    allowed: true,
  };
}
