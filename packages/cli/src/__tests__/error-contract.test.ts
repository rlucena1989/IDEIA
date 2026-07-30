import { describe, it, expect } from '@jest/globals';

describe('hardening - error-contract', () => {
  it('categorizeErrors classifica por severidade', () => {
    const { categorizeErrors } = require('../hardening/error-contract');
    const errors = [
      { code: 'CRIT1', message: 'Critical error', severity: 'critical' as const },
      { code: 'ERR1', message: 'Regular error', severity: 'error' as const },
      { code: 'WARN1', message: 'Warning', severity: 'warning' as const },
      { code: 'INFO1', message: 'Info', severity: 'info' as const },
    ];

    const report = categorizeErrors(errors);
    expect(report.totalCritical).toBe(1);
    expect(report.totalErrors).toBe(1);
    expect(report.totalWarnings).toBe(1);
    expect(report.errors).toHaveLength(4);
  });

  it('categorizeErrors retorna zeros para array vazio', () => {
    const { categorizeErrors } = require('../hardening/error-contract');
    const report = categorizeErrors([]);
    expect(report.totalCritical).toBe(0);
    expect(report.totalErrors).toBe(0);
    expect(report.totalWarnings).toBe(0);
    expect(report.errors).toHaveLength(0);
  });

  it('categorizeErrors conta multiplos criticos', () => {
    const { categorizeErrors } = require('../hardening/error-contract');
    const errors = [
      { code: 'C1', message: 'C1', severity: 'critical' as const },
      { code: 'C2', message: 'C2', severity: 'critical' as const },
      { code: 'C3', message: 'C3', severity: 'critical' as const },
    ];
    const report = categorizeErrors(errors);
    expect(report.totalCritical).toBe(3);
  });

  it('formatErrorSummary formata corretamente com todos os tipos', () => {
    const { categorizeErrors, formatErrorSummary } = require('../hardening/error-contract');
    const errors = [
      { code: 'C1', message: 'C1', severity: 'critical' as const },
      { code: 'E1', message: 'E1', severity: 'error' as const },
      { code: 'W1', message: 'W1', severity: 'warning' as const },
    ];
    const report = categorizeErrors(errors);
    const summary = formatErrorSummary(report);
    expect(summary).toContain('crítico');
    expect(summary).toContain('erro');
    expect(summary).toContain('aviso');
  });

  it('formatErrorSummary retorna nenhum problema quando vazio', () => {
    const { categorizeErrors, formatErrorSummary } = require('../hardening/error-contract');
    const report = categorizeErrors([]);
    const summary = formatErrorSummary(report);
    expect(summary).toBe('Nenhum problema encontrado');
  });

  it('formatErrorSummary com apenas warnings', () => {
    const { categorizeErrors, formatErrorSummary } = require('../hardening/error-contract');
    const errors = [
      { code: 'W1', message: 'W1', severity: 'warning' as const },
      { code: 'W2', message: 'W2', severity: 'warning' as const },
    ];
    const report = categorizeErrors(errors);
    const summary = formatErrorSummary(report);
    expect(summary).toContain('aviso');
    expect(summary).not.toContain('crítico');
  });
});
