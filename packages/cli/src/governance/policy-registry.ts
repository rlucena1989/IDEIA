import { GovernancePolicy } from './policy-types';

export class PolicyRegistry {
  private policies: GovernancePolicy[] = [];

  register(policy: GovernancePolicy): void {
    const idx = this.policies.findIndex(p => p.policyId === policy.policyId);
    if (idx >= 0) {
      this.policies[idx] = policy;
      return;
    }
    this.policies.push(policy);
  }

  get(policyId: string): GovernancePolicy | undefined {
    return this.policies.find(p => p.policyId === policyId);
  }

  list(): GovernancePolicy[] {
    return [...this.policies];
  }

  remove(policyId: string): boolean {
    const idx = this.policies.findIndex(p => p.policyId === policyId);
    if (idx < 0) return false;
    this.policies.splice(idx, 1);
    return true;
  }

  clear(): void {
    this.policies = [];
  }
}
