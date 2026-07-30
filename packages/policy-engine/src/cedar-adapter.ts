import { PolicyResult, PolicyInput } from './policy';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cedar-adapter');

export type CedarEffect = 'permit' | 'forbid';
export type CedarPrincipal = { type: 'user' | 'ai' | 'system'; id?: string };
export type CedarAction = { type: string; resource?: string };
export type CedarCondition = {
  clause: 'if' | 'unless';
  match: 'actionType' | 'resource' | 'riskLevel';
  operator: 'eq' | 'neq' | 'matches' | 'in';
  value: string | string[];
};

export interface CedarPolicy {
  id: string;
  description: string;
  effect: CedarEffect;
  principal?: CedarPrincipal;
  action: CedarAction;
  conditions: CedarCondition[];
  priority: number;
}

export interface CedarPolicySet {
  version: string;
  policies: CedarPolicy[];
}

export function evaluateCedarPolicy(policy: CedarPolicy, input: PolicyInput): boolean {
  if (policy.action.type !== '*' && policy.action.type !== input.actionType) return false;
  if (policy.action.resource && input.resource && policy.action.resource !== input.resource) return false;

  for (const cond of policy.conditions) {
    let actual: string | undefined;
    if (cond.match === 'actionType') actual = input.actionType;
    else if (cond.match === 'resource') actual = input.resource;
    else if (cond.match === 'riskLevel') actual = input.riskLevel;

    let matched = false;
    if (cond.operator === 'eq') matched = actual === cond.value;
    else if (cond.operator === 'neq') matched = actual !== cond.value;
    else if (cond.operator === 'matches' && typeof cond.value === 'string') matched = new RegExp(cond.value).test(actual ?? '');
    else if (cond.operator === 'in' && Array.isArray(cond.value)) matched = cond.value.includes(actual ?? '');

    if (cond.clause === 'unless' && matched) return false;
    if (cond.clause === 'if' && !matched) return false;
  }
  return true;
}

export function evaluateCedarPolicySet(
  policySet: CedarPolicySet,
  input: PolicyInput,
): PolicyResult {
  const sorted = [...policySet.policies].sort((a, b) => b.priority - a.priority);
  for (const policy of sorted) {
    if (evaluateCedarPolicy(policy, input)) {
      if (policy.effect === 'forbid') return { decision: 'block', reason: `[Cedar] ${policy.description}` };
      if (policy.effect === 'permit') return { decision: 'auto', reason: `[Cedar] ${policy.description}` };
    }
  }
  return { decision: 'ask', reason: 'No matching Cedar policy' };
}

export function defaultCedarPolicies(): CedarPolicySet {
  return {
    version: '1.0',
    policies: [
      { id: 'p001', description: 'Allow low-risk file reads', effect: 'permit', action: { type: 'file.read' }, conditions: [{ clause: 'if', match: 'riskLevel', operator: 'eq', value: 'low' }], priority: 10 },
      { id: 'p002', description: 'Allow code analysis tools', effect: 'permit', action: { type: 'code.analyze' }, conditions: [], priority: 10 },
      { id: 'p003', description: 'Block destructive shell commands', effect: 'forbid', action: { type: 'shell.exec' }, conditions: [{ clause: 'if', match: 'resource', operator: 'matches', value: 'rm\\s+-rf|format|mkfs|dd' }], priority: 100 },
      { id: 'p004', description: 'Block disk-level operations', effect: 'forbid', action: { type: 'shell.exec' }, conditions: [{ clause: 'if', match: 'resource', operator: 'matches', value: '/dev/sd|diskpart|bcedit' }], priority: 100 },
      { id: 'p005', description: 'Block PowerShell code execution', effect: 'forbid', action: { type: 'shell.exec' }, conditions: [{ clause: 'if', match: 'resource', operator: 'matches', value: 'Invoke-Expression|IEX\\s' }], priority: 100 },
      { id: 'p006', description: 'Block registry operations', effect: 'forbid', action: { type: 'shell.exec' }, conditions: [{ clause: 'if', match: 'resource', operator: 'matches', value: 'reg\\s+delete|vssadmin\\s+delete' }], priority: 100 },
      { id: 'p007', description: 'Deploy to production requires approval', effect: 'forbid', action: { type: 'deploy' }, conditions: [{ clause: 'if', match: 'resource', operator: 'eq', value: 'production' }], priority: 50 },
      { id: 'p008', description: 'Delete operations require approval', effect: 'forbid', action: { type: 'file.delete' }, conditions: [], priority: 50 },
      { id: 'p009', description: 'Policy changes require approval', effect: 'forbid', action: { type: 'policy.change' }, conditions: [], priority: 50 },
      { id: 'p010', description: 'User creation requires approval', effect: 'forbid', action: { type: 'user.create' }, conditions: [], priority: 50 },
      { id: 'p011', description: 'Allow AI non-destructive read operations', effect: 'permit', principal: { type: 'ai' }, action: { type: 'file.read' }, conditions: [], priority: 5 },
      { id: 'p012', description: 'High risk network operations blocked', effect: 'forbid', action: { type: 'network.exec' }, conditions: [{ clause: 'if', match: 'riskLevel', operator: 'eq', value: 'high' }], priority: 100 },
      { id: 'p013', description: 'Allow npm install in safe scope', effect: 'permit', action: { type: 'shell.exec' }, conditions: [{ clause: 'if', match: 'resource', operator: 'matches', value: '^npm\\s+(install|ci|run)' }], priority: 10 },
      { id: 'p014', description: 'Block fork bombs', effect: 'forbid', action: { type: 'shell.exec' }, conditions: [{ clause: 'if', match: 'resource', operator: 'matches', value: ':\\(\\)\\s*\\{' }], priority: 100 },
      { id: 'p015', description: 'Secrets in output blocked', effect: 'forbid', action: { type: 'output.write' }, conditions: [{ clause: 'if', match: 'resource', operator: 'matches', value: 'sk-[A-Za-z0-9]|ghp_|-----BEGIN' }], priority: 100 },
    ],
  };
}