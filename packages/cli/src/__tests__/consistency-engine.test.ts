import { ConsistencyEngine, classifyIntent, estimateComplexity, calculateRisk } from '../runtime/consistency-engine';

describe('ConsistencyEngine', () => {
  let engine: ConsistencyEngine;

  beforeEach(() => {
    engine = new ConsistencyEngine();
  });

  it('should evaluate code and produce decisions', () => {
    const code = 'class UserRepository { findById(id: string) { } } class CreateUserDto { }';
    const report = engine.evaluate(code, 'test.ts');
    expect(report.decisions.length).toBeGreaterThan(0);
    expect(report.overallMode).toBeDefined();
    expect(report.summary).toContain('Intenção');
  });

  it('should detect no patterns in empty code', () => {
    const code = 'const x = 42;';
    const report = engine.evaluate(code, 'test.ts');
    expect(report.decisions.length).toBe(0);
    expect(report.createCount).toBe(0);
  });

  it('should classify intent as bugfix', () => {
    const code = '// Fix login bug when password is incorrect';
    const report = engine.evaluate(code, 'test.ts');
    expect(report.summary).toContain('bugfix');
  });

  it('should classify intent as security', () => {
    const code = '// Add authentication token validation';
    const report = engine.evaluate(code, 'test.ts');
    expect(report.summary).toContain('security');
  });
});

describe('classifyIntent', () => {
  it('should detect new_feature', () => {
    expect(classifyIntent('Add new user registration feature', 'test.ts')).toBe('new_feature');
  });

  it('should detect bugfix', () => {
    expect(classifyIntent('Fix error handling in login', 'test.ts')).toBe('bugfix');
  });

  it('should detect refactor', () => {
    expect(classifyIntent('Refactor user service into smaller pieces', 'test.ts')).toBe('refactor');
  });

  it('should return unknown for unclear code', () => {
    expect(classifyIntent('const x = 1;', 'test.ts')).toBe('unknown');
  });
});

describe('estimateComplexity', () => {
  it('should rate simple code as low complexity', () => {
    expect(estimateComplexity('const x = 1;')).toBeLessThanOrEqual(3);
  });

  it('should rate complex code higher', () => {
    const code = `
      if (a) { for (let i = 0; i < 10; i++) {
        if (b) { while (c) { switch(d) { case 1: break; } } }
      }}
    `;
    expect(estimateComplexity(code)).toBeGreaterThan(3);
  });
});

describe('calculateRisk', () => {
  it('should return high for security intent with high complexity', () => {
    expect(calculateRisk('security', 8, 5)).toBe('high');
  });

  it('should return low for docs intent with low complexity', () => {
    expect(calculateRisk('docs', 1, 0)).toBe('low');
  });
});
