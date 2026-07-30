import { TestValidator } from './test-validator';
import { GeneratedTest, TestType } from '../types';

describe('TestValidator', () => {
  const validator = new TestValidator();
  const baseGenerated: GeneratedTest = {
    filePath: 'test.ts', content: '',
    plan: { filePath: 'test.test.ts', testType: TestType.Unit, testCases: [], estimatedEffort: 0, priority: 0 },
    validation: { compiles: false, testsPass: false, coverage: { lines: 0, branches: 0, functions: 0, statements: 0 }, score: 0 },
  };

  it('should validate successfully for valid generated tests', async () => {
    const result = await validator.validate(baseGenerated);
    expect(result.compiles).toBe(true);
    expect(result.testsPass).toBe(true);
  });

  it('should return coverage metrics', async () => {
    const result = await validator.validate(baseGenerated);
    expect(result.coverage.lines).toBeGreaterThan(0);
    expect(result.coverage.branches).toBeGreaterThan(0);
  });

  it('should calculate a score between 0-100', async () => {
    const result = await validator.validate(baseGenerated);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
