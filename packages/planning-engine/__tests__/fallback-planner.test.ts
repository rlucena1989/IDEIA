import { FallbackPlanner } from '../src/fallback-planner';

describe('FallbackPlanner', () => {
  const planner = new FallbackPlanner();

  const baseStep = {
    id: 's1', title: 'Deploy em produção', description: 'Fazer deploy da aplicação', agentRole: 'devops', status: 'pending' as const,
    dependencies: [], acceptanceCriteria: [],
    risk: { level: 'low' as const, impact: 0, probability: 0, factors: [], mitigation: '' },
    cost: { estimatedTokens: 1000, estimatedSeconds: 120, estimatedSteps: 1, confidence: 0.5 },
    tags: ['deploy'],
  };

  it('does not generate fallback for low risk steps', () => {
    const fallbacks = planner.generateFallback(baseStep);
    expect(fallbacks.length).toBe(0);
  });

  it('generates fallback for high risk steps', () => {
    const fallbacks = planner.generateFallback({ ...baseStep, risk: { ...baseStep.risk, level: 'high' } });
    expect(fallbacks.length).toBeGreaterThan(0);
    expect(fallbacks.some(f => f.tags.includes('fallback'))).toBe(true);
  });

  it('generates multiple fallbacks for critical steps', () => {
    const fallbacks = planner.generateFallback({ ...baseStep, risk: { ...baseStep.risk, level: 'critical' } });
    expect(fallbacks.length).toBeGreaterThanOrEqual(2);
  });
});
