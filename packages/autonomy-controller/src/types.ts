export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export type Environment = 'dev' | 'staging' | 'production';

export type VerificationLevel = 'none' | 'basic' | 'full';

export interface AutonomyContext {
  taskRisk: number;
  reversibility: number;
  dataSensitivity: number;
  historicalSuccess: number;
  taskSimilarity: number;
  userTrustScore: number;
  environment: Environment;
  projectMaturity: number;
  hasRollback: boolean;
  maxAutonomyLevel: AutonomyLevel;
  requiresApproval: string[];
}

export interface AutonomyLimits {
  maxFilesChanged: number;
  maxTokensConsumed: number;
  requiresApproval: boolean;
  sandboxRequired: boolean;
  canAccessSecrets: boolean;
  canExecuteDeploy: boolean;
  verificationLevel: VerificationLevel;
  rollbackRequired: boolean;
}

export interface AutonomyResult {
  level: AutonomyLevel;
  limits: AutonomyLimits;
  exception: Exception | null;
  rationale: string;
}

export interface TaskOutcome {
  success: boolean;
  quality: number;
  errors: string[];
}

export interface TrustMetrics {
  totalTasks: number;
  successes: number;
  failures: number;
  avgQuality: number;
  recentTrend: number[];
}

export interface Exception {
  id: string;
  taskId: string;
  agentId: string;
  exceededLimit: string;
  requestedLevel: AutonomyLevel;
  grantedLevel: AutonomyLevel;
  justification: string;
  approvedBy: string;
  expiresAt: Date | null;
  auditEntry: string;
}

export interface Task {
  id: string;
  assignedAgent: string;
  risk: number;
  type: string;
  filesChanged: number;
  tokensConsumed: number;
  accessSecrets: boolean;
  isDeploy: boolean;
  description: string;
}
