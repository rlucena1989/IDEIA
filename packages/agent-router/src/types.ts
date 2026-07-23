export type ComplexityLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type AgentRole = 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops' | 'supervisor';

export interface ComplexityCriteria {
  fileCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedSteps: number;
  requiresHistoricalContext: boolean;
  environmentSensitivity: 'dev' | 'staging' | 'production';
  dependencies: number;
  hasUI: boolean;
  hasDatabase: boolean;
  hasExternalAPI: boolean;
}

export interface RoutePipeline {
  level: ComplexityLevel;
  requiredAgents: AgentRole[];
  requirePlan: boolean;
  requireVerification: boolean;
  requireApproval: boolean;
  parallelAgents: boolean;
  maxSteps: number;
  tokenBudget: number;
  stages: string[];
}

export interface AgentOpinion {
  agentRole: AgentRole;
  decision: string;
  confidence: number;
  evidence: string[];
  alternatives?: string[];
}

export interface ConsensusResult {
  reached: boolean;
  finalDecision: string;
  confidence: number;
  supportingAgents: AgentRole[];
  dissentingAgents: AgentRole[];
  rationale: string;
}

export interface FusionInput {
  agentRole: AgentRole;
  output: string;
  confidence: number;
  artifacts: string[];
}

export interface FusionResult {
  merged: string;
  conflicts: string[];
  artifacts: string[];
  confidence: number;
}

export interface ClassificationResult {
  level: ComplexityLevel;
  reasons: string[];
  confidence: number;
  estimatedTokens: number;
}
