export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PlanStatus = 'draft' | 'reviewing' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
export type DecompositionStrategy = 'top_down' | 'bottom_up' | 'hybrid';

export interface AcceptanceCriteria {
  description: string;
  verificationType: 'test' | 'lint' | 'build' | 'manual' | 'security' | 'performance';
  mandatory: boolean;
}

export interface RiskAssessment {
  level: RiskLevel;
  impact: number;
  probability: number;
  factors: string[];
  mitigation: string;
}

export interface CostEstimate {
  estimatedTokens: number;
  estimatedSeconds: number;
  estimatedSteps: number;
  confidence: number;
}

export interface StepDependency {
  stepId: string;
  type: 'requires' | 'blocked_by' | 'optional' | 'parallel_with';
}

export interface PlannedStep {
  id: string;
  title: string;
  description: string;
  agentRole: string;
  status: StepStatus;
  dependencies: StepDependency[];
  acceptanceCriteria: AcceptanceCriteria[];
  risk: RiskAssessment;
  cost: CostEstimate;
  fallbackPlan?: PlannedStep[];
  tags: string[];
}

export interface Plan {
  id: string;
  goal: string;
  strategy: DecompositionStrategy;
  steps: PlannedStep[];
  status: PlanStatus;
  risk: RiskAssessment;
  totalCost: CostEstimate;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}
