import { Scope } from './types';
import { createLogger } from '@ideia/logger';
import { Operation } from './path-validator';
import { YamlScopeRule, IsolationYaml } from './policy-parser';
const logger = createLogger('scope-policy');

export interface ScopeRule {
  allowRead: boolean;
  allowWrite: boolean;
  allowExecute: boolean;
  allowDelete: boolean;
}

export interface ScopePolicyConfig {
  scopes: Partial<Record<Scope, Partial<Record<'from', Partial<Record<Scope, ScopeRule>>>>>>;
  yamlConfig?: IsolationYaml;
}

const DEFAULT_POLICY: ScopePolicyConfig = {
  scopes: {
    self: {
      from: {
        self: { allowRead: true, allowWrite: true, allowExecute: true, allowDelete: true },
        project: { allowRead: true, allowWrite: false, allowExecute: false, allowDelete: false },
        system: { allowRead: true, allowWrite: false, allowExecute: false, allowDelete: false },
      },
    },
    project: {
      from: {
        self: { allowRead: true, allowWrite: true, allowExecute: true, allowDelete: true },
        project: { allowRead: true, allowWrite: true, allowExecute: true, allowDelete: true },
        system: { allowRead: false, allowWrite: false, allowExecute: false, allowDelete: false },
      },
    },
    system: {
      from: {
        self: { allowRead: true, allowWrite: false, allowExecute: false, allowDelete: false },
        project: { allowRead: false, allowWrite: false, allowExecute: false, allowDelete: false },
        system: { allowRead: true, allowWrite: true, allowExecute: true, allowDelete: true },
      },
    },
  },
};

export class ScopePolicy {
  private config: ScopePolicyConfig;

  constructor(config?: Partial<ScopePolicyConfig>) {
    this.config = this.mergeConfig(DEFAULT_POLICY, config);
  }

  isOperationAllowed(operation: Operation, fromScope: Scope, targetScope: Scope): boolean {
    const scopeRules = this.config.scopes[targetScope]?.from?.[fromScope];
    if (!scopeRules) return false;

    switch (operation) {
      case 'read': return scopeRules.allowRead;
      case 'write': return scopeRules.allowWrite;
      case 'execute': return scopeRules.allowExecute;
      case 'delete': return scopeRules.allowDelete;
      default: return false;
    }
  }

  getRule(fromScope: Scope, targetScope: Scope): ScopeRule {
    const defaultRule: ScopeRule = { allowRead: false, allowWrite: false, allowExecute: false, allowDelete: false };
    return this.config.scopes[targetScope]?.from?.[fromScope] ?? defaultRule;
  }

  toConfig(): ScopePolicyConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  private mergeConfig(base: ScopePolicyConfig, overlay?: Partial<ScopePolicyConfig>): ScopePolicyConfig {
    if (!overlay) return JSON.parse(JSON.stringify(base));
    const merged: ScopePolicyConfig = { scopes: {} };

    const allScopes = new Set([...Object.keys(base.scopes), ...Object.keys(overlay.scopes ?? {})]) as Set<Scope>;
    for (const scope of allScopes) {
      const baseScope = base.scopes[scope] as { from: Record<string, ScopeRule> } | undefined;
      const overScope = overlay.scopes?.[scope] as { from: Record<string, ScopeRule> } | undefined;
      const mergedScope: { from: Record<string, ScopeRule> } = { from: {} };

      const allFroms = new Set([...Object.keys(baseScope?.from ?? {}), ...Object.keys(overScope?.from ?? {})]);
      for (const from of allFroms) {
        mergedScope.from[from] = {
          ...(baseScope?.from[from] ?? { allowRead: false, allowWrite: false, allowExecute: false, allowDelete: false }),
          ...(overScope?.from[from] ?? {}),
        };
      }

      merged.scopes[scope] = mergedScope;
    }

    return merged;
  }
}

export function createScopePolicy(config?: Partial<ScopePolicyConfig>): ScopePolicy {
  return new ScopePolicy(config);
}
