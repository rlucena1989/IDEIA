import { describe, it, expect } from '@jest/globals';

describe('hardening - hardening-report', () => {
  it('buildHardeningReport gera relatorio com recomendacoes quando ha problemas', () => {
    const { buildHardeningReport } = require('../hardening/hardening-report');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'Estado com problemas',
      blocks: [],
      metrics: [{ name: 'test-metric', value: 100, unit: '%', description: 'Test' }],
      artifacts: [],
      commands: [],
      blockers: ['blocker1'],
      nextSteps: [],
    };

    const consistencyResult = {
      ok: false,
      attentionCount: 2,
      blockedCount: 1,
      summary: ['Blocked items found'],
    };

    const report = buildHardeningReport(state, consistencyResult);
    expect(report.generatedAt).toBeTruthy();
    expect(report.stateSummary).toBe('Estado com problemas');
    expect(report.consistencyStatus).toBe(consistencyResult);
    expect(report.metricsSnapshot).toHaveLength(1);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.some((r: string) => r.includes('bloqueador'))).toBe(true);
  });

  it('buildHardeningReport sem recomendacoes quando tudo ok', () => {
    const { buildHardeningReport } = require('../hardening/hardening-report');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'Estado OK',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };

    const consistencyResult = {
      ok: true,
      attentionCount: 0,
      blockedCount: 0,
      summary: ['All good'],
    };

    const report = buildHardeningReport(state, consistencyResult);
    expect(report.recommendations).toHaveLength(0);
  });

  it('buildHardeningReport recomenda revisar areas com atencao', () => {
    const { buildHardeningReport } = require('../hardening/hardening-report');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'OK',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };

    const consistencyResult = {
      ok: true,
      attentionCount: 3,
      blockedCount: 0,
      summary: ['Attention needed'],
    };

    const report = buildHardeningReport(state, consistencyResult);
    expect(report.recommendations.some((r: string) => r.includes('Revisar'))).toBe(true);
  });
});
