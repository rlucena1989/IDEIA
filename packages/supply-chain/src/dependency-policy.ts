import { DependencyPolicy } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('dependency-policy');

export class DependencyPolicyManager {
  private policies: Map<string, DependencyPolicy> = new Map();

  setPolicy(name: string, policy: DependencyPolicy): void {
    this.policies.set(name, policy);
  }

  getPolicy(name: string): DependencyPolicy | undefined {
    return this.policies.get(name);
  }

  check(name: string, version: string, ageDays: number): { allowed: boolean; reasons: string[] } {
    const policy = this.policies.get(name);
    if (!policy) return { allowed: true, reasons: ['no policy defined'] };

    const reasons: string[] = [];

    if (policy.blocked) {
      reasons.push('dependency is blocked');
      return { allowed: false, reasons };
    }

    if (policy.allowedVersions.length > 0 && !policy.allowedVersions.includes(version)) {
      reasons.push(`version ${version} not in allowed list`);
    }

    if (policy.maxAgeDays > 0 && ageDays > policy.maxAgeDays) {
      reasons.push(`dependency age ${ageDays}d exceeds max ${policy.maxAgeDays}d`);
    }

    if (policy.requireAudit) {
      reasons.push('requires audit - manual check needed');
    }

    return { allowed: reasons.length === 0, reasons };
  }

  getAllPolicies(): DependencyPolicy[] {
    return Array.from(this.policies.values());
  }

  removePolicy(name: string): void {
    this.policies.delete(name);
  }
}
