export type PlannerTaskType =
  | 'execution'
  | 'tests'
  | 'strategy'
  | 'refactor'
  | 'audit'
  | 'documentation'
  | 'maintenance'
  | 'deploy'
  | 'design'
  | 'performance'
  | 'configuration'
  | 'migration';

export interface TaskSpec {
  id: string;
  title: string;
  description: string;
  taskType: PlannerTaskType;
  sourceDocument: string;
  context: string[];
  inputs: string[];
  expectedOutputs: string[];
  constraints: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
}

export interface ExecutionStep {
  id: string;
  title: string;
  description: string;
  command?: string;
  dependencies: string[];
  validation?: string;
}

export interface ExecutionPlan {
  taskId: string;
  steps: ExecutionStep[];
  commands: string[];
  checkpoints: string[];
  successCriteria: string[];
  blocked: boolean;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}
