import { TestGenerator } from './test-generator';
import { TestPlan, TestType } from '../types';

describe('TestGenerator', () => {
  const generator = new TestGenerator();

  it('should generate test file with imports', async () => {
    const plan: TestPlan = {
      filePath: 'src/math.test.ts', testType: TestType.Unit,
      testCases: [{ name: 'sum_happy_path', description: 'Test sum', type: 'happy-path' }],
      estimatedEffort: 5, priority: 5,
    };
    const result = await generator.generate(plan);
    expect(result.content).toContain("from 'src/math'");
    expect(result.content).toContain("describe('math'");
  });

  it('should include all test cases in output', async () => {
    const plan: TestPlan = {
      filePath: 'calc.test.ts', testType: TestType.Unit,
      testCases: [
        { name: 'add_happy', description: 'Test add', type: 'happy-path' },
        { name: 'add_error', description: 'Test error', type: 'error-case' },
      ],
      estimatedEffort: 10, priority: 5,
    };
    const result = await generator.generate(plan);
    expect(result.content).toContain("it('add_happy'");
    expect(result.content).toContain("it('add_error'");
  });

  it('should include error handling test for error cases', async () => {
    const plan: TestPlan = {
      filePath: 'validate.test.ts', testType: TestType.Unit,
      testCases: [{ name: 'invalid_input', description: 'Test validation', type: 'error-case' }],
      estimatedEffort: 5, priority: 5,
    };
    const result = await generator.generate(plan);
    expect(result.content).toContain('.toThrow()');
  });

  it('should return validation result', async () => {
    const plan: TestPlan = {
      filePath: 'test.test.ts', testType: TestType.Unit,
      testCases: [], estimatedEffort: 0, priority: 0,
    };
    const result = await generator.generate(plan);
    expect(result.validation).toBeDefined();
    expect(result.validation.compiles).toBe(true);
  });
});
