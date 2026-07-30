import { describe, it, expect } from '@jest/globals';
import { DecisionTrace, Explanation, EvidenceLink } from '../explanation-types';

describe('explanation-types', () => {
  it('should create a valid DecisionTrace', () => {
    const trace: DecisionTrace = {
      traceId: 't1',
      decisionType: 'block',
      context: 'high-risk generation',
      signals: ['risk:critical'],
      policyApplied: 'policy-default',
      outcome: 'blocked',
      createdAt: new Date().toISOString(),
    };
    expect(trace.decisionType).toBe('block');
    expect(trace.signals).toHaveLength(1);
  });

  it('should create a valid Explanation', () => {
    const exp: Explanation = {
      explanationId: 'e1',
      title: 'Block explanation',
      summary: 'Blocked due to critical risk',
      details: ['Risk exceeded threshold'],
      evidenceIds: ['ev1'],
      confidence: 0.95,
      createdAt: new Date().toISOString(),
    };
    expect(exp.confidence).toBeCloseTo(0.95);
    expect(exp.evidenceIds).toContain('ev1');
  });

  it('should create a valid EvidenceLink', () => {
    const link: EvidenceLink = {
      evidenceId: 'ev1',
      sourceType: 'metric',
      sourceRef: 'metric:score:0.3',
      description: 'Consistency score dropped',
    };
    expect(link.sourceType).toBe('metric');
  });

  it('should support all EvidenceLink source types', () => {
    const types: EvidenceLink['sourceType'][] = [
      'metric', 'alert', 'simulation', 'approval', 'history', 'drift', 'failure', 'trend', 'policy',
    ];
    for (const t of types) {
      const link: EvidenceLink = { evidenceId: `ev-${t}`, sourceType: t, sourceRef: '', description: '' };
      expect(link.sourceType).toBe(t);
    }
  });

  it('should handle empty arrays in Explanation', () => {
    const exp: Explanation = {
      explanationId: 'e2', title: 'Empty', summary: '',
      details: [], evidenceIds: [], confidence: 0, createdAt: '',
    };
    expect(exp.details).toEqual([]);
  });
});
