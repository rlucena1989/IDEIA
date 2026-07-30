export type DAGNodeRole = 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops' | 'supervisor';

export type DAGNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'paused' | 'cancelled';

export type DAGExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

export type SupervisorDecisionType = 'proceed' | 'requestReview' | 'stop';

export interface DAGNode {
  id: string;
  role: DAGNodeRole;
  status: DAGNodeStatus;
  timeoutMs: number;
  attempt: number;
  maxRetries: number;
}

export interface DAGEdge {
  from: string;
  to: string;
  condition?: (results: Map<string, NodeResult>) => boolean;
}

export interface NodeResult {
  nodeId: string;
  role: string;
  status: DAGNodeStatus;
  output: string;
  errors: string[];
  durationMs: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface SupervisorDecision {
  type: SupervisorDecisionType;
  reason: string;
  requiresHumanIntervention: boolean;
  autoApproved: boolean;
  score: number;
  details: Record<string, unknown>;
}

export interface DAGExecution {
  id: string;
  task: string;
  status: DAGExecutionStatus;
  nodes: DAGNode[];
  edges: DAGEdge[];
  results: Map<string, NodeResult>;
  currentNodeId: string | null;
  startedAt: number | null;
  completedAt: number | null;
  pausedAt: number | null;
  error: string | null;
}

export interface DAGConfig {
  defaultTimeoutMs: number;
  defaultMaxRetries: number;
  autoApprovalScoreThreshold: number;
  requireHumanOnScoreBelow: number;
  enableCheckpoints: boolean;
}

export const DEFAULT_DAG_CONFIG: DAGConfig = {
  defaultTimeoutMs: 300000,
  defaultMaxRetries: 3,
  autoApprovalScoreThreshold: 0.8,
  requireHumanOnScoreBelow: 0.4,
  enableCheckpoints: true,
};

export const DAG_NODE_ROLES: DAGNodeRole[] = [
  'analyst',
  'architect',
  'programmer',
  'reviewer',
  'tester',
  'devops',
];
