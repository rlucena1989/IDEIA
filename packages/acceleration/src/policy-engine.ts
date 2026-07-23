import { EngineMode, ExecutionTarget, ProviderKind } from './types';

export interface Policy {
  id: string;
  description: string;
  appliesTo: { modes?: EngineMode[]; targets?: ExecutionTarget[]; providers?: ProviderKind[] };
  action: 'allow' | 'deny' | 'warn';
  condition?: string;
}

const DEFAULT_POLICIES: Policy[] = [
  { id: 'allow-local', description: 'allow local execution always', appliesTo: { targets: ['local', 'deterministic'] }, action: 'allow' },
  { id: 'warn-remote-cost', description: 'warn when cost exceeds threshold', appliesTo: { providers: ['openai', 'anthropic'] }, action: 'warn', condition: 'cost > 0.05' },
  { id: 'deny-deep-in-fast', description: 'deny deep mode when in fast mode', appliesTo: { modes: ['fast'] }, action: 'deny', condition: 'requestedMode = deep' },
  { id: 'deny-external-no-key', description: 'deny external provider without API key', appliesTo: { providers: ['openai', 'anthropic', 'google'] }, action: 'deny', condition: 'apiKey missing' },
];

let policies: Policy[] = [...DEFAULT_POLICIES];

export function getPolicies(): Policy[] {
  return [...policies];
}

export function setPolicies(newPolicies: Policy[]): void {
  policies = [...newPolicies];
}

export function addPolicy(p: Policy): void {
  policies.push(p);
}

export function evaluatePolicies(currentMode: EngineMode, target: ExecutionTarget, provider: ProviderKind, _context: Record<string, unknown>): { allowed: boolean; warnings: string[]; denials: string[] } {
  const warnings: string[] = [];
  const denials: string[] = [];

  for (const p of policies) {
    if (p.appliesTo.modes && !p.appliesTo.modes.includes(currentMode)) continue;
    if (p.appliesTo.targets && !p.appliesTo.targets.includes(target)) continue;
    if (p.appliesTo.providers && !p.appliesTo.providers.includes(provider)) continue;

    if (p.action === 'deny') denials.push(p.description);
    else if (p.action === 'warn') warnings.push(p.description);
  }

  return { allowed: denials.length === 0, warnings, denials };
}

export function clearPolicies(): void {
  policies = [];
}
