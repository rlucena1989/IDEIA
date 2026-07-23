/** Tipo que define task status. */
export type TaskStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'needs-decision'
  | 'completed'
  | 'validated'
  | 'failed';

/** Tipo que define autonomy level. */
export type AutonomyLevel = 'autonomous' | 'guided' | 'blocked';

/** Tipo que define execution mode. */
export type ExecutionMode = 'autonomous' | 'guided' | 'blocked';

/** Tipo que define risk level. */
export type RiskLevel = 'low' | 'medium' | 'high';

/** Tipo que define phase id. */
export type PhaseId =
  | 'diagnosis'
  | 'structuring'
  | 'parallelization'
  | 'checkpoint'
  | 'multi-model'
  | 'decision-routing'
  | 'full-autonomous'
  | 'adaptive-governance'
  | 'industrial-autonomy';

/** Interface que define a estrutura de decision option. */
export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  riskLevel: RiskLevel;
  impact: string;
  recommended?: boolean;
}

/** Interface que define a estrutura de decision request. */
export interface DecisionRequest {
  id: string;
  title: string;
  summary: string;
  context: string;
  reason: string;
  recommendedAction: string;
  options: DecisionOption[];
  customAllowed: boolean;
  checkpointId: string;
  createdAt: string;
}

/** Interface que define a estrutura de decision record. */
export interface DecisionRecord {
  decisionRequestId: string;
  selectedOptionId?: string;
  customValue?: string;
  rationale?: string;
  decidedAt: string;
}

/** Interface que define a estrutura de orchestration checkpoint. */
export interface OrchestrationCheckpoint {
  id: string;
  phase: PhaseId;
  taskId?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  contextHash: string;
  decision?: DecisionRecord;
  metrics?: {
    coverage?: number;
    branches?: number;
    scorecard?: number;
    risk?: number;
    parallel?: boolean;
  };
  nextActions: string[];
  dependencyIds: string[];
  unlockIds: string[];
}

/** Interface que define a estrutura de task node. */
export interface TaskNode {
  id: string;
  name: string;
  description: string;
  phase: PhaseId;
  status: TaskStatus;
  dependsOn: string[];
  blockedBy: string[];
  riskLevel: RiskLevel;
  estimatedEffort: 'minutes' | 'hours' | 'days';
  canParallelize: boolean;
  isDeterministic: boolean;
  requiresLLM: boolean;
  requiredModelTier?: 'local' | 'lightweight' | 'strong';
}

/** Interface que define a estrutura de phase state. */
export interface PhaseState {
  id: PhaseId;
  name: string;
  status: TaskStatus;
  progress: number;
  tasks: TaskNode[];
  completedTasks: number;
  totalTasks: number;
  blockedCount: number;
  startedAt?: string;
  completedAt?: string;
}

/** Interface que define a estrutura de orchestration state. */
export interface OrchestrationState {
  currentPhase: PhaseId;
  version: string;
  phases: PhaseState[];
  pendingDecisions: DecisionRequest[];
  checkpoints: OrchestrationCheckpoint[];
  executionMode: ExecutionMode;
  autonomyLevel: AutonomyLevel;
  confidence: number;
  lastCheckpointId?: string;
  startedAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

/** Interface que define a estrutura de model route result. */
export interface ModelRouteResult {
  taskId: string;
  target: 'local' | 'lightweight' | 'strong' | 'deterministic';
  provider?: string;
  model?: string;
  reason: string;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
  confidence: number;
}

/** Interface que define a estrutura de decomposed task. */
export interface DecomposedTask {
  originalId: string;
  subtasks: TaskNode[];
  dependencies: Array<{ from: string; to: string }>;
  parallelGroups: string[][];
}
