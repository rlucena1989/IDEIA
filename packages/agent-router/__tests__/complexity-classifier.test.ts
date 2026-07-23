import { ComplexityClassifier } from '../src/complexity-classifier';

describe('ComplexityClassifier', () => {
  const classifier = new ComplexityClassifier();

  it('classifies N0 for trivial tasks', () => {
    const r = classifier.classify({ fileCount: 0, riskLevel: 'low', estimatedSteps: 0, requiresHistoricalContext: false, environmentSensitivity: 'dev', dependencies: 0, hasUI: false, hasDatabase: false, hasExternalAPI: false });
    expect(r.level).toBe('N0');
  });

  it('classifies N5 for complex production tasks', () => {
    const r = classifier.classify({ fileCount: 25, riskLevel: 'critical', estimatedSteps: 20, requiresHistoricalContext: true, environmentSensitivity: 'production', dependencies: 15, hasUI: true, hasDatabase: true, hasExternalAPI: true });
    expect(r.level).toBe('N5');
  });

  it('classifies N2-N3 for medium tasks', () => {
    const r = classifier.classify({ fileCount: 5, riskLevel: 'medium', estimatedSteps: 5, requiresHistoricalContext: false, environmentSensitivity: 'staging', dependencies: 3, hasUI: true, hasDatabase: false, hasExternalAPI: false });
    expect(['N2', 'N3']).toContain(r.level);
  });

  it('returns reasons and confidence', () => {
    const r = classifier.classify({ fileCount: 10, riskLevel: 'high', estimatedSteps: 8, requiresHistoricalContext: true, environmentSensitivity: 'production', dependencies: 8, hasUI: true, hasDatabase: true, hasExternalAPI: true });
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.estimatedTokens).toBeGreaterThan(0);
  });
});
