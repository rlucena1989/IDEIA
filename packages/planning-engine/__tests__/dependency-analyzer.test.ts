import { DependencyAnalyzer } from '../src/dependency-analyzer';
import { PlannedStep } from '../src/types';

describe('DependencyAnalyzer', () => {
  const analyzer = new DependencyAnalyzer();

  const makeStep = (id: string, role: string, deps: string[]): PlannedStep => ({
    id, title: id, description: id, agentRole: role, status: 'pending',
    dependencies: deps.map(d => ({ stepId: d, type: 'requires' })),
    acceptanceCriteria: [], risk: { level: 'low', impact: 0, probability: 0, factors: [], mitigation: '' },
    cost: { estimatedTokens: 100, estimatedSeconds: 10, estimatedSteps: 1, confidence: 0.5 },
    tags: [],
  });

  it('detects parallelizable groups by role', () => {
    const steps = [
      makeStep('s1', 'programmer', []),
      makeStep('s2', 'programmer', []),
      makeStep('s3', 'tester', ['s1']),
    ];
    const result = analyzer.analyze(steps);
    expect(result.suggestions.some(s => s.includes('paralelizáveis'))).toBe(true);
  });

  it('detects dependency cycles', () => {
    const steps = [
      makeStep('s1', 'programmer', ['s3']),
      makeStep('s2', 'programmer', ['s1']),
      makeStep('s3', 'programmer', ['s2']),
    ];
    const result = analyzer.analyze(steps);
    expect(result.cycles.length).toBeGreaterThanOrEqual(1);
  });

  it('finds critical path', () => {
    const steps = [
      makeStep('s1', 'analyst', []),
      makeStep('s2', 'architect', ['s1']),
      makeStep('s3', 'programmer', ['s2']),
    ];
    const result = analyzer.analyze(steps);
    expect(result.criticalPath.length).toBeGreaterThanOrEqual(1);
  });
});
