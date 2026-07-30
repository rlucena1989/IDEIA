export interface ProcessedPrompt {
  original: string;
  intent: IntentClassification;
  enriched: string;
  optimized: string;
  tokenCount: number;
  originalTokens: number;
  savings: number;
  guardResult: GuardResult;
  plan?: TaskPlan;
  contextInjected: string[];
  metadata: PromptMetadata;
}

export interface IntentClassification {
  category: 'bugfix' | 'feature' | 'refactor' | 'question' | 'documentation' | 'devops' | 'test' | 'review' | 'unknown';
  scope: 'single_file' | 'multi_file' | 'module' | 'cross_module' | 'project';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  language?: string;
  confidence: number;
}

export interface GuardResult {
  passed: boolean;
  issues: Array<{ severity: 'error' | 'warning'; message: string }>;
  sanitized: string;
}

export interface TaskPlan {
  tasks: Array<{ id: string; description: string; estimatedTokens: number }>;
  totalTokens: number;
  parallel: boolean;
}

export interface PromptMetadata {
  originalLength: number;
  enrichedLength: number;
  optimizedLength: number;
  processingTimeMs: number;
  stagesCompleted: string[];
}

export interface UserPrompt {
  raw: string;
  system?: string;
  files?: string[];
  language?: string;
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
}
