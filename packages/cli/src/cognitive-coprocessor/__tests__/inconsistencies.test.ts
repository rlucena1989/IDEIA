import { detectInconsistencies } from '../inconsistencies';
import type { Rule } from '../types';

describe('detectInconsistencies', () => {
  it('returns none for null input', () => {
    const result = detectInconsistencies(null);
    expect(result.severity).toBe('none');
    expect(result.inconsistencies).toHaveLength(0);
  });

  it('returns none for undefined input', () => {
    const result = detectInconsistencies(undefined);
    expect(result.severity).toBe('none');
  });

  it('detects logical inconsistency: positive and negative both true', () => {
    const result = detectInconsistencies({ positive: true, negative: true });
    expect(result.inconsistencies.length).toBeGreaterThanOrEqual(1);
    expect(result.inconsistencies[0].type).toBe('logical');
    expect(result.severity).toBe('high');
  });

  it('detects logical inconsistency: min > max', () => {
    const result = detectInconsistencies({ min: 10, max: 5 });
    expect(result.inconsistencies.some(i => i.field === 'min/max')).toBe(true);
    expect(result.severity).toBe('high');
  });

  it('detects logical inconsistency: start_date > end_date', () => {
    const result = detectInconsistencies({ start_date: '2025-01-10', end_date: '2025-01-01' });
    expect(result.inconsistencies.some(i => i.field === 'start_date/end_date')).toBe(true);
  });

  it('detects numerical inconsistency: sum of items != total', () => {
    const result = detectInconsistencies({ total: 100, items: [10, 20, 30] });
    expect(result.inconsistencies.some(i => i.type === 'numerical')).toBe(true);
  });

  it('detects percentage out of range', () => {
    const result = detectInconsistencies({ percentage: 150 });
    const found = result.inconsistencies.filter(i => i.field === 'percentage');
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(result.severity).toBe('medium');
  });

  it('validates percentage in range returns none', () => {
    const result = detectInconsistencies({ percentage: 50 });
    expect(result.inconsistencies.filter(i => i.field === 'percentage')).toHaveLength(0);
  });

  it('applies policy rules with eq condition', () => {
    const rules: Rule[] = [{ field: 'status', type: 'policy', condition: 'eq', expected: 'active' }];
    const result = detectInconsistencies({ status: 'inactive' }, rules);
    expect(result.inconsistencies.some(i => i.type === 'policy')).toBe(true);
  });

  it('applies policy rules with gt condition', () => {
    const rules: Rule[] = [{ field: 'score', type: 'policy', condition: 'gt', expected: 70 }];
    const result = detectInconsistencies({ score: 50 }, rules);
    expect(result.inconsistencies.some(i => i.type === 'policy')).toBe(true);
  });

  it('applies policy rules with lt condition', () => {
    const rules: Rule[] = [{ field: 'errorRate', type: 'policy', condition: 'lt', expected: 0.1 }];
    const result = detectInconsistencies({ errorRate: 0.5 }, rules);
    expect(result.inconsistencies.some(i => i.type === 'policy')).toBe(true);
  });

  it('applies policy rules with in_range condition', () => {
    const rules: Rule[] = [{ field: 'temp', type: 'policy', condition: 'in_range', expected: [0, 100] }];
    const result = detectInconsistencies({ temp: 150 }, rules);
    expect(result.inconsistencies.some(i => i.type === 'policy')).toBe(true);
  });

  it('returns confidence 1 for no inconsistencies', () => {
    const result = detectInconsistencies({ ok: true });
    expect(result.confidence).toBe(1);
  });

  it('ignores policy rules when field is undefined', () => {
    const rules: Rule[] = [{ field: 'missing', type: 'policy', condition: 'eq', expected: 'x' }];
    const result = detectInconsistencies({ other: 'y' }, rules);
    expect(result.inconsistencies.filter(i => i.type === 'policy')).toHaveLength(0);
  });

  it('aggregates severity correctly: high + medium => high', () => {
    const result = detectInconsistencies({ positive: true, negative: true, percentage: 200 });
    expect(result.severity).toBe('high');
  });
});
