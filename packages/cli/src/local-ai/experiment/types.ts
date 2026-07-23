/** Interface que define a estrutura de experiment run. */
export interface ExperimentRun {
  id: string;
  prompt: string;
  promptHash: string;
  createdAt: string;
  results: ExperimentResult[];
}

/** Interface que define a estrutura de experiment result. */
export interface ExperimentResult {
  modelId: string;
  provider: string;
  response: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
  qualityScore?: number;
}

/** Interface que define a estrutura de experiment report. */
export interface ExperimentReport {
  experimentId: string;
  promptHash: string;
  totalModels: number;
  fastest: { modelId: string; latencyMs: number };
  cheapest: { modelId: string; costUsd: number };
  mostTokens: { modelId: string; tokensOut: number };
  results: ExperimentResult[];
  ranking?: ExperimentResult[];
}

/** Interface que define a estrutura de experiment index. */
export interface ExperimentIndex {
  experiments: Array<{ id: string; createdAt: string; promptHash: string; modelCount: number }>;
}
