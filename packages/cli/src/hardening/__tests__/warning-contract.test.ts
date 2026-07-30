import { categorizeWarnings, formatWarningSummary, HardeningWarning } from '../warning-contract';

describe('warning-contract', () => {
  test('categorizeWarnings returns empty for no warnings', () => {
    const result = categorizeWarnings([]);
    expect(result.total).toBe(0);
    expect(result.categories).toEqual({});
  });

  test('categorizeWarnings groups by category', () => {
    const warnings: HardeningWarning[] = [
      { code: 'W1', message: 'Warn 1', source: 'src1', category: 'security' },
      { code: 'W2', message: 'Warn 2', source: 'src2', category: 'security' },
      { code: 'W3', message: 'Warn 3', source: 'src3', category: 'consistency' },
    ];
    const result = categorizeWarnings(warnings);
    expect(result.total).toBe(3);
    expect(result.categories.security).toBe(2);
    expect(result.categories.consistency).toBe(1);
  });

  test('categorizeWarnings handles single warning', () => {
    const warnings: HardeningWarning[] = [
      { code: 'W1', message: 'Test', source: 'src', category: 'contract' },
    ];
    const result = categorizeWarnings(warnings);
    expect(result.total).toBe(1);
    expect(result.categories.contract).toBe(1);
  });

  test('formatWarningSummary returns none found for empty', () => {
    const report = categorizeWarnings([]);
    expect(formatWarningSummary(report)).toBe('Nenhum warning encontrado');
  });

  test('formatWarningSummary formats categories', () => {
    const warnings: HardeningWarning[] = [
      { code: 'W1', message: 'Test', source: 'src', category: 'security' },
    ];
    const report = categorizeWarnings(warnings);
    expect(formatWarningSummary(report)).toBe('1 security');
  });

  test('formatWarningSummary formats multiple categories', () => {
    const warnings: HardeningWarning[] = [
      { code: 'W1', message: 'Test', source: 'src', category: 'security' },
      { code: 'W2', message: 'Test', source: 'src', category: 'sync' },
    ];
    const report = categorizeWarnings(warnings);
    expect(formatWarningSummary(report)).toContain('1 security');
    expect(formatWarningSummary(report)).toContain('1 sync');
  });

  test('preserves warning objects in report', () => {
    const warnings: HardeningWarning[] = [
      { code: 'W1', message: 'Test message', source: 'source-a', category: 'output', details: { key: 'val' } },
    ];
    const result = categorizeWarnings(warnings);
    expect(result.warnings[0].code).toBe('W1');
    expect(result.warnings[0].details).toEqual({ key: 'val' });
  });
});
