export interface ModelSafetyScore {
  model: string;
  provider: string;
  safetyScore: number;
  capabilities: string[];
  rateLimitPerMinute: number;
  maxTokens: number;
  requiresApproval: boolean;
}

export interface RouterConfig {
  preferredModels: string[];
  minSafetyScore: number;
  fallbackToSafe: boolean;
  logRouting: boolean;
}

export interface RouterDecision {
  model: string;
  provider: string;
  safetyScore: number;
  reason: string;
  requiresApproval: boolean;
  alternatives: string[];
}

const MODEL_REGISTRY: ModelSafetyScore[] = [
  { model: 'gpt-4o', provider: 'openai', safetyScore: 0.95, capabilities: ['text', 'code', 'reasoning'], rateLimitPerMinute: 60, maxTokens: 128000, requiresApproval: false },
  { model: 'gpt-4o-mini', provider: 'openai', safetyScore: 0.90, capabilities: ['text', 'code'], rateLimitPerMinute: 120, maxTokens: 128000, requiresApproval: false },
  { model: 'o3-mini', provider: 'openai-reasoning', safetyScore: 0.95, capabilities: ['text', 'code', 'reasoning', 'chain-of-thought'], rateLimitPerMinute: 30, maxTokens: 200000, requiresApproval: false },
  { model: 'o1', provider: 'openai-reasoning', safetyScore: 0.95, capabilities: ['text', 'code', 'reasoning', 'chain-of-thought'], rateLimitPerMinute: 20, maxTokens: 200000, requiresApproval: true },
  { model: 'o1-mini', provider: 'openai-reasoning', safetyScore: 0.90, capabilities: ['text', 'code', 'reasoning', 'chain-of-thought'], rateLimitPerMinute: 40, maxTokens: 128000, requiresApproval: false },
  { model: 'claude-3.5-sonnet', provider: 'anthropic', safetyScore: 0.95, capabilities: ['text', 'code', 'reasoning'], rateLimitPerMinute: 50, maxTokens: 200000, requiresApproval: false },
  { model: 'claude-3-haiku', provider: 'anthropic', safetyScore: 0.90, capabilities: ['text', 'code'], rateLimitPerMinute: 100, maxTokens: 200000, requiresApproval: false },
  { model: 'deepseek-chat', provider: 'deepseek', safetyScore: 0.85, capabilities: ['text', 'code'], rateLimitPerMinute: 100, maxTokens: 32000, requiresApproval: false },
  { model: 'deepseek-reasoner', provider: 'deepseek-reasoning', safetyScore: 0.90, capabilities: ['text', 'code', 'reasoning', 'chain-of-thought'], rateLimitPerMinute: 30, maxTokens: 64000, requiresApproval: false },
  { model: 'gemini-2.0-flash', provider: 'gemini', safetyScore: 0.85, capabilities: ['text', 'code', 'vision'], rateLimitPerMinute: 60, maxTokens: 1048576, requiresApproval: false },
  { model: 'gemini-1.5-pro', provider: 'gemini', safetyScore: 0.90, capabilities: ['text', 'code', 'reasoning', 'vision'], rateLimitPerMinute: 30, maxTokens: 2097152, requiresApproval: false },
  { model: 'llama-3.1-70b', provider: 'ollama', safetyScore: 0.80, capabilities: ['text', 'code'], rateLimitPerMinute: 30, maxTokens: 32000, requiresApproval: false },
  { model: 'phi-4-mini', provider: 'ollama', safetyScore: 0.85, capabilities: ['text', 'code'], rateLimitPerMinute: 60, maxTokens: 16000, requiresApproval: false },
  { model: 'mistral-7b', provider: 'ollama', safetyScore: 0.75, capabilities: ['text'], rateLimitPerMinute: 60, maxTokens: 16000, requiresApproval: false },
];

export class SafetyRouter {
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = {
      preferredModels: ['gpt-4o', 'claude-3.5-sonnet'],
      minSafetyScore: 0.80,
      fallbackToSafe: true,
      logRouting: true,
      ...config,
    };
  }

  route(capability: string, context?: { requiresHighSafety?: boolean; userRole?: string }): RouterDecision {
    const minScore = context?.requiresHighSafety ? Math.max(this.config.minSafetyScore, 0.90) : this.config.minSafetyScore;

    const candidates = MODEL_REGISTRY.filter(m => {
      if (m.safetyScore < minScore) return false;
      if (capability === 'all') return true;
      return m.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()));
    });

    const preferred = candidates.filter(m => this.config.preferredModels.includes(m.model));
    const others = candidates.filter(m => !this.config.preferredModels.includes(m.model));
    const sorted = [...preferred, ...others].sort((a, b) => b.safetyScore - a.safetyScore);

    if (sorted.length === 0) {
      if (this.config.fallbackToSafe) {
        const safest = MODEL_REGISTRY.filter(m => m.safetyScore >= minScore)
          .sort((a, b) => b.safetyScore - a.safetyScore);
        if (safest.length > 0) {
          return this.buildDecision(safest[0], 'Fallback para modelo mais seguro disponível', sorted.slice(0, 3));
        }
      }
      return {
        model: '',
        provider: '',
        safetyScore: 0,
        reason: 'Nenhum modelo disponível com safety score mínimo',
        requiresApproval: false,
        alternatives: MODEL_REGISTRY.filter(m => m.safetyScore >= 0.7).map(m => `${m.provider}/${m.model}`),
      };
    }

    const chosen = sorted[0];
    return this.buildDecision(chosen, `Modelo selecionado com safety score ${chosen.safetyScore}`, sorted.slice(1, 4));
  }

  private buildDecision(entry: ModelSafetyScore, reason: string, alternatives: ModelSafetyScore[]): RouterDecision {
    return {
      model: entry.model,
      provider: entry.provider,
      safetyScore: entry.safetyScore,
      reason,
      requiresApproval: entry.requiresApproval,
      alternatives: alternatives.map(m => `${m.provider}/${m.model} (${m.safetyScore})`),
    };
  }

  registerModel(model: ModelSafetyScore): void {
    const idx = MODEL_REGISTRY.findIndex(m => m.model === model.model);
    if (idx >= 0) {
      MODEL_REGISTRY[idx] = model;
    } else {
      MODEL_REGISTRY.push(model);
    }
  }

  getAvailableModels(minSafety?: number): ModelSafetyScore[] {
    const min = minSafety ?? 0;
    return MODEL_REGISTRY.filter(m => m.safetyScore >= min).sort((a, b) => b.safetyScore - a.safetyScore);
  }
}

export function createSafetyRouter(config?: Partial<RouterConfig>): SafetyRouter {
  return new SafetyRouter(config);
}

export { MODEL_REGISTRY };
