import { Scope, IsolationPolicyConfig, CrossSpaceAccess } from './types';

const DEFAULT_POLICY: IsolationPolicyConfig = {
  crossSpaceAccess: 'block',
  bypassRequired: true,
  approvalLevel: 'tech-lead',
  dryRunFirst: true,
};

export class IsolationPolicy {
  private config: IsolationPolicyConfig;

  constructor(config?: Partial<IsolationPolicyConfig>) {
    this.config = { ...DEFAULT_POLICY, ...config };
  }

  get crossSpaceAccess(): CrossSpaceAccess {
    return this.config.crossSpaceAccess;
  }

  get bypassRequired(): boolean {
    return this.config.bypassRequired;
  }

  get approvalLevel(): string {
    return this.config.approvalLevel;
  }

  get dryRunFirst(): boolean {
    return this.config.dryRunFirst;
  }

  toConfig(): IsolationPolicyConfig {
    return { ...this.config };
  }

  evaluate(source: Scope, target: Scope): {
    allowed: boolean;
    bypassRequired: boolean;
    approvalLevel: string;
    reason: string;
  } {
    if (source === target) {
      return {
        allowed: true,
        bypassRequired: false,
        approvalLevel: this.config.approvalLevel,
        reason: `Same-scope access (${source} → ${target}): allowed`,
      };
    }

    if (this.config.dryRunFirst) {
      return {
        allowed: false,
        bypassRequired: true,
        approvalLevel: this.config.approvalLevel,
        reason: `Cross-scope access needs dry-run first (${source} → ${target})`,
      };
    }

    if (this.config.crossSpaceAccess === 'block') {
      return {
        allowed: false,
        bypassRequired: true,
        approvalLevel: this.config.approvalLevel,
        reason: `Cross-space access blocked by policy (${source} → ${target})`,
      };
    }

    if (this.config.crossSpaceAccess === 'allow-with-bypass' && this.config.bypassRequired) {
      return {
        allowed: true,
        bypassRequired: true,
        approvalLevel: this.config.approvalLevel,
        reason: `Cross-space access requires ${this.config.approvalLevel} approval (${source} → ${target})`,
      };
    }

    return {
      allowed: false,
      bypassRequired: true,
      approvalLevel: this.config.approvalLevel,
      reason: `Unknown policy state (${source} → ${target})`,
    };
  }

  update(config: Partial<IsolationPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function createIsolationPolicy(config?: Partial<IsolationPolicyConfig>): IsolationPolicy {
  return new IsolationPolicy(config);
}
