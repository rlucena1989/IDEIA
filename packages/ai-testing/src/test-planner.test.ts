import { TestPlanner } from './test-planner';
import { AnalysisContext, TestType } from './types';

describe('TestPlanner', () => {
  const planner = new TestPlanner();

  it('should classify pure functions as unit tests', () => {
    const ctx: AnalysisContext = {
      sourceFile: 'math.ts', sourceCode: '',
      exports: [{ name: 'sum', type: 'function', signature: '' }],
      dependencies: [], types: [], existingTests: [],
    };
    const plan = planner.plan(ctx);
    expect(plan.testType).toBe(TestType.Unit);
  });

  it('should classify API endpoints as E2E', () => {
    const ctx: AnalysisContext = {
      sourceFile: 'api.ts', sourceCode: 'app.get(\'/\', handler)',
      exports: [{ name: 'handler', type: 'function', signature: '' }],
      dependencies: ['express'], types: [], existingTests: [],
    };
    const plan = planner.plan(ctx);
    expect(plan.testType).toBe(TestType.E2E);
  });

  it('should generate test cases for functions', () => {
    const ctx: AnalysisContext = {
      sourceFile: 'utils.ts', sourceCode: '',
      exports: [
        { name: 'add', type: 'function', signature: '' },
        { name: 'subtract', type: 'function', signature: '' },
      ],
      dependencies: [], types: [], existingTests: [],
    };
    const plan = planner.plan(ctx);
    expect(plan.testCases.length).toBeGreaterThanOrEqual(6);
    const names = plan.testCases.map(t => t.name);
    expect(names).toContain('add_happy_path');
    expect(names).toContain('add_edge_case');
    expect(names).toContain('add_error_case');
  });

  it('should generate test cases for classes', () => {
    const ctx: AnalysisContext = {
      sourceFile: 'service.ts', sourceCode: '',
      exports: [{ name: 'UserService', type: 'class', signature: '' }],
      dependencies: ['fs'], types: [], existingTests: [],
    };
    const plan = planner.plan(ctx);
    const names = plan.testCases.map(t => t.name);
    expect(names).toContain('UserService_instantiation');
    expect(names).toContain('UserService_methods');
  });

  it('should assign higher priority to untested files', () => {
    const untested: AnalysisContext = {
      sourceFile: 'a.ts', sourceCode: '',
      exports: [], dependencies: [], types: [], existingTests: [],
    };
    const tested: AnalysisContext = {
      sourceFile: 'b.ts', sourceCode: '',
      exports: [], dependencies: [], types: [], existingTests: ['a.test.ts'],
    };
    expect(planner.plan(untested).priority).toBeGreaterThan(planner.plan(tested).priority);
  });
});
