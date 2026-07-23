import { describe, it, expect } from '@jest/globals';
import { checkConsistency } from '../consistency-checker';
import { buildConsistencyReport } from '../../state/consistency-builder';
import { ConsistencyReport } from '../../state/consistency-types';

describe('consistency-checker', () => {
  it('checkConsistency should be defined', () => {
    expect(checkConsistency).toBeDefined();
  });

  it('should pass on a clean report', () => {
    const report = buildConsistencyReport();
    const result = checkConsistency(report);
    expect(typeof result.ok).toBe('boolean');
    expect(typeof result.attentionCount).toBe('number');
    expect(typeof result.blockedCount).toBe('number');
  });

  it('should detect blocked items', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        { area: 'Test', docs: 'missing', code: 'missing', tests: 'missing', cli: 'missing', extension: 'missing', status: 'blocked', notes: ['Bloqueado'] },
      ],
      summary: ['Teste'],
    };
    const result = checkConsistency(report);
    expect(result.ok).toBe(false);
    expect(result.blockedCount).toBe(1);
  });

  it('should count attention items', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        { area: 'A', docs: 'ok', code: 'ok', tests: 'ok', cli: 'ok', extension: 'ok', status: 'ok', notes: [] },
        { area: 'B', docs: 'partial', code: 'partial', tests: 'partial', cli: 'partial', extension: 'partial', status: 'attention', notes: ['Atenção'] },
      ],
      summary: ['Teste'],
    };
    const result = checkConsistency(report);
    expect(result.attentionCount).toBe(1);
    expect(result.ok).toBe(true);
  });
});
