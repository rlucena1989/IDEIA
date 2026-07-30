import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
import { buildStateDelta } from './delta-engine';
import { decideEvolution } from './decision-engine';
import { EvolutionRunResult } from './execution-types';
import { DevkitState } from '../state/state-types';

export function orchestrateEvolution(fromState: DevkitState, toState: DevkitState): EvolutionRunResult {
  const delta = buildStateDelta(fromState as unknown as Record<string, unknown>, toState as unknown as Record<string, unknown>);

  const decision = decideEvolution({
    deltaSummary: delta.summary,
    consistencyScore: 82,
    hardeningScore: 88,
    generationScore: 79,
  });

  return {
    ok: decision.action !== 'block',
    action: decision.action,
    rationale: decision.rationale,
    deltaSummary: delta.summary,
    validation: {
      passed: decision.action !== 'block',
      notes: decision.action === 'repair'
        ? ['Repair recommended before further generation.']
        : ['Execution allowed.'],
    },
    auditId: crypto.randomUUID(),
  };
}

