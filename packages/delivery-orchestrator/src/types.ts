export type DeployEnvironment = 'development' | 'staging' | 'production';
export type DeployStatus = 'pending' | 'building' | 'testing' | 'deploying' | 'completed' | 'failed' | 'rolled_back';
export type RollbackStrategy = 'full' | 'incremental' | 'blue_green';

export interface CheckCommand {
  name: string;
  command: string;
  args: string[];
  timeout?: number;
}

export interface ReleasePlan {
  version: string;
  environment: DeployEnvironment;
  artifacts: string[];
  checks: string[];
  autoDeploy: boolean;
  createdAt: string;
}

export interface DeployEntry {
  id: string;
  version: string;
  environment: DeployEnvironment;
  status: DeployStatus;
  artifacts: string[];
  checks: { name: string; passed: boolean }[];
  reviewRequired: boolean;
  reviewedBy?: string;
  startedAt: string;
  completedAt?: string;
  rolledBackAt?: string;
  rollbackStrategy?: RollbackStrategy;
  metadata?: Record<string, unknown>;
}

export interface ReviewGateRequest {
  deployId: string;
  reviewer: string;
  approved: boolean;
  reason?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  deployId?: string;
  description: string;
  createdAt: string;
  resolvedAt?: string;
}
