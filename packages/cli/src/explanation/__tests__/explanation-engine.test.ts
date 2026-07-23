import { describe, it, expect } from '@jest/globals';
import { explainDecision } from '../explanation-engine';
import { createDecisionTrace } from '../decision-trace';

describe('explanation-engine', () => {
  it('explainDecision should be defined', () => {
    expect(explainDecision).toBeDefined();
  });

  it('should generate explanation from trace', () => {
    const trace = createDecisionTrace({
      decisionType: 'approve',
      context: 'Deploy to production',
      signals: ['tests_passing', 'security_ok'],
      policyApplied: 'policy-deploy',
      outcome: 'approved',
    });
    const explanation = explainDecision(trace);
    expect(explanation.explanationId).toContain('explain-');
    expect(explanation.title).toContain('approve');
    expect(explanation.summary).toContain('approved');
    expect(explanation.summary).toContain('policy-deploy');
    expect(explanation.details.length).toBe(4);
    expect(explanation.details[0]).toContain('Deploy to production');
    expect(explanation.details[1]).toContain('tests_passing, security_ok');
    expect(explanation.confidence).toBe(0.9);
  });
});
