import { TargetedTestGenerator } from './targeted-generator';
import { MutationSurvivor } from '../types';

describe('TargetedTestGenerator', () => {
  const generator = new TargetedTestGenerator();

  it('should generate boundary test for comparison survivors', () => {
    const survivor: MutationSurvivor = {
      mutantId: 'M1', location: { file: 'math.ts', line: 10, column: 5 },
      originalCode: 'if (a > b)', mutatedCode: 'if (a >= b)', reason: 'boundary condition not covered',
    };
    const cases = generator.generateForSurvivor(survivor);
    expect(cases.some(c => c.type === 'boundary')).toBe(true);
  });

  it('should generate condition test for if-statement survivors', () => {
    const survivor: MutationSurvivor = {
      mutantId: 'M2', location: { file: 'check.ts', line: 5, column: 3 },
      originalCode: 'if (isValid)', mutatedCode: 'if (!isValid)', reason: 'condition not covered',
    };
    const cases = generator.generateForSurvivor(survivor);
    expect(cases.some(c => c.type === 'edge-case')).toBe(true);
  });

  it('should generate arithmetic test for operator survivors', () => {
    const survivor: MutationSurvivor = {
      mutantId: 'M3', location: { file: 'calc.ts', line: 3, column: 1 },
      originalCode: 'return a + b', mutatedCode: 'return a - b', reason: 'operator not covered',
    };
    const cases = generator.generateForSurvivor(survivor);
    expect(cases.some(c => c.name.includes('operator'))).toBe(true);
  });

  it('should always generate regression test', () => {
    const survivor: MutationSurvivor = {
      mutantId: 'M4', location: { file: 'any.ts', line: 1, column: 1 },
      originalCode: 'x', mutatedCode: 'y', reason: 'other',
    };
    const cases = generator.generateForSurvivor(survivor);
    expect(cases.some(c => c.name.includes('regression'))).toBe(true);
  });
});
