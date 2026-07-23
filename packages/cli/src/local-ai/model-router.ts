/**
 * model-router.ts — Model Routing (Item 5)
 *
 * Roteia requisições para SLM (Phi-4-mini) ou LLM maior baseado
 * em complexidade da tarefa, custo e restrições do Economic Control.
 */

export type ModelTier = 'slm' | 'llm' | 'reasoning';

export interface RouteInput {
  taskType: string;
  description: string;
  maxCost?: number;
  requiredCapabilities?: string[];
}

export interface RouteDecision {
  tier: ModelTier;
  model: string;
  reason: string;
  estimatedTokens: number;
  estimatedCost: number;
}

const TIERS: Record<ModelTier, { model: string; maxTokens: number; costPer1K: number; capabilities: string[] }> = {
  slm: { model: 'phi-4-mini', maxTokens: 4096, costPer1K: 0, capabilities: ['chat', 'code-gen', 'classify'] },
  llm: { model: 'qwen2.5-coder-7b', maxTokens: 32768, costPer1K: 0, capabilities: ['chat', 'code-gen', 'reasoning', 'planning'] },
  reasoning: { model: 'deepseek-r1:7b', maxTokens: 65536, costPer1K: 0, capabilities: ['complex-reasoning', 'architecture', 'decomposition'] },
};

export class ModelRouter {
  route(input: RouteInput): RouteDecision {
    const wordCount = input.description.split(/\s+/).length;
    const estimatedTokens = Math.ceil(wordCount * 1.5) + 500;

    if (input.taskType === 'design' || input.taskType === 'strategy' || input.taskType === 'migration') {
      return this.decide('reasoning', 'Complex architectural task', estimatedTokens);
    }

    if (input.taskType === 'audit' || input.taskType === 'refactor' || input.taskType === 'deploy') {
      return this.decide('llm', 'Requires full context understanding', estimatedTokens);
    }

    if (wordCount > 200 || estimatedTokens > 2000) {
      return this.decide('llm', 'Long task requiring larger context', estimatedTokens);
    }

    return this.decide('slm', 'Simple task suitable for SLM', estimatedTokens);
  }

  private decide(tier: ModelTier, reason: string, tokens: number): RouteDecision {
    const t = TIERS[tier];
    return {
      tier,
      model: t.model,
      reason,
      estimatedTokens: tokens,
      estimatedCost: (tokens / 1000) * t.costPer1K,
    };
  }
}
