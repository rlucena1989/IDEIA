import path from 'path';
import { createLogger } from '@ideia/logger';
import { Scope } from './types';
import { Operation, ValidationResult } from './path-validator';
import { PolicyParser, ParsedIsolationPolicy } from './policy-parser';
import { ScopePolicy } from './scope-policy';
const logger = createLogger('policy-enforcer');

export class PolicyEnforcer {
  private policy: ParsedIsolationPolicy | null = null;
  private scopePolicy: ScopePolicy;

  constructor(scopePolicy?: ScopePolicy) {
    this.scopePolicy = scopePolicy ?? new ScopePolicy();
  }

  load(policy: ParsedIsolationPolicy): void {
    this.policy = policy;
  }

  loadFromDir(dirPath: string): void {
    const yamlPath = path.join(dirPath, 'isolation.yaml');
    this.policy = PolicyParser.parseFile(yamlPath);
  }

  enforce(operation: Operation, targetPath: string, fromScope: Scope): ValidationResult {
    const resolvedPath = path.resolve(targetPath);
    const targetScope = this.detectScope(resolvedPath);

    if (!this.policy) {
      const policyAllowed = this.scopePolicy.isOperationAllowed(operation, fromScope, targetScope);
      return {
        allowed: policyAllowed,
        reason: policyAllowed ? 'Approved by scope policy' : `Denied by scope policy: ${fromScope} cannot ${operation} on ${targetScope}`,
        resolvedPath,
      };
    }

    const allowed = PolicyParser.isOperationAllowed(this.policy, operation, fromScope, targetScope);
    return {
      allowed,
      reason: allowed ? 'Approved by isolation policy' : `Denied by isolation policy: ${fromScope} cannot ${operation} on ${targetScope}`,
      resolvedPath,
    };
  }

  isLoaded(): boolean {
    return this.policy !== null;
  }

  private detectScope(resolvedPath: string): Scope {
    const normalized = resolvedPath.replace(/\\/g, '/');
    if (normalized.includes('/.ideia/') || normalized.includes('/.ai/')) return 'self';
    if (normalized.includes('/node_modules/') || normalized.includes('/.git/')) return 'system';
    return 'project';
  }
}

export function createPolicyEnforcer(scopePolicy?: ScopePolicy): PolicyEnforcer {
  return new PolicyEnforcer(scopePolicy);
}
