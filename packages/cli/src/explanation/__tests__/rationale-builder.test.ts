import { describe, it, expect } from '@jest/globals';
import { buildRationale } from '../rationale-builder';
import { createDecisionTrace } from '../decision-trace';
import { linkEvidence } from '../evidence-linker';

describe('rationale-builder', () => {
  it('buildRationale should be defined', () => {
    expect(buildRationale).toBeDefined();
  });

  it('should build rationale from trace and evidence', () => {
    const trace = createDecisionTrace({
      decisionType: 'block',
      context: 'Deploy on Friday',
      signals: ['friday_deploy'],
      policyApplied: 'policy-deploy-freeze',
      outcome: 'blocked',
    });
    const evidence = linkEvidence([
      { sourceType: 'policy', sourceRef: 'policy-deploy-freeze', description: 'Deploy freeze on weekends' },
    ]);
    const rationale = buildRationale(trace, evidence);
    expect(rationale.rationaleId).toContain('rationale-');
    expect(rationale.title).toContain('block');
    expect(rationale.summary).toContain('blocked');
    expect(rationale.summary).toContain('policy-deploy-freeze');
    expect(rationale.facts.length).toBe(3);
    expect(rationale.inferences.length).toBe(2);
    expect(rationale.inferences[0]).toContain('blocked');
  });

  it('should handle missing evidence gracefully', () => {
    const trace = createDecisionTrace({
      decisionType: 'approve',
      context: 'Quick fix',
      signals: [],
      policyApplied: 'policy-default',
      outcome: 'approved',
    });
    const rationale = buildRationale(trace, []);
    expect(rationale.inferences[1]).toContain('No additional evidence');
  });
});
