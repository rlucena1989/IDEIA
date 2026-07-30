export type RobotType = 'code' | 'test' | 'doc' | 'infra' | 'physical';

export type RobotStatus = 'idle' | 'busy' | 'fault' | 'maintenance';

export type RobotTaskType =
  | 'CODE_SCAFFOLD'
  | 'CODE_GENERATE'
  | 'CODE_FORMAT'
  | 'CODE_REFACTOR'
  | 'TEST_UNIT'
  | 'TEST_INTEGRATION'
  | 'TEST_E2E'
  | 'TEST_MUTATION'
  | 'DOC_TECHNICAL'
  | 'DOC_USER'
  | 'DOC_API'
  | 'DOC_CHANGELOG'
  | 'INFRA_DEPLOY'
  | 'INFRA_BACKUP'
  | 'INFRA_MONITOR'
  | 'INFRA_SECURITY'
  | 'PHYSICAL_ACTION';

export interface RobotCapability {
  id: string;
  name: string;
  description: string;
  taskTypes: RobotTaskType[];
  maxConcurrency: number;
}

export interface SafetyConstraint {
  type: 'canary' | 'autoRollback' | 'timeout' | 'resourceLimit';
  value: number | string | Record<string, unknown>;
}

export interface VerificationCriterion {
  metric: string;
  expected: number | string | Record<string, unknown>;
}

export interface RobotTask {
  id: string;
  type: RobotTaskType;
  scope: string[];
  input: Record<string, unknown>;
  permissions: string[];
  timeout: number;
  safetyConstraints: SafetyConstraint[];
  verificationCriteria: VerificationCriterion[];
}

export interface RobotMetrics {
  totalTasks: number;
  successRate: number;
  avgDuration: number;
  errorRate: number;
  utilization: number;
  mttr: number;
}

export interface RobotResult {
  taskId: string;
  status: 'success' | 'failure' | 'partial' | 'blocked';
  output: Record<string, unknown>;
  metrics: {
    duration: number;
    resourceUsage: { cpuPercent: number; memoryMb: number; networkKb: number };
    errorCount: number;
  };
  artifacts: string[];
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  hash: string;
}

export interface RobotRegistration {
  id: string;
  type: RobotType;
  name: string;
  description: string;
  capabilities: RobotCapability[];
  status: RobotStatus;
  maxConcurrency: number;
  currentLoad: number;
  metrics: RobotMetrics;
  permissions: string[];
}

export interface QueueEntry {
  taskId: string;
  robotId: string;
  priority: number;
  enqueuedAt: string;
  startedAt?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'blocked';
  retryCount: number;
  maxRetries: number;
}
