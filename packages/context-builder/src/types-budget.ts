export type CompressionLevel = 'none' | 'light' | 'moderate' | 'aggressive' | 'excluded';

export interface ContextSource {
  id: string;
  name: string;
  type: 'history' | 'document' | 'system' | 'tool' | 'memory' | 'instruction';
  content: string;
  tokenCount: number;
  priority: number;
  isRequired: boolean;
}

export interface SourceNeed {
  sourceId: string;
  minTokens: number;
  desiredTokens: number;
  priority: number;
  urgency: number;
  isRequired: boolean;
}

export interface Allocation {
  sourceId: string;
  allocated: number;
  originalRequest: number;
  compressionRatio: CompressionLevel;
  isExcluded: boolean;
}

export interface TaskProfile {
  taskType: 'code' | 'chat' | 'plan' | 'debug' | 'review' | 'search' | 'generate';
  complexity: 'low' | 'medium' | 'high';
  requiredDomains: string[];
  maxResponseTokens: number;
  expectedSteps: number;
}

export interface UsageReport {
  sourceId: string;
  allocated: number;
  used: number;
  efficiency: number;
  reclaimed?: number;
}

export interface CompressedContext {
  sourceId: string;
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
  level: CompressionLevel;
}

export interface BudgetNegotiatorOptions {
  enableDynamicRenegotiation: boolean;
  renegotiationThreshold: number;
  minTokensPerSource: number;
}
