import { FinalVerdict } from './consolidation-types';
import { createLogger } from '@ideia/logger';

export interface AutonomyState {
  enabled: boolean;
  level: 'none' | 'assisted' | 'partial' | 'full';
  reason: string;
}

export function resolveAutonomy(verdict: FinalVerdict): AutonomyState {
  if (!verdict.allowAutonomy) {
    return {
      enabled: false,
      level: 'none',
      reason: 'Autonomy disabled by verdict.',
    };
  }

  return {
    enabled: true,
    level: 'assisted',
    reason: 'Assisted autonomy granted.',
  };
}
