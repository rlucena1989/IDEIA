import { HealingAction, HealingPolicy } from './types';

export class HealingPolicyManager {
  private _policies: Map<string, HealingPolicy> = new Map();
  private _actionTimestamps: Map<string, number[]> = new Map();
  private _attemptCounts: Map<string, number> = new Map();

  addPolicy(policy: HealingPolicy): void {
    this._policies.set(policy.policyId, policy);
  }

  removePolicy(policyId: string): boolean {
    return this._policies.delete(policyId);
  }

  getPolicy(policyId: string): HealingPolicy | undefined {
    return this._policies.get(policyId);
  }

  getAllPolicies(): readonly HealingPolicy[] {
    return Array.from(this._policies.values());
  }

  isActionAllowed(action: HealingAction): { allowed: boolean; reason?: string } {
    const matchingPolicies = this._findMatchingPolicies(action);
    if (matchingPolicies.length === 0) {
      return { allowed: true };
    }
    for (const policy of matchingPolicies) {
      if (!policy.enabled) continue;
      const cooldownCheck = this._checkCooldown(action, policy);
      if (!cooldownCheck.allowed) return cooldownCheck;
      const attemptCheck = this._checkMaxAttempts(action, policy);
      if (!attemptCheck.allowed) return attemptCheck;
    }
    return { allowed: true };
  }

  recordAction(action: HealingAction): void {
    const key = this._actionKey(action);
    const timestamps = this._actionTimestamps.get(key) ?? [];
    timestamps.push(Date.now());
    this._actionTimestamps.set(key, timestamps);
    const attempts = this._attemptCounts.get(key) ?? 0;
    this._attemptCounts.set(key, attempts + 1);
  }

  getAttemptCount(action: HealingAction): number {
    return this._attemptCounts.get(this._actionKey(action)) ?? 0;
  }

  getCooldownRemaining(action: HealingAction): number {
    const key = this._actionKey(action);
    const timestamps = this._actionTimestamps.get(key) ?? [];
    if (timestamps.length === 0) return 0;
    const lastTimestamp = timestamps[timestamps.length - 1] as number;
    const matchingPolicies = this._findMatchingPolicies(action);
    if (matchingPolicies.length === 0) return 0;
    const maxCooldown = Math.max(...matchingPolicies
      .filter(p => p.enabled)
      .flatMap(p => p.cooldownRules
        .filter(r => r.actionType === '*' || r.actionType === action.type)
        .map(r => r.cooldownMs)));
    if (maxCooldown === 0) return 0;
    const elapsed = Date.now() - lastTimestamp;
    return Math.max(0, maxCooldown - elapsed);
  }

  private _findMatchingPolicies(action: HealingAction): HealingPolicy[] {
    return Array.from(this._policies.values()).filter(p => {
      if (!p.enabled) return false;
      if (p.targetSelector === '*') return true;
      return action.target.includes(p.targetSelector) || p.targetSelector === action.type;
    });
  }

  private _checkCooldown(action: HealingAction, policy: HealingPolicy): { allowed: boolean; reason?: string } {
    const key = this._actionKey(action);
    const timestamps = this._actionTimestamps.get(key) ?? [];
    if (timestamps.length === 0) return { allowed: true };
    const lastTimestamp = timestamps[timestamps.length - 1] as number;
    for (const rule of policy.cooldownRules) {
      if (rule.actionType !== '*' && rule.actionType !== action.type) continue;
      const elapsed = Date.now() - lastTimestamp;
      if (elapsed < rule.cooldownMs) {
        const remaining = rule.cooldownMs - elapsed;
        return { allowed: false, reason: `Cooldown active for ${action.type} on ${action.target}: ${remaining}ms remaining` };
      }
    }
    return { allowed: true };
  }

  private _checkMaxAttempts(action: HealingAction, policy: HealingPolicy): { allowed: boolean; reason?: string } {
    const key = this._actionKey(action);
    const attempts = this._attemptCounts.get(key) ?? 0;
    if (attempts >= policy.maxAttempts) {
      return { allowed: false, reason: `Max attempts (${policy.maxAttempts}) reached for ${action.type} on ${action.target}` };
    }
    return { allowed: true };
  }

  private _actionKey(action: HealingAction): string {
    return `${action.type}:${action.target}`;
  }
}
