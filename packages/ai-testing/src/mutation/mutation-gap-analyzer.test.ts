import { MutationGapAnalyzer } from './mutation-gap-analyzer';

describe('MutationGapAnalyzer', () => {
  const analyzer = new MutationGapAnalyzer();

  it('should return mutation results with score', async () => {
    const result = await analyzer.analyze('src/math.test.ts');
    expect(result.mutationScore).toBeGreaterThanOrEqual(0);
    expect(result.mutationScore).toBeLessThanOrEqual(100);
    expect(result.total).toBeGreaterThan(result.killed);
  });

  it('should classify boundary survivors as high criticality', () => {
    const survivor = {
      mutantId: 'M1', location: { file: 'test.ts', line: 1, column: 1 },
      originalCode: 'a > b', mutatedCode: 'a >= b', reason: 'boundary condition not covered',
    };
    const classification = analyzer.classifySurvivor(survivor);
    expect(classification.criticality).toBe('high');
  });

  it('should classify condition survivors as medium criticality', () => {
    const survivor = {
      mutantId: 'M2', location: { file: 'test.ts', line: 1, column: 1 },
      originalCode: 'if (x)', mutatedCode: 'if (!x)', reason: 'condition not covered',
    };
    const classification = analyzer.classifySurvivor(survivor);
    expect(classification.criticality).toBe('medium');
  });

  it('should classify other survivors as low criticality', () => {
    const survivor = {
      mutantId: 'M3', location: { file: 'test.ts', line: 1, column: 1 },
      originalCode: 'return x', mutatedCode: 'return null', reason: 'other',
    };
    const classification = analyzer.classifySurvivor(survivor);
    expect(classification.criticality).toBe('low');
  });
});
