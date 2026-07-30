import { describe, it, expect } from '@jest/globals';

describe('hardening - warning-contract', () => {
  it('categorizeWarnings agrupa por categoria', () => {
    const { categorizeWarnings } = require('../hardening/warning-contract');
    const warnings = [
      { code: 'W1', message: 'Warning 1', source: 'src1', category: 'security' as const },
      { code: 'W2', message: 'Warning 2', source: 'src2', category: 'consistency' as const },
      { code: 'W3', message: 'Warning 3', source: 'src3', category: 'security' as const },
    ];

    const report = categorizeWarnings(warnings);
    expect(report.total).toBe(3);
    expect(report.categories['security']).toBe(2);
    expect(report.categories['consistency']).toBe(1);
  });

  it('categorizeWarnings retorna vazio para array vazio', () => {
    const { categorizeWarnings } = require('../hardening/warning-contract');
    const report = categorizeWarnings([]);
    expect(report.total).toBe(0);
    expect(report.categories).toEqual({});
  });

  it('formatWarningSummary formata resumo', () => {
    const { categorizeWarnings, formatWarningSummary } = require('../hardening/warning-contract');
    const warnings = [
      { code: 'W1', message: 'W1', source: 's1', category: 'security' as const },
      { code: 'W2', message: 'W2', source: 's2', category: 'contract' as const },
    ];
    const report = categorizeWarnings(warnings);
    const summary = formatWarningSummary(report);
    expect(summary).toContain('security');
    expect(summary).toContain('contract');
  });

  it('formatWarningSummary retorna nenhum warning quando vazio', () => {
    const { categorizeWarnings, formatWarningSummary } = require('../hardening/warning-contract');
    const report = categorizeWarnings([]);
    const summary = formatWarningSummary(report);
    expect(summary).toBe('Nenhum warning encontrado');
  });

  it('categorizeWarnings lida com multiplas categorias', () => {
    const { categorizeWarnings } = require('../hardening/warning-contract');
    const warnings = [
      { code: 'W1', message: 'W1', source: 's1', category: 'contract' as const },
      { code: 'W2', message: 'W2', source: 's2', category: 'consistency' as const },
      { code: 'W3', message: 'W3', source: 's3', category: 'sync' as const },
      { code: 'W4', message: 'W4', source: 's4', category: 'output' as const },
      { code: 'W5', message: 'W5', source: 's5', category: 'security' as const },
    ];
    const report = categorizeWarnings(warnings);
    expect(Object.keys(report.categories)).toHaveLength(5);
    expect(report.total).toBe(5);
  });
});
