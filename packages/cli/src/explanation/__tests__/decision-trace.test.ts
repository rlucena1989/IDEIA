import { describe, it, expect } from '@jest/globals';
import { createDecisionTrace } from '../decision-trace';

describe('decision-trace', () => {
  it('createDecisionTrace should be defined', () => {
    expect(createDecisionTrace).toBeDefined();
  });

  it('should create a trace with correct fields', () => {
    const trace = createDecisionTrace({
      decisionType: 'approve',
      context: 'PR review',
      signals: ['tests_passing'],
      policyApplied: 'policy-default',
      outcome: 'approved',
    });
    expect(trace.traceId).toContain('trace-');
    expect(trace.decisionType).toBe('approve');
    expect(trace.context).toBe('PR review');
    expect(trace.signals).toEqual(['tests_passing']);
    expect(trace.policyApplied).toBe('policy-default');
    expect(trace.outcome).toBe('approved');
    expect(trace.createdAt).toBeDefined();
  });

  it('should handle empty signals', () => {
    const trace = createDecisionTrace({
      decisionType: 'block',
      context: 'no context',
      signals: [],
      policyApplied: 'policy-block',
      outcome: 'blocked',
    });
    expect(trace.signals).toEqual([]);
  });
});
