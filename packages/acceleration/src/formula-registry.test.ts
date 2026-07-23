import { registerFormula, getFormula, listFormulas, evaluateFormula } from './formula-registry';

describe('formula-registry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register and retrieve a formula by name', () => {
    registerFormula({ name: 'custom', category: 'test', params: ['x'], eval: (x) => x * 2 });
    const f = getFormula('custom');
    expect(f).toBeDefined();
    if (f) expect(f.eval(5)).toBe(10);
  });

  it('should return undefined for unknown formula', () => {
    expect(getFormula('nonexistent')).toBeUndefined();
  });

  it('should list all formulas', () => {
    const all = listFormulas();
    expect(all.length).toBeGreaterThan(0);
  });

  it('should list formulas by category', () => {
    const health = listFormulas('health');
    expect(health.length).toBeGreaterThan(0);
    expect(health.every(f => f.category === 'health')).toBe(true);
  });

  it('should evaluate registered formula', () => {
    expect(evaluateFormula('bmi', 70, 1.75)).toBeCloseTo(22.86, 1);
    expect(evaluateFormula('discount', 100, 10)).toBe(90);
    expect(evaluateFormula('circle_area', 5)).toBeCloseTo(78.54, 1);
  });

  it('should return null for unknown formula evaluation', () => {
    expect(evaluateFormula('nonexistent', 1, 2)).toBeNull();
  });
});