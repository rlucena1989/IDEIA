import { describe, it, expect } from '@jest/globals';
import { categorizeWarnings, formatWarningSummary } from '../warning-contract';
import { HardeningWarning } from '../warning-contract';

describe('warning-contract', () => {
  it('categorizeWarnings should be defined', () => {
    expect(categorizeWarnings).toBeDefined();
  });

  it('should return empty report for empty input', () => {
    const report = categorizeWarnings([]);
    expect(report.total).toBe(0);
    expect(Object.keys(report.categories).length).toBe(0);
  });

  it('should categorize warnings', () => {
    const warnings: HardeningWarning[] = [
      { code: 'W1', message: 'Test 1', source: 'a', category: 'consistency' },
      { code: 'W2', message: 'Test 2', source: 'b', category: 'consistency' },
      { code: 'W3', message: 'Test 3', source: 'c', category: 'sync' },
    ];
    const report = categorizeWarnings(warnings);
    expect(report.total).toBe(3);
    expect(report.categories['consistency']).toBe(2);
    expect(report.categories['sync']).toBe(1);
  });

  it('formatWarningSummary should be defined', () => {
    expect(formatWarningSummary).toBeDefined();
  });
});
