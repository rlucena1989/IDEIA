import type { EvolutionDecision, EvolutionDecisionContext } from '../decision-types';

describe('EvolutionDecision type', () => {
  it('constructs a valid decision', () => {
    const decision: EvolutionDecision = {
      action: 'generate',
      rationale: 'New code needed',
      risk: 'low',
      confidence: 0.95,
      requiresApproval: false,
    };
    expect(decision.action).toBe('generate');
    expect(decision.risk).toBe('low');
  });

  it('accepts all action variants', () => {
    const actions: EvolutionDecision['action'][] = ['generate', 'repair', 'sync', 'review', 'block', 'defer'];
    for (const action of actions) {
      const d: EvolutionDecision = { action, rationale: '', risk: 'medium', confidence: 0.5, requiresApproval: false };
      expect(d.action).toBe(action);
    }
  });

  it('accepts all risk levels', () => {
    const risks: EvolutionDecision['risk'][] = ['low', 'medium', 'high', 'critical'];
    for (const risk of risks) {
      const d: EvolutionDecision = { action: 'block', rationale: '', risk, confidence: 0.5, requiresApproval: true };
      expect(d.risk).toBe(risk);
    }
  });

  it('requiresApproval can be true or false', () => {
    const approved: EvolutionDecision = { action: 'repair', rationale: '', risk: 'high', confidence: 0.8, requiresApproval: true };
    const auto: EvolutionDecision = { action: 'sync', rationale: '', risk: 'low', confidence: 0.9, requiresApproval: false };
    expect(approved.requiresApproval).toBe(true);
    expect(auto.requiresApproval).toBe(false);
  });
});

describe('EvolutionDecisionContext type', () => {
  it('constructs a valid context', () => {
    const ctx: EvolutionDecisionContext = {
      deltaSummary: { added: 5, removed: 2, changed: 3, critical: 0 },
      consistencyScore: 85,
      hardeningScore: 90,
      generationScore: 75,
    };
    expect(ctx.deltaSummary.added).toBe(5);
    expect(ctx.consistencyScore).toBe(85);
  });
});
