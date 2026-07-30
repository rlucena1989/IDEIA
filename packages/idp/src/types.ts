export type ServiceType = 'api' | 'worker' | 'web' | 'library' | 'cli' | 'infra';
export type ApprovalLevel = 'none' | 'dev' | 'tech-lead' | 'security';
export type RunnerType = 'local' | 'pipeline' | 'webhook';
export type ScorecardGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type GateName = 'commit' | 'pr' | 'release';

export interface ServiceDefinition {
  name: string;
  type: ServiceType;
  owner: string;
  team: string;
  repository: string;
  language: string;
  dependencies: string[];
  apis: string[];
  tags: string[];
  metadata: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface CatalogEntry {
  service: ServiceDefinition;
  score: number;
  grade: ScorecardGrade;
}

export interface TemplateVariable {
  name: string;
  description: string;
  default?: string;
  required: boolean;
  validator?: (value: string) => boolean;
}

export interface TemplateFile {
  path: string;
  content: string;
  executable?: boolean;
}

export interface TemplateCondition {
  variable: string;
  equals?: string;
  notEquals?: string;
  exists?: boolean;
}

export interface GoldenPathTemplate {
  name: string;
  description: string;
  version: string;
  variables: TemplateVariable[];
  files: TemplateFile[];
  conditions: Map<string, TemplateCondition>;
  postActions: string[];
}

export interface ScorecardCheck {
  name: string;
  passed: boolean;
  weight: number;
  category: string;
  detail?: string;
}

export interface ScorecardResult {
  service: string;
  score: number;
  maxScore: number;
  grade: ScorecardGrade;
  checks: ScorecardCheck[];
  timestamp: number;
}

export interface ScorecardSnapshot {
  service: string;
  score: number;
  maxScore: number;
  grade: ScorecardGrade;
  timestamp: number;
  checks: ScorecardCheck[];
}

export interface GateRule {
  category: string;
  minScore: number;
  weight: number;
  blocking: boolean;
}

export interface GateResult {
  service: string;
  composite: number;
  grade: ScorecardGrade;
  passed: boolean;
  failures: string[];
  breakdown: Record<string, { score: number; max: number }>;
  timestamp: number;
}

export interface ActionDefinition {
  name: string;
  description: string;
  category: string;
  parameters: ActionParameter[];
  requiredApproval: ApprovalLevel;
  timeout: number;
  runner: RunnerType;
  webhookUrl?: string;
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'choice';
  description: string;
  required: boolean;
  default?: string | number | boolean;
  choices?: string[];
  validator?: (value: string) => boolean;
}

export interface ActionResult {
  success: boolean;
  action: string;
  output: string;
  duration: number;
  timestamp: number;
  error?: string;
}

export interface ApprovalRequest {
  id: string;
  action: string;
  params: Record<string, string>;
  requestedBy: string;
  requestedAt: number;
  level: ApprovalLevel;
  status: 'pending' | 'approved' | 'denied';
  approvedBy?: string;
  approvedAt?: number;
  reason?: string;
}

export interface BackstageEntity {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    description: string;
    tags: string[];
    annotations: Record<string, string>;
  };
  spec: {
    type: string;
    lifecycle: string;
    owner: string;
    system: string;
    dependsOn?: string[];
    providesApis?: string[];
  };
}

export interface ScaffoldResult {
  success: boolean;
  error?: string;
  dryRun?: boolean;
  files?: string[];
}

export interface IDPOrchestratorConfig {
  autoDiscoverServices: boolean;
  scorecardIntervalMs: number;
  templateDirectories: string[];
  enableBackstageSync: boolean;
}
