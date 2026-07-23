import { describe, it, expect } from '@jest/globals';
import { decideEvolution } from '../decision-engine';
import { EvolutionDecisionContext } from '../decision-types';

describe('decision-engine', () => {
  it('decideEvolution should be defined', () => {
    expect(decideEvolution).toBeDefined();
  });

  it('should return repair when hardening is low', () => {
    const ctx: EvolutionDecisionContext = {
      deltaSummary: { added: 0, removed: 0, changed: 0, critical: 0 },
      consistencyScore: 90,
      hardeningScore: 50,
      generationScore: 80,
    };
    const decision = decideEvolution(ctx);
    expect(decision.action).toBe('repair');
    expect(decision.requiresApproval).toBe(true);
  });

  it('should return block on critical delta', () => {
    const ctx: EvolutionDecisionContext = {
      deltaSummary: { added: 0, removed: 1, changed: 2, critical: 1 },
      consistencyScore: 85,
      hardeningScore: 85,
      generationScore: 85,
    };
    const decision = decideEvolution(ctx);
    expect(decision.action).toBe('block');
    expect(decision.risk).toBe('critical');
  });

  it('should return generate when generation score is low', () => {
    const ctx: EvolutionDecisionContext = {
      deltaSummary: { added: 0, removed: 0, changed: 0, critical: 0 },
      consistencyScore: 85,
      hardeningScore: 85,
      generationScore: 55,
    };
    const decision = decideEvolution(ctx);
    expect(decision.action).toBe('generate');
  });

  it('should return sync when all scores are healthy', () => {
    const ctx: EvolutionDecisionContext = {
      deltaSummary: { added: 0, removed: 0, changed: 0, critical: 0 },
      consistencyScore: 85,
      hardeningScore: 85,
      generationScore: 85,
    };
    const decision = decideEvolution(ctx);
    expect(decision.action).toBe('sync');
    expect(decision.risk).toBe('low');
  });
});
