import { ComplexityLevel, ExecutionTarget, RouteDecision, Budget, HardwareProfile } from './types';
import { selectProvider } from './provider-router';
import { isLocallySolvable } from './calculation-engine';
import { classifyComplexity } from './classifier';
import { estimateTokens } from './estimator';
import { readHardwareProfile } from './hardware-profile';
import { estimateBudget } from './budget';

export function selectRoute(input: string, mode: 'fast' | 'balanced' | 'deep', overrides?: Partial<{ complexity: ComplexityLevel; budget: Budget; hardware: HardwareProfile }>): RouteDecision {
  const hw = overrides?.hardware ?? readHardwareProfile();
  const { complexity } = overrides?.complexity ? { complexity: overrides.complexity } : classifyComplexity(input);

  const tokens = estimateTokens(input);
  const depth = complexity === 'trivial' ? 1 : complexity === 'simple' ? 2 : complexity === 'moderate' ? 3 : complexity === 'hard' ? 5 : 8;
  const budget = overrides?.budget ?? estimateBudget(depth, tokens);

  if (isLocallySolvable(input)) {
    return { target: 'deterministic', provider: 'mock', model: 'local-engine', reason: 'local deterministic calculation', estimatedCostUsd: 0, estimatedLatencyMs: 1, confidence: 1 };
  }

  const confidence = mode === 'deep' ? 0.95 : mode === 'balanced' ? 0.85 : 0.7;
  const providerDecision = selectProvider(complexity, budget, hw, confidence);

  if (mode === 'fast' && providerDecision.provider !== 'local' && providerDecision.provider !== 'ollama') {
    const hasApiKey = !!(
      (providerDecision.provider === 'openai' && process.env.OPENAI_API_KEY) ||
      (providerDecision.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) ||
      (providerDecision.provider === 'google' && process.env.GOOGLE_API_KEY)
    );
    if (!hasApiKey) {
      return { ...providerDecision, target: 'local', provider: 'mock', model: 'mock-v1', reason: 'fallback to local mock (no API key)', estimatedCostUsd: 0, estimatedLatencyMs: 5, confidence: 0.5 };
    }
  }

  return providerDecision;
}
