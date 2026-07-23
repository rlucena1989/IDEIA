import { CostEstimator } from '../src/cost-estimator';

describe('CostEstimator', () => {
  const estimator = new CostEstimator();

  const baseStep = {
    id: 's1', title: 'test', description: 'test', agentRole: 'programmer', status: 'pending' as const,
    dependencies: [], acceptanceCriteria: [{ description: 'must work', verificationType: 'test' as const, mandatory: true }],
    risk: { level: 'low' as const, impact: 0, probability: 0, factors: [], mitigation: '' },
    cost: { estimatedTokens: 100, estimatedSeconds: 10, estimatedSteps: 1, confidence: 0.5 },
    tags: [],
  };

  it('estimates cost for a step', () => {
    const cost = estimator.estimate(baseStep);
    expect(cost.estimatedTokens).toBeGreaterThan(0);
    expect(cost.estimatedSeconds).toBeGreaterThan(0);
    expect(cost.confidence).toBeGreaterThan(0);
  });

  it('estimates different costs for different roles', () => {
    const programmer = estimator.estimate(baseStep);
    const analyst = estimator.estimate({ ...baseStep, agentRole: 'analyst' });
    expect(programmer.estimatedTokens).not.toBe(analyst.estimatedTokens);
  });

  it('estimates total for multiple steps', () => {
    const total = estimator.estimateTotal([baseStep, { ...baseStep, agentRole: 'tester' }]);
    expect(total.estimatedTokens).toBeGreaterThan(0);
    expect(total.estimatedSteps).toBe(2);
  });
});
