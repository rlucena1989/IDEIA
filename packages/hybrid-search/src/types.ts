export interface SearchQuery {
  text: string;
  embedding?: number[];
  filters?: Record<string, unknown>;
  topK?: number;
  fusionAlgorithm?: FusionAlgorithm;
}

export type FusionAlgorithm = 'rrf' | 'borda' | 'combsum' | 'combmnz' | 'weighted_rrf';

export interface RankedItem {
  id: string;
  score: number;
  rank: number;
  source: 'text' | 'vector' | 'sparse';
  metadata: Record<string, unknown>;
  content: string;
}

export interface FusionResult {
  id: string;
  rrfScore: number;
  individualScores: Record<string, number>;
  metadata: Record<string, unknown>;
  content: string;
}

export interface SearchWeights {
  text: number;
  vector: number;
  sparse: number;
}

export interface SearchContext {
  queryType?: string;
  previousQueries?: string[];
  userFeedback?: Array<{ query: string; clicked: string[]; skipped: string[] }>;
}

export interface ComposeOptions {
  maxTokens?: number;
  minScore?: number;
  includeMetadata?: boolean;
}

export interface ContextOutput {
  documents: FusionResult[];
  contextText: string;
  totalTokens: number;
  searchMetadata: {
    queryType: string;
    fusionAlgorithm: string;
    totalCandidates: number;
    latencyMs: number;
  };
}

export interface DistillationReport {
  mse: number;
  kld: number;
  accuracy: number;
  studentWeights: number[];
  compressionRatio: number;
  distillationLoss: number;
}
