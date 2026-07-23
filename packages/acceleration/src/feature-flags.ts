export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
}

const flags: Map<string, FeatureFlag> = new Map();

const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: 'co-pilot.enabled', enabled: true, description: 'Enable co-participative processing' },
  { key: 'co-pilot.local-calc', enabled: true, description: 'Enable local calculations (math, stats, etc.)' },
  { key: 'co-pilot.routing', enabled: true, description: 'Enable automatic provider routing' },
  { key: 'co-pilot.benchmark', enabled: true, description: 'Enable provider benchmarking' },
  { key: 'co-pilot.consensus', enabled: true, description: 'Enable multi-provider consensus' },
  { key: 'co-pilot.context-compression', enabled: true, description: 'Enable context compression' },
  { key: 'co-pilot.guardrails', enabled: true, description: 'Enable input/output guardrails' },
  { key: 'co-pilot.audit', enabled: true, description: 'Enable audit logging' },
];

export function initializeFlags(): void {
  for (const f of DEFAULT_FLAGS) {
    const envVal = process.env[`FLAG_${f.key.toUpperCase().replace(/\./g, '_')}`];
    flags.set(f.key, { ...f, enabled: envVal !== undefined ? envVal === 'true' : f.enabled });
  }
}

export function isEnabled(key: string): boolean {
  return flags.get(key)?.enabled ?? false;
}

export function enableFlag(key: string): void {
  const f = flags.get(key);
  if (f) flags.set(key, { ...f, enabled: true });
}

export function disableFlag(key: string): void {
  const f = flags.get(key);
  if (f) flags.set(key, { ...f, enabled: false });
}

export function listFlags(): FeatureFlag[] {
  return Array.from(flags.values());
}

export function flagSummary(): string {
  return Array.from(flags.values()).map(f => `${f.key}=${f.enabled ? 'ON' : 'OFF'}`).join(', ');
}

initializeFlags();
