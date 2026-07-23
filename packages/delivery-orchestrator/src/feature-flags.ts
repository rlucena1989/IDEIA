/**
 * feature-flags.ts — Feature Flags Integration (Item 8)
 *
 * Sistema de feature flags para liberação gradual de funcionalidades.
 * Suporte a: percentage rollout, user segments, environment targeting.
 */

export interface FlagDefinition {
  key: string;
  description: string;
  owner: string;
  createdAt: string;
  rules: FlagRule[];
}

export interface FlagRule {
  type: 'percentage' | 'segment' | 'environment' | 'user';
  value: string | number;
  enabled: boolean;
}

export interface FlagEvaluation {
  key: string;
  enabled: boolean;
  reason: string;
}

export class FeatureFlags {
  private flags: Map<string, FlagDefinition> = new Map();

  register(flag: FlagDefinition): void {
    this.flags.set(flag.key, flag);
  }

  isEnabled(key: string, context: { userId?: string; environment?: string; segments?: string[] }): FlagEvaluation {
    const flag = this.flags.get(key);
    if (!flag) return { key, enabled: false, reason: 'Flag not found' };

    for (const rule of flag.rules) {
      if (rule.type === 'environment' && context.environment === rule.value) {
        return { key, enabled: rule.enabled, reason: `Environment rule: ${rule.value}` };
      }
      if (rule.type === 'percentage' && context.userId) {
        const hash = this.hashUserId(context.userId);
        const enabled = hash % 100 < Number(rule.value);
        if (enabled !== rule.enabled) continue;
        return { key, enabled, reason: `Percentage rollout: ${rule.value}%` };
      }
      if (rule.type === 'segment' && context.segments?.includes(String(rule.value))) {
        return { key, enabled: rule.enabled, reason: `Segment rule: ${rule.value}` };
      }
      if (rule.type === 'user' && context.userId === rule.value) {
        return { key, enabled: rule.enabled, reason: `User-specific rule` };
      }
    }

    return { key, enabled: false, reason: 'No matching rules' };
  }

  listFlags(): FlagDefinition[] {
    return Array.from(this.flags.values());
  }

  private hashUserId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
