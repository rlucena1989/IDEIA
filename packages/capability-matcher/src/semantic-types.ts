export type Complexity = 'simple' | 'moderate' | 'complex';

export type Stage = 'idea' | 'mvp' | 'growth' | 'mature';

export interface SemanticNeed {
  description: string;
  techStack: string[];
  domain: string;
  complexity: Complexity;
  teamSize: number;
  stage: Stage;
}

export interface ProjectProfile {
  language: string;
  framework: string;
  database: string;
  features: string[];
  architecture: string;
  pattern: string;
  testingStrategy: string;
  deployTarget: string;
}

export interface CapabilityMatch {
  capabilityId: string;
  score: number;
  reasoning: string;
}

export interface AgentRecommendation {
  agentId: string;
  confidence: number;
  reason: string;
  suggestedMode: string;
}

export interface ContextPackRecommendation {
  packId: string;
  priority: number;
  reason: string;
}

export interface WorkflowRecommendation {
  workflowId: string;
  confidence: number;
  phases: string[];
}

export interface SemanticMatchResult {
  semanticNeed: SemanticNeed;
  capabilities: CapabilityMatch[];
  agents: AgentRecommendation[];
  contextPacks: ContextPackRecommendation[];
  workflows: WorkflowRecommendation[];
  overallConfidence: number;
  warnings: string[];
}
