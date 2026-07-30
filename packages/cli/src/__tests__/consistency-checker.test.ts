import { describe, it, expect } from '@jest/globals';

describe('hardening - consistency-checker', () => {
  it('checkConsistency retorna ok quando nao ha blocked', () => {
    const { checkConsistency } = require('../hardening/consistency-checker');
    const report = {
      generatedAt: '2024-01-01',
      items: [
        { area: 'a1', docs: 'ok', code: 'ok', tests: 'ok', cli: 'ok', extension: 'ok', status: 'ok' as const, notes: [] },
        { area: 'a2', docs: 'ok', code: 'partial', tests: 'ok', cli: 'ok', extension: 'ok', status: 'attention' as const, notes: ['review'] },
      ],
      summary: ['OK'],
    };

    const result = checkConsistency(report);
    expect(result.ok).toBe(true);
    expect(result.attentionCount).toBe(1);
    expect(result.blockedCount).toBe(0);
  });

  it('checkConsistency retorna ok false quando ha blocked', () => {
    const { checkConsistency } = require('../hardening/consistency-checker');
    const report = {
      generatedAt: '2024-01-01',
      items: [
        { area: 'a1', docs: 'missing', code: 'missing', tests: 'missing', cli: 'missing', extension: 'missing', status: 'blocked' as const, notes: ['critical'] },
      ],
      summary: ['Blocked'],
    };

    const result = checkConsistency(report);
    expect(result.ok).toBe(false);
    expect(result.blockedCount).toBe(1);
  });

  it('checkConsistency retorna 0 para relatorio vazio', () => {
    const { checkConsistency } = require('../hardening/consistency-checker');
    const report = { generatedAt: '2024-01-01', items: [], summary: [] };
    const result = checkConsistency(report);
    expect(result.ok).toBe(true);
    expect(result.attentionCount).toBe(0);
    expect(result.blockedCount).toBe(0);
  });

  it('checkConsistency retorna summary do relatorio', () => {
    const { checkConsistency } = require('../hardening/consistency-checker');
    const report = { generatedAt: '2024-01-01', items: [], summary: ['All checks passed'] };
    const result = checkConsistency(report);
    expect(result.summary).toEqual(['All checks passed']);
  });
});
