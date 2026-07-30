import { categorizeErrors, formatErrorSummary, HardeningError } from '../error-contract';

describe('error-contract', () => {
  test('categorizeErrors returns empty report for no errors', () => {
    const result = categorizeErrors([]);
    expect(result.totalErrors).toBe(0);
    expect(result.totalWarnings).toBe(0);
    expect(result.totalCritical).toBe(0);
  });

  test('categorizeErrors counts critical severity', () => {
    const errors: HardeningError[] = [
      { code: 'CRIT1', message: 'Critical error', severity: 'critical' },
      { code: 'CRIT2', message: 'Another critical', severity: 'critical' },
    ];
    const result = categorizeErrors(errors);
    expect(result.totalCritical).toBe(2);
    expect(result.totalErrors).toBe(0);
  });

  test('categorizeErrors counts error severity', () => {
    const errors: HardeningError[] = [
      { code: 'ERR1', message: 'Error', severity: 'error' },
      { code: 'ERR2', message: 'Another error', severity: 'error' },
    ];
    const result = categorizeErrors(errors);
    expect(result.totalErrors).toBe(2);
    expect(result.totalCritical).toBe(0);
  });

  test('categorizeErrors counts warning severity', () => {
    const errors: HardeningError[] = [
      { code: 'WARN1', message: 'Warning', severity: 'warning' },
    ];
    const result = categorizeErrors(errors);
    expect(result.totalWarnings).toBe(1);
  });

  test('categorizeErrors preserves all errors', () => {
    const errors: HardeningError[] = [
      { code: 'E1', message: 'Error 1', severity: 'error' },
      { code: 'W1', message: 'Warning 1', severity: 'warning' },
      { code: 'C1', message: 'Critical 1', severity: 'critical' },
    ];
    const result = categorizeErrors(errors);
    expect(result.errors).toHaveLength(3);
  });

  test('categorizeErrors returns correct totals for mixed severities', () => {
    const errors: HardeningError[] = [
      { code: 'C1', message: 'Critical', severity: 'critical' },
      { code: 'E1', message: 'Error', severity: 'error' },
      { code: 'E2', message: 'Error', severity: 'error' },
      { code: 'W1', message: 'Warning', severity: 'warning' },
      { code: 'I1', message: 'Info', severity: 'info' },
    ];
    const result = categorizeErrors(errors);
    expect(result.totalCritical).toBe(1);
    expect(result.totalErrors).toBe(2);
    expect(result.totalWarnings).toBe(1);
  });

  test('formatErrorSummary returns none found for empty report', () => {
    const report = categorizeErrors([]);
    expect(formatErrorSummary(report)).toBe('Nenhum problema encontrado');
  });

  test('formatErrorSummary formats critical only', () => {
    const errors: HardeningError[] = [
      { code: 'C1', message: 'Critical', severity: 'critical' },
    ];
    const report = categorizeErrors(errors);
    expect(formatErrorSummary(report)).toBe('1 crítico(s)');
  });

  test('formatErrorSummary formats mixed', () => {
    const errors: HardeningError[] = [
      { code: 'C1', message: 'Critical', severity: 'critical' },
      { code: 'E1', message: 'Error', severity: 'error' },
      { code: 'W1', message: 'Warning', severity: 'warning' },
    ];
    const report = categorizeErrors(errors);
    expect(formatErrorSummary(report)).toBe('1 crítico(s), 1 erro(s), 1 aviso(s)');
  });
});
