import { SimulationResult } from './simulation-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('simulation-validator');

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

export function validatePrediction(result: SimulationResult): ValidationResult {
  const reasons: string[] = [];

  if (!result.ok) reasons.push('Simulation indicates failure.');
  if (result.riskLevel === 'critical') reasons.push('Critical risk detected.');
  if (result.riskLevel === 'high') reasons.push('High risk — requires review.');

  return {
    valid: reasons.length === 0,
    reasons,
  };
}
