import { RiskEstimator } from '../src/risk-estimator';

describe('RiskEstimator', () => {
  const estimator = new RiskEstimator();

  const baseStep = {
    id: 's1', title: 'test', description: 'test', agentRole: 'programmer', status: 'pending' as const,
    dependencies: [], acceptanceCriteria: [],
    risk: { level: 'low' as const, impact: 0, probability: 0, factors: [], mitigation: '' },
    cost: { estimatedTokens: 100, estimatedSeconds: 10, estimatedSteps: 1, confidence: 0.5 },
    tags: [],
  };

  it('estimates low risk for dev environment', () => {
    const risk = estimator.estimate(baseStep, 'dev');
    expect(['low', 'medium']).toContain(risk.level);
  });

  it('estimates higher risk for production', () => {
    const highRisk = estimator.estimate({ ...baseStep, tags: ['critical'] }, 'production');
    expect(highRisk.factors.length).toBeGreaterThan(0);
  });

  it('estimates plan risk from multiple steps', () => {
    const steps = [
      { ...baseStep, risk: estimator.estimate({ ...baseStep, agentRole: 'programmer' }, 'dev') },
      { ...baseStep, risk: estimator.estimate({ ...baseStep, agentRole: 'devops' }, 'production') },
    ];
    const planRisk = estimator.estimatePlanRisk(steps);
    expect(planRisk.level).toBeDefined();
    expect(planRisk.factors.length).toBeGreaterThan(0);
  });
});
