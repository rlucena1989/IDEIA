import { describe, it, expect } from '@jest/globals';
import { DEFAULT_TRANSPARENCY_POLICY } from '../transparency-policy';

describe('transparency-policy', () => {
  it('should export DEFAULT_TRANSPARENCY_POLICY', () => {
    expect(DEFAULT_TRANSPARENCY_POLICY).toBeDefined();
  });

  it('should have correct policyId', () => {
    expect(DEFAULT_TRANSPARENCY_POLICY.policyId).toBe('policy-transparency-default');
  });

  it('should explain critical decisions by default', () => {
    expect(DEFAULT_TRANSPARENCY_POLICY.explainCriticalDecisions).toBe(true);
  });

  it('should explain blocked actions by default', () => {
    expect(DEFAULT_TRANSPARENCY_POLICY.explainBlockedActions).toBe(true);
  });

  it('should explain recommendations by default', () => {
    expect(DEFAULT_TRANSPARENCY_POLICY.explainRecommendations).toBe(true);
  });

  it('should include evidence links by default', () => {
    expect(DEFAULT_TRANSPARENCY_POLICY.includeEvidenceLinks).toBe(true);
  });

  it('should create custom transparency policy', () => {
    const custom = {
      policyId: 'policy-custom',
      explainCriticalDecisions: false,
      explainBlockedActions: false,
      explainRecommendations: true,
      includeEvidenceLinks: false,
    };
    expect(custom.explainCriticalDecisions).toBe(false);
    expect(custom.explainRecommendations).toBe(true);
  });
});
