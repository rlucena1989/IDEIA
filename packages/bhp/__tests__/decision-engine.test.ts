import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DecisionEngine } from '../src/decision-engine';
import type { BHPPlan, BHPProfile } from '../src/types';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(),
}));

describe('DecisionEngine', () => {
  let engine: DecisionEngine;

  beforeEach(() => {
    engine = new DecisionEngine();
  });

  const createPlan = (overrides: Partial<BHPPlan> = {}): BHPPlan => ({
    id: 'plan-1',
    agentId: 'agent-1',
    description: 'A plan with enough detail to be evaluable',
    steps: ['Step 1', 'Step 2', 'Step 3'],
    resources: ['dev'],
    estimatedDuration: 1800,
    context: { target: 'production' },
    ...overrides,
  });

  it('auto-approves high match scores', () => {
    const highProfile: BHPProfile = {
      agentId: 'a', role: 'IDEIA', capabilities: ['lint', 'test', 'build'],
      reliability: 0.95, matchScore: 0.95, lastActive: new Date().toISOString(),
    };

    const result = engine.evaluate(createPlan(), highProfile, highProfile);
    expect(result.autoApproved).toBe(true);
    expect(result.decision).toBe('approved');
  });

  it('requests clarification when no consensus and moderate confidence', () => {
    const lowProfile: BHPProfile = {
      agentId: 'a', role: 'Assistant', capabilities: [],
      reliability: 0.1, matchScore: 0.1, lastActive: new Date().toISOString(),
    };

    const result = engine.evaluate(createPlan({ steps: ['Step 1'] }), lowProfile, lowProfile);
    expect(result.decision).toBe('clarify');
  });

  it('returns escalated fallback when timeout option set', () => {
    const result = engine.evaluate(createPlan(), undefined, undefined, { timeout: true });
    expect(result.decision).toBe('escalated');
    expect(result.autoApproved).toBe(false);
  });

  it('detects consensus between IDEIA and IA', () => {
    const plan = createPlan();
    const consensus = engine['detectConsensus'](plan);
    expect(consensus.hasConsensus).toBeDefined();
    expect(typeof consensus.confidence).toBe('number');
  });

  it('getDecision returns stored decision', () => {
    engine.evaluate(createPlan({ id: 'stored-plan' }));
    const decision = engine.getDecision('stored-plan');
    expect(decision).toBeDefined();
    expect(decision!.planId).toBe('stored-plan');
  });

  it('getDecisionHistory returns all decisions', () => {
    engine.evaluate(createPlan({ id: 'plan-a' }));
    engine.evaluate(createPlan({ id: 'plan-b' }));
    expect(engine.getDecisionHistory().size).toBe(2);
  });

  it('resetHistory clears all decisions', () => {
    engine.evaluate(createPlan({ id: 'plan-clear' }));
    engine.resetHistory();
    expect(engine.getDecisionHistory().size).toBe(0);
  });

  it('uses custom thresholds when provided', () => {
    const strictEngine = new DecisionEngine({ consensusThreshold: 0.85, escalationThreshold: 0.6 });
    const lowProfile: BHPProfile = {
      agentId: 'a', role: 'Assistant', capabilities: [],
      reliability: 0.05, matchScore: 0.05, lastActive: new Date().toISOString(),
    };
    const result = strictEngine.evaluate(createPlan({
      description: 'A', steps: [], resources: [], context: {},
      estimatedDuration: 0,
    }), lowProfile, lowProfile);
    expect(result.decision).toBe('clarify');
  });
});
