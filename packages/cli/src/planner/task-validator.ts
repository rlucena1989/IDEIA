import type { TaskSpec, ValidationResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('task-validator');

export function validateTaskContext(task: TaskSpec): ValidationResult {
  const reasons: string[] = [];

  if (!task.sourceDocument) reasons.push('Missing source document');
  if (task.context.length === 0) reasons.push('Missing context');
  if (task.expectedOutputs.length === 0) reasons.push('Missing expected outputs');

  return { valid: reasons.length === 0, reasons };
}

export function validateTaskScope(task: TaskSpec): ValidationResult {
  const reasons: string[] = [];

  if (task.constraints.length === 0 && task.riskLevel === 'critical') {
    reasons.push('Critical task requires explicit constraints');
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateDependencies(task: TaskSpec): ValidationResult {
  const reasons: string[] = [];

  if (task.expectedOutputs.length === 0) {
    reasons.push('No expected outputs defined — cannot validate completion');
  }
  if (task.context.length === 0) {
    reasons.push('No context provided — cannot validate dependencies');
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateExecutionMode(task: TaskSpec): ValidationResult {
  const reasons: string[] = [];

  if (task.requiresApproval && !task.sourceDocument) {
    reasons.push('Task requires approval but has no source document for context');
  }
  if (task.riskLevel === 'critical' && task.expectedOutputs.length === 0) {
    reasons.push('Critical task must define expected outputs before execution');
  }

  return { valid: reasons.length === 0, reasons };
}
