import type { TaskSpec, PlannerTaskType } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('task-spec');

export function inferTaskType(input: string): PlannerTaskType {
  const value = input.toLowerCase();

  if (value.includes('test') || value.includes('coverage')) return 'tests';
  if (value.includes('refactor') || value.includes('refator')) return 'refactor';
  if (value.includes('audit') || value.includes('auditoria')) return 'audit';
  if (value.includes('doc') || value.includes('document')) return 'documentation';
  if (value.includes('strategy') || value.includes('roadmap')) return 'strategy';
  if (value.includes('maint') || value.includes('manuten')) return 'maintenance';
  return 'execution';
}

export function createTaskSpec(params: {
  id: string;
  title: string;
  description: string;
  sourceDocument: string;
  context?: string[];
  inputs?: string[];
  expectedOutputs?: string[];
  constraints?: string[];
  riskLevel?: TaskSpec['riskLevel'];
  requiresApproval?: boolean;
}): TaskSpec {
  const taskType = inferTaskType(`${params.title} ${params.description}`);

  return {
    id: params.id,
    title: params.title,
    description: params.description,
    taskType,
    sourceDocument: params.sourceDocument,
    context: params.context ?? [],
    inputs: params.inputs ?? [],
    expectedOutputs: params.expectedOutputs ?? [],
    constraints: params.constraints ?? [],
    riskLevel: params.riskLevel ?? 'medium',
    requiresApproval: params.requiresApproval ?? false,
  };
}

export function validateTaskSpec(task: TaskSpec): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!task.id) reasons.push('Missing task id');
  if (!task.title) reasons.push('Missing title');
  if (!task.description) reasons.push('Missing description');
  if (!task.sourceDocument) reasons.push('Missing source document');
  if (task.context.length === 0) reasons.push('Empty context');
  if (task.expectedOutputs.length === 0) reasons.push('Empty expected outputs');

  return { valid: reasons.length === 0, reasons };
}
