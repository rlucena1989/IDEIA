import { ComplexityRouter } from '../src/router/complexity-router';

describe('ComplexityRouter', () => {
  const router = new ComplexityRouter();

  it('classifies N0 for trivial tasks', () => {
    const result = router.classify({
      fileCount: 0,
      riskLevel: 'low',
      estimatedSteps: 0,
      requiresHistoricalContext: false,
      environmentSensitivity: 'dev',
      dependencies: 0,
    });
    expect(result.level).toBe('N0');
  });

  it('classifies N1 for simple single-file tasks', () => {
    const result = router.classify({
      fileCount: 1,
      riskLevel: 'low',
      estimatedSteps: 1,
      requiresHistoricalContext: false,
      environmentSensitivity: 'dev',
      dependencies: 0,
    });
    expect(result.level).toBe('N1');
  });

  it('classifies N3 for tasks requiring historical context', () => {
    const result = router.classify({
      fileCount: 2,
      riskLevel: 'medium',
      estimatedSteps: 4,
      requiresHistoricalContext: true,
      environmentSensitivity: 'dev',
      dependencies: 2,
    });
    expect(result.level).toBe('N3');
  });

  it('classifies N4 for high risk tasks', () => {
    const result = router.classify({
      fileCount: 8,
      riskLevel: 'high',
      estimatedSteps: 8,
      requiresHistoricalContext: false,
      environmentSensitivity: 'staging',
      dependencies: 5,
    });
    expect(result.level).toBe('N4');
  });

  it('classifies N5 for critical production tasks', () => {
    const result = router.classify({
      fileCount: 15,
      riskLevel: 'critical',
      estimatedSteps: 12,
      requiresHistoricalContext: true,
      environmentSensitivity: 'production',
      dependencies: 10,
    });
    expect(result.level).toBe('N5');
  });

  it('returns correct pipeline config for each level', () => {
    const config = router.getPipeline('N2');
    expect(config.requirePlan).toBe(true);
    expect(config.requireVerification).toBe(true);
    expect(config.maxSteps).toBe(5);
    expect(config.stages).toContain('execute');
    expect(config.stages).toContain('verify');
  });
});
