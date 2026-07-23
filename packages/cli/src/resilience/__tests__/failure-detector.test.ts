import { describe, it, expect } from '@jest/globals';
import { detectFailures } from '../failure-detector';

describe('failure-detector', () => {
  it('detectFailures should be defined', () => {
    expect(detectFailures).toBeDefined();
  });

  it('should return empty for clean events', () => {
    const { failures, summary } = detectFailures([{ name: 'ok', severity: 'info' }]);
    expect(failures.length).toBe(0);
    expect(summary.total).toBe(0);
  });

  it('should detect error events', () => {
    const { failures, summary } = detectFailures([
      { name: 'e1', severity: 'error' },
      { name: 'e2', severity: 'error' },
    ]);
    expect(failures.length).toBe(2);
    expect(summary.total).toBe(2);
  });

  it('should detect critical events', () => {
    const { failures, summary } = detectFailures([
      { name: 'c1', severity: 'critical' },
    ]);
    expect(failures.length).toBe(1);
    expect(summary.critical).toBe(1);
  });

  it('should build summary by type', () => {
    const { summary } = detectFailures([
      { name: 'e1', severity: 'error' },
      { name: 'c1', severity: 'critical' },
    ]);
    expect(summary.byType['execution']).toBe(1);
    expect(summary.byType['critical']).toBe(1);
  });
});
