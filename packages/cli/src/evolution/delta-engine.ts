import { StateDelta, StateChange } from './delta-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('delta-engine');

function classifyImpact(kind: StateChange['kind'], reason: string): StateChange['impact'] {
  if (kind === 'removed') return 'high';
  if (kind === 'added') return reason.includes('command') ? 'medium' : 'low';
  if (kind === 'changed' && reason.includes('contract')) return 'critical';
  if (kind === 'changed') return 'medium';
  return 'low';
}

export function buildStateDelta(fromState: Record<string, unknown>, toState: Record<string, unknown>): StateDelta {
  const changes: StateChange[] = [];
  const allKeys = new Set([...Object.keys(fromState), ...Object.keys(toState)]);

  for (const key of allKeys) {
    if (!(key in fromState)) {
      changes.push({ path: key, kind: 'added', after: toState[key], impact: classifyImpact('added', key), reason: `Field "${key}" added` });
    } else if (!(key in toState)) {
      changes.push({ path: key, kind: 'removed', before: fromState[key], impact: classifyImpact('removed', key), reason: `Field "${key}" removed` });
    } else if (JSON.stringify(fromState[key]) !== JSON.stringify(toState[key])) {
      changes.push({ path: key, kind: 'changed', before: fromState[key], after: toState[key], impact: classifyImpact('changed', key), reason: `Field "${key}" changed` });
    } else {
      changes.push({ path: key, kind: 'unchanged', impact: 'low', reason: `Field "${key}" unchanged` });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    fromVersion: String(fromState?.version ?? 'unknown'),
    toVersion: String(toState?.version ?? 'unknown'),
    changes,
    summary: {
      added: changes.filter(c => c.kind === 'added').length,
      removed: changes.filter(c => c.kind === 'removed').length,
      changed: changes.filter(c => c.kind === 'changed').length,
      unchanged: changes.filter(c => c.kind === 'unchanged').length,
      critical: changes.filter(c => c.impact === 'critical').length,
    },
  };
}
