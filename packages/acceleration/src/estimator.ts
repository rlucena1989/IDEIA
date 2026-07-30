import { ComplexityLevel } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('estimator');

const TOKENS_PER_CHAR = 0.35;
const MS_PER_TOKEN_FAST = 2;
const MS_PER_TOKEN_BALANCED = 5;
const MS_PER_TOKEN_DEEP = 15;
const USD_PER_TOKEN_GPT4 = 0.00001;
const USD_PER_TOKEN_LOCAL = 0.0000005;

export function estimateTokens(input: string): number {
  return Math.ceil(input.length * TOKENS_PER_CHAR);
}

export function estimateTimeMs(tokens: number, complexity: ComplexityLevel, mode: 'fast' | 'balanced' | 'deep'): number {
  const base = tokens * (mode === 'fast' ? MS_PER_TOKEN_FAST : mode === 'deep' ? MS_PER_TOKEN_DEEP : MS_PER_TOKEN_BALANCED);
  const depthMultiplier = complexity === 'extreme' ? 3 : complexity === 'hard' ? 2 : 1;
  return base * depthMultiplier;
}

export function estimateCostUsd(tokens: number, complexity: ComplexityLevel, provider: 'local' | 'remote'): number {
  const rate = provider === 'local' ? USD_PER_TOKEN_LOCAL : USD_PER_TOKEN_GPT4;
  const mult = complexity === 'extreme' ? 2.5 : complexity === 'hard' ? 1.8 : 1;
  return tokens * rate * mult;
}

export function estimateTotal(input: string, complexity: ComplexityLevel, mode: 'fast' | 'balanced' | 'deep', provider: 'local' | 'remote') {
  const tokens = estimateTokens(input);
  return {
    tokens,
    timeMs: estimateTimeMs(tokens, complexity, mode),
    costUsd: Math.round(estimateCostUsd(tokens, complexity, provider) * 10000) / 10000
  };
}
