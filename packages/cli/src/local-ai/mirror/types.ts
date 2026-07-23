/** Interface que define a estrutura de mirror entry. */
export interface MirrorEntry {
  seq: number;
  timestamp: string;
  promptHash: string;
  prompt: string;
  responseHash: string;
  response: string;
  modelId: string;
  provider: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  command: string;
  status: 'success' | 'error';
  error?: string;
  prevHash: string;
  thisHash: string;
}

/** Interface que define a estrutura de mirror query. */
export interface MirrorQuery {
  promptHash?: string;
  modelId?: string;
  provider?: string;
  command?: string;
  limit?: number;
  offset?: number;
}

/** Interface que define a estrutura de replay result. */
export interface ReplayResult {
  original: MirrorEntry;
  replay: {
    response: string;
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    modelId: string;
    provider: string;
    status: 'success' | 'error';
    error?: string;
  };
  diff: {
    identical: boolean;
    similarityScore: number;
    lengthDelta: number;
  };
}

/** Interface que define a estrutura de mirror config. */
export interface MirrorConfig {
  enabled: boolean;
  privacy_mode: boolean;
}

/** Processa e f a u l t_ m i r r o r_ c o n f i g. */
export const DEFAULT_MIRROR_CONFIG: MirrorConfig = {
  enabled: false,
  privacy_mode: false,
};
