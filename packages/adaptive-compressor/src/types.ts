export interface CompressorConfig {
  targetRatio: number;
  maxSemanticLoss: number;
  taskType: 'code' | 'conversation' | 'documentation' | 'analysis';
  budget: TokenBudget;
  preserveCodeBlocks: boolean;
  preserveUrls: boolean;
  preserveEmails: boolean;
}

export interface TokenBudget {
  softLimit: number;
  hardLimit: number;
  priority: 'speed' | 'quality' | 'cost';
}

export interface CompressionResult {
  text: string;
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
  semanticLoss: number;
  steps: CompressionStep[];
  warnings: string[];
}

export interface CompressionStep {
  strategy: string;
  inputTokens: number;
  outputTokens: number;
  ratio: number;
  loss: number;
}

export interface CompressionEstimate {
  strategies: Array<{ name: string; ratio: number; loss: number }>;
  totalRatio: number;
  estimatedLoss: number;
  recommendedLevel: number;
}

export interface CompressionStrategy {
  name: string;
  expectedRatio: number;
  expectedLoss?: number;
  compress(text: string, config: CompressorConfig): Promise<{ text: string; loss: number }>;
}

export interface ImportanceMap {
  sections: Array<{ text: string; score: number; position: number }>;
  globalScore: number;
}

export interface BudgetResult {
  withinSoft: boolean;
  withinHard: boolean;
  overBy: number;
  action: 'ok' | 'warn' | 'expand';
}

export interface CacheEntry {
  key: string;
  data: string;
  level: 1 | 2 | 3;
  compressedData?: string;
  summaryData?: string;
  accessCount: number;
  lastAccess: number;
  createdAt: number;
  size: number;
  contextType: string;
}

export interface NeuralCompressorConfig {
  vocabSize: number;
  hiddenDim: number;
  numEncoderLayers: number;
  numDecoderLayers: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  gistRatio: number;
  learningRate: number;
}

export interface CacheStats {
  entries: number;
  size: number;
  avgAccessCount: number;
}
