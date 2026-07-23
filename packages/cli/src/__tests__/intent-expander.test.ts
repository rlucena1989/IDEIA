import { expandIntent, assessRisk } from '../runtime/intent-expander';

describe('expandIntent', () => {
  it('should expand new_feature intent', () => {
    const result = expandIntent('new_feature', '// Add new feature');
    expect(result.expanded.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.impactAreas).toContain('api');
    expect(result.risk).toBe('low');
  });

  it('should expand security intent with high risk', () => {
    const result = expandIntent('security', '// Auth token validation');
    expect(result.risk).toBe('high');
    expect(result.impactAreas).toContain('autenticacao');
  });

  it('should expand refactor with module scope', () => {
    const result = expandIntent('refactor', '// Refactor user service');
    expect(result.scope).toBe('module');
  });

  it('should expand unknown intent', () => {
    const result = expandIntent('unknown', 'const x = 1;');
    expect(result.expanded.length).toBeGreaterThan(0);
    expect(result.scope).toBe('local');
  });
});

describe('assessRisk', () => {
  it('should assess low risk for simple docs code', () => {
    const result = assessRisk('docs', 1, '// Simple doc change');
    expect(result.level).toBe('low');
  });

  it('should assess high risk for complex security code', () => {
    const result = assessRisk('security', 9, '// Complex auth with token rotation and refresh');
    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThan(20);
  });

  it('should report risk factors', () => {
    const result = assessRisk('bugfix', 5, '// Fix something critical');
    expect(result.factors.length).toBeGreaterThan(0);
    expect(result.factors[0].mitigation).toBeTruthy();
  });

  it('should have mitigatedRisk lower or equal to level', () => {
    const result = assessRisk('refactor', 6, '// Refactor legacy code');
    const values = ['low', 'medium', 'high'];
    expect(values.indexOf(result.mitigatedRisk)).toBeLessThanOrEqual(values.indexOf(result.level));
  });
});
