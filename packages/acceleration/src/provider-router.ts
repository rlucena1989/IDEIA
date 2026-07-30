import { ProviderKind, RouteDecision, ComplexityLevel, Budget, HardwareProfile } from './types';
import { createLogger } from '@ideia/logger';
import { listModels } from './cost-model';
import { estimateLatencyMs } from './latency-model';
import { tierFromHardware } from './hardware-profile';
const logger = createLogger('provider-router');

interface RouteOption {
  provider: ProviderKind;
  model: string;
  score: number;
  reason: string;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
}

export function rankProviders(
  complexity: ComplexityLevel,
  budget: Budget,
  hardware: HardwareProfile,
  _requiredConfidence: number
): RouteOption[] {
  const options: RouteOption[] = [];
  const models = listModels();

  for (const entry of models) {
    if (entry.maxTokens < budget.tokensMax) continue;
    const baseCost = entry.costPer1kInputTokens;
    const costScore = Math.max(0, 1 - baseCost / 0.01);
    const latency = estimateLatencyMs(entry.provider, entry.model, budget.tokensMax);
    const latencyScore = Math.max(0, 1 - latency / budget.latencyMaxMs);
    const hardwareTier = tierFromHardware(hardware);
    const hardwareScore = entry.provider === 'local' || entry.provider === 'ollama' ? (hardwareTier === 'high' ? 1 : hardwareTier === 'medium' ? 0.6 : 0.3) : 0.8;

    let score = costScore * 0.3 + latencyScore * 0.3 + hardwareScore * 0.2;
    if (complexity === 'extreme' || complexity === 'hard') score += 0.2;
    if (entry.provider === 'openai' || entry.provider === 'anthropic') score += 0.1;

    options.push({
      provider: entry.provider,
      model: entry.model,
      score: Math.round(score * 100) / 100,
      reason: `cost=${costScore.toFixed(2)} latency=${latencyScore.toFixed(2)} hardware=${hardwareScore.toFixed(2)}`,
      estimatedCostUsd: Math.round(baseCost * (budget.tokensMax / 1000) * 100) / 100,
      estimatedLatencyMs: latency
    });
  }

  return options.sort((a, b) => b.score - a.score);
}

export function selectProvider(
  complexity: ComplexityLevel,
  budget: Budget,
  hardware: HardwareProfile,
  confidence: number
): RouteDecision {
  const ranked = rankProviders(complexity, budget, hardware, confidence);
  if (ranked.length === 0) {
    return { target: 'local', provider: 'mock', model: 'mock-v1', reason: 'no provider available', estimatedCostUsd: 0, estimatedLatencyMs: 0, confidence: 0 };
  }
  const best = ranked[0];
  const isLocal = best.provider === 'local' || best.provider === 'ollama';
  return {
    target: isLocal ? 'local' : 'remote',
    provider: best.provider,
    model: best.model,
    reason: best.reason,
    estimatedCostUsd: best.estimatedCostUsd,
    estimatedLatencyMs: best.estimatedLatencyMs,
    confidence: best.score
  };
}
