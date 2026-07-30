import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('self-correction-engine');

export interface SelfCorrectionAction {
  actionId: string;
  description: string;
  allowed: boolean;
  appliedAt?: string;
}

export function createCorrectionAction(description: string, allowed: boolean): SelfCorrectionAction {
  return {
    actionId: crypto.randomUUID(),
    description,
    allowed,
  };
}

export function applySelfCorrection(actions: SelfCorrectionAction[]): SelfCorrectionAction[] {
  return actions.map(action => ({
    ...action,
    appliedAt: action.allowed ? new Date().toISOString() : undefined,
  }));
}
