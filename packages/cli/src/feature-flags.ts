export type FlagTarget = 'all' | 'beta' | 'internal' | 'percent';

export interface FlagRule {
  target: FlagTarget;
  percentage?: number;
  users?: string[];
  environments?: string[];
}

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  rules?: FlagRule[];
  owner?: string;
  createdAt: string;
}

export interface FlagEvaluation {
  key: string;
  enabled: boolean;
  reason: string;
}

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  'multi_agent': { key: 'multi_agent', description: 'Orquestração multiagente com LangGraph', enabled: true, owner: 'core', createdAt: '2026-07-18' },
  'nats_event_bus': { key: 'nats_event_bus', description: 'Event Bus distribuído via NATS', enabled: false, rules: [{ target: 'internal' }], owner: 'infra', createdAt: '2026-07-18' },
  'llm_provider_router': { key: 'llm_provider_router', description: 'Roteamento entre Ollama/OpenAI/DeepSeek', enabled: true, owner: 'ai', createdAt: '2026-07-18' },
  'semantic_search': { key: 'semantic_search', description: 'Busca semântica com embeddings', enabled: true, rules: [{ target: 'beta' }], owner: 'memory', createdAt: '2026-07-18' },
  'mcp_protocol': { key: 'mcp_protocol', description: 'Model Context Protocol para tools', enabled: true, owner: 'plugins', createdAt: '2026-07-18' },
  'a2a_protocol': { key: 'a2a_protocol', description: 'Agent-to-Agent communication', enabled: true, owner: 'agents', createdAt: '2026-07-18' },
  'design_system': { key: 'design_system', description: 'Design System com tokens e temas', enabled: true, rules: [{ target: 'beta' }], owner: 'ux', createdAt: '2026-07-18' },
  'intent_classifier': { key: 'intent_classifier', description: 'Classificador de intenção via LLM', enabled: true, owner: 'ai', createdAt: '2026-07-18' },
  'guardrails': { key: 'guardrails', description: 'Guardrails de segurança (input/output/code)', enabled: true, owner: 'security', createdAt: '2026-07-18' },
  'observability': { key: 'observability', description: 'OpenTelemetry tracing + métricas', enabled: false, rules: [{ target: 'internal' }], owner: 'infra', createdAt: '2026-07-18' },
  'output_validation': { key: 'output_validation', description: 'Validação de output do LLM', enabled: true, owner: 'security', createdAt: '2026-07-18' },
  'vector_search': { key: 'vector_search', description: 'VectorSearch para busca híbrida', enabled: true, owner: 'memory', createdAt: '2026-07-18' },
};

export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private overrides: Map<string, boolean> = new Map();

  constructor(initialFlags?: Record<string, FeatureFlag>) {
    const allFlags = { ...DEFAULT_FLAGS, ...initialFlags };
    for (const [key, flag] of Object.entries(allFlags)) this.flags.set(key, flag);
  }

  register(flag: FeatureFlag): void { this.flags.set(flag.key, flag); }
  get(key: string): FeatureFlag | undefined { return this.flags.get(key); }
  list(): FeatureFlag[] { return Array.from(this.flags.values()); }
  delete(key: string): boolean { return this.flags.delete(key); }

  enable(key: string): void { const f = this.flags.get(key); if (f) f.enabled = true; }
  disable(key: string): void { const f = this.flags.get(key); if (f) f.enabled = false; }

  setOverride(key: string, value: boolean): void { this.overrides.set(key, value); }
  clearOverride(key: string): void { this.overrides.delete(key); }
  clearAllOverrides(): void { this.overrides.clear(); }

  isEnabled(key: string, context?: { userId?: string; environment?: string }): FlagEvaluation {
    const override = this.overrides.get(key);
    if (override !== undefined) return { key, enabled: override, reason: 'override' };

    const flag = this.flags.get(key);
    if (!flag) return { key, enabled: false, reason: 'flag_not_found' };

    if (!flag.enabled) return { key, enabled: false, reason: 'globally_disabled' };

    if (!flag.rules || flag.rules.length === 0) return { key, enabled: true, reason: 'globally_enabled' };

    for (const rule of flag.rules) {
      const envMatch = rule.environments ? rule.environments.includes(context?.environment ?? '') : true;
      if (!envMatch) continue;

      if (rule.target === 'all') return { key, enabled: true, reason: 'target_all' };

      if (rule.target === 'internal' && context?.userId && rule.users?.includes(context.userId)) {
        return { key, enabled: true, reason: 'user_in_allowlist' };
      }

      if (rule.target === 'beta' && context?.userId && rule.users?.includes(context.userId)) {
        return { key, enabled: true, reason: 'beta_user' };
      }

      if (rule.target === 'percent' && rule.percentage && context?.userId) {
        const hash = this.hashString(context.userId) % 100;
        if (hash < rule.percentage) return { key, enabled: true, reason: `percent_${rule.percentage}` };
      }

    }

    return { key, enabled: false, reason: 'no_rules_match' };
  }

  getEnabledFlags(context?: { userId?: string; environment?: string }): string[] {
    const enabled: string[] = [];
    for (const key of this.flags.keys()) {
      if (this.isEnabled(key, context).enabled) enabled.push(key);
    }
    return enabled;
  }

  private hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export function createFeatureFlags(initial?: Record<string, FeatureFlag>): FeatureFlagManager {
  return new FeatureFlagManager(initial);
}
