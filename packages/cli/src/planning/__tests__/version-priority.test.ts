import { describe, it, expect } from '@jest/globals';
import {
  scoreFeature,
  decideTarget,
  computeDecisions,
  type FeatureCandidate,
} from '../version-priority';

function makeFeature(overrides: Partial<FeatureCandidate> & { id: string }): FeatureCandidate {
  return {
    title: 'Test Feature',
    description: 'A test feature for validation',
    impact: 5,
    risk: 3,
    effort: 4,
    dependencyCount: 1,
    boostsAutonomy: false,
    stabilizesBase: false,
    ...overrides,
  };
}

describe('scoreFeature', () => {
  it('should compute benefit minus penalty', () => {
    const f = makeFeature({ id: 'test-1', impact: 8, risk: 2, effort: 3, dependencyCount: 1 });
    const expected = (8 + 0 + 0) - (2 + 3 + 1 * 5);
    expect(scoreFeature(f)).toBe(expected);
  });

  it('should add 20 to benefit when stabilizesBase is true', () => {
    const f = makeFeature({ id: 'test-2', impact: 5, stabilizesBase: true });
    const expected = (5 + 20 + 0) - (3 + 4 + 1 * 5);
    expect(scoreFeature(f)).toBe(expected);
  });

  it('should add 15 to benefit when boostsAutonomy is true', () => {
    const f = makeFeature({ id: 'test-3', impact: 5, boostsAutonomy: true });
    const expected = (5 + 0 + 15) - (3 + 4 + 1 * 5);
    expect(scoreFeature(f)).toBe(expected);
  });

  it('should add both bonuses when both flags are true', () => {
    const f = makeFeature({ id: 'test-4', impact: 7, stabilizesBase: true, boostsAutonomy: true });
    const expected = (7 + 20 + 15) - (3 + 4 + 1 * 5);
    expect(scoreFeature(f)).toBe(expected);
  });

  it('should handle zero dependencies correctly', () => {
    const f = makeFeature({ id: 'test-5', impact: 5, risk: 1, effort: 2, dependencyCount: 0 });
    const _expected = (5 + 0 + 0) - (1 + 2 + 0);
    expect(scoreFeature(f)).toBe(2);
  });

  it('should produce negative scores for high risk + effort features', () => {
    const f = makeFeature({ id: 'test-6', impact: 3, risk: 8, effort: 9, dependencyCount: 3 });
    const score = scoreFeature(f);
    expect(score).toBeLessThan(0);
  });
});

describe('decideTarget', () => {
  it('should return v2.1 for features that stabilize the base with low risk', () => {
    const f = makeFeature({ id: 'f1', stabilizesBase: true, risk: 2 });
    expect(decideTarget(f)).toBe('v2.1');
  });

  it('should return v2.1 when stabilizesBase and risk is exactly 4', () => {
    const f = makeFeature({ id: 'f2', stabilizesBase: true, risk: 4 });
    expect(decideTarget(f)).toBe('v2.1');
  });

  it('should return v2.2 for features that boost autonomy with moderate risk', () => {
    const f = makeFeature({ id: 'f3', boostsAutonomy: true, risk: 5, stabilizesBase: false });
    expect(decideTarget(f)).toBe('v2.2');
  });

  it('should return v2.2 when boostsAutonomy and risk is exactly 6', () => {
    const f = makeFeature({ id: 'f4', boostsAutonomy: true, risk: 6, stabilizesBase: false });
    expect(decideTarget(f)).toBe('v2.2');
  });

  it('should return post-v2.2 when risk is too high for stabilization', () => {
    const f = makeFeature({ id: 'f5', stabilizesBase: true, risk: 5 });
    expect(decideTarget(f)).toBe('post-v2.2');
  });

  it('should return post-v2.2 when risk is too high for autonomy', () => {
    const f = makeFeature({ id: 'f6', boostsAutonomy: true, risk: 7, stabilizesBase: false });
    expect(decideTarget(f)).toBe('post-v2.2');
  });

  it('should return post-v2.2 when neither flag is set', () => {
    const f = makeFeature({ id: 'f7', stabilizesBase: false, boostsAutonomy: false });
    expect(decideTarget(f)).toBe('post-v2.2');
  });

  it('should prefer v2.1 over v2.2 when both flags are true and risk is low', () => {
    const f = makeFeature({ id: 'f8', stabilizesBase: true, boostsAutonomy: true, risk: 3 });
    expect(decideTarget(f)).toBe('v2.1');
  });
});

describe('computeDecisions', () => {
  it('should return a decision for each feature', () => {
    const features = [
      makeFeature({ id: 'f1', stabilizesBase: true, risk: 2 }),
      makeFeature({ id: 'f2', boostsAutonomy: true, risk: 5 }),
      makeFeature({ id: 'f3', risk: 9 }),
    ];
    const decisions = computeDecisions(features);
    expect(decisions).toHaveLength(3);
  });

  it('should assign correct targets based on feature properties', () => {
    const features = [
      { id: 'stable-one', title: 'Stable', description: '', impact: 5, risk: 2, effort: 3, dependencyCount: 0, stabilizesBase: true, boostsAutonomy: false },
      { id: 'auto-one', title: 'Autonomy', description: '', impact: 5, risk: 5, effort: 3, dependencyCount: 0, stabilizesBase: false, boostsAutonomy: true },
      { id: 'future-one', title: 'Future', description: '', impact: 5, risk: 9, effort: 8, dependencyCount: 5, stabilizesBase: false, boostsAutonomy: false },
    ];
    const decisions = computeDecisions(features as FeatureCandidate[]);
    expect(decisions[0].target).toBe('v2.1');
    expect(decisions[1].target).toBe('v2.2');
    expect(decisions[2].target).toBe('post-v2.2');
  });

  it('should include priorityScore for each decision', () => {
    const f = makeFeature({ id: 'f1' });
    const decisions = computeDecisions([f]);
    expect(decisions[0].priorityScore).toBeDefined();
    expect(typeof decisions[0].priorityScore).toBe('number');
  });

  it('should include a reason for each decision', () => {
    const f = makeFeature({ id: 'f1' });
    const decisions = computeDecisions([f]);
    expect(decisions[0].reason).toBeDefined();
    expect(decisions[0].reason.length).toBeGreaterThan(10);
  });
});
