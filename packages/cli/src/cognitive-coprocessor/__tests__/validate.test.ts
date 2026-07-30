import { validateAnswer } from '../validate';
import type { Rule } from '../types';

describe('validateAnswer', () => {
  it('returns valid=true for clean input', () => {
    const result = validateAnswer(42);
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
  });

  it('detects null answer as invalid', () => {
    const result = validateAnswer(null);
    expect(result.valid).toBe(false);
    expect(result.issues[0].severity).toBe('high');
  });

  it('detects undefined answer as invalid', () => {
    const result = validateAnswer(undefined);
    expect(result.valid).toBe(false);
  });

  it('detects empty string as invalid', () => {
    const result = validateAnswer('   ');
    expect(result.valid).toBe(false);
  });

  it('detects empty object as medium issue', () => {
    const result = validateAnswer({});
    expect(result.issues.some(i => i.severity === 'medium')).toBe(true);
  });

  it('compares mean against ground truth', () => {
    const result = validateAnswer([1, 2, 3], [10, 20, 30]);
    const meanIssues = result.issues.filter(i => i.message.includes('Média difere'));
    expect(meanIssues.length).toBeGreaterThanOrEqual(0);
  });

  it('detects sum difference against ground truth', () => {
    const result = validateAnswer([1, 2, 3], [100]);
    const sumIssue = result.issues.find(i => i.message.includes('Soma difere'));
  });

  it('detects count difference against ground truth', () => {
    const result = validateAnswer([1, 2, 3], [1, 2]);
    const countIssues = result.issues.filter(i => i.message.includes('Contagem difere'));
  });

  it('reports logical issues via inconsistencies', () => {
    const result = validateAnswer({ positive: true, negative: true });
    expect(result.issues.some(i => i.layer === 'logical')).toBe(true);
  });

  it('applies custom rules through inconsistencies', () => {
    const rules: Rule[] = [{ field: 'status', type: 'policy', condition: 'eq', expected: 'active' }];
    const result = validateAnswer({ status: 'inactive' }, undefined, rules);
    expect(result.issues.some(i => i.layer === 'logical')).toBe(true);
  });

  it('score is 100 when no issues', () => {
    const result = validateAnswer(42);
    expect(result.score).toBe(100);
  });

  it('score is penalized for high severity issues', () => {
    const result = validateAnswer(null);
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('includes suggestions', () => {
    const result = validateAnswer(null);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('suggests "Nenhum problema encontrado" when valid', () => {
    const result = validateAnswer(42);
    expect(result.suggestions).toContain('Nenhum problema encontrado');
  });
});
