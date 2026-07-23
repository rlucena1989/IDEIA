import { computeDelta } from '../acceleration/delta-engine';
import { mapImpact } from '../acceleration/impact-map';
import { EngineReport, PlannedJob } from '../acceleration/types';

const baseReport: EngineReport = {
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:01:00.000Z',
  mode: 'balanced',
  forecast: { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'low' },
  precision: { confidence: 0.9, variance: 0.1, stable: true },
  quality: { approved: true, score: 90, reasons: [] },
  scorecard: { score: 85, trend: 'flat', status: 'good' },
  coverage: { total: 82, lines: 85, branches: 78, functions: 80, status: 'good' },
  gaps: [],
  maturity: { score: 75, level: 'medium' },
  history: { successRate: 0.9, averageQualityScore: 80, averageDurationMs: 5000, runs: 10 },
  results: [],
  totalDurationMs: 60000,
  success: true,
};

describe('acceleration - delta-engine', () => {
  it('deve retornar zero delta se nao ha previous', () => {
    const delta = computeDelta(null, baseReport);
    expect(delta.qualityDelta).toBe(0);
    expect(delta.durationDelta).toBe(0);
    expect(delta.successChanged).toBe(false);
    expect(delta.modeChanged).toBe(false);
    expect(delta.summary).toContain('primeira execucao');
  });

  it('deve calcular diferenca de qualidade', () => {
    const prev = { ...baseReport, quality: { ...baseReport.quality, score: 80 } };
    const delta = computeDelta(prev, baseReport);
    expect(delta.qualityDelta).toBe(10);
    expect(delta.summary).toContain('+10');
  });

  it('deve detectar mudanca de sucesso', () => {
    const prev = { ...baseReport, success: false };
    const delta = computeDelta(prev, baseReport);
    expect(delta.successChanged).toBe(true);
  });

  it('deve detectar mudanca de modo', () => {
    const prev = { ...baseReport, mode: 'fast' as const };
    const delta = computeDelta(prev, baseReport);
    expect(delta.modeChanged).toBe(true);
    expect(delta.summary).toContain('fast -> balanced');
  });

  it('deve reportar sem mudancas significativas', () => {
    const prev = { ...baseReport };
    const delta = computeDelta(prev, baseReport);
    expect(delta.summary).toBe('sem mudancas significativas');
  });
});

describe('acceleration - impact-map', () => {
  it('deve retornar entradas vazias para plan vazio', () => {
    const impact = mapImpact([]);
    expect(impact).toEqual([]);
  });

  it('deve agrupar por tags', () => {
    const plan: PlannedJob[] = [
      { id: 'j1', name: 'j1', command: 'echo', priority: 1, dependsOn: [], tags: ['high-risk', 'bootstrap'] },
      { id: 'j2', name: 'j2', command: 'echo', priority: 1, dependsOn: [], tags: ['high-risk', 'finalize'] },
    ];
    const impact = mapImpact(plan);
    expect(impact.length).toBeGreaterThanOrEqual(3);
    const highRisk = impact.find(i => i.area === 'high-risk');
    expect(highRisk).toBeDefined();
    expect(highRisk!.jobCount).toBe(2);
  });

  it('deve calcular riskScore corretamente', () => {
    const plan: PlannedJob[] = [
      { id: 'j1', name: 'j1', command: 'echo', priority: 1, dependsOn: [], tags: ['high-risk'] },
    ];
    const impact = mapImpact(plan);
    const entry = impact.find(i => i.area === 'high-risk');
    expect(entry!.riskScore).toBe(3);
  });
});