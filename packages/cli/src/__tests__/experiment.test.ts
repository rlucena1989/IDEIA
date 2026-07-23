import { ExperimentRun, ExperimentResult, ExperimentReport } from '../local-ai/experiment/types';
import { buildReport, formatReportMarkdown, formatReportJson } from '../local-ai/experiment/reporter';

describe('experiment - types', () => {
  it('deve definir estrutura basica', () => {
    const run: ExperimentRun = {
      id: 'exp-1',
      prompt: 'test prompt',
      promptHash: 'abc123',
      createdAt: '2026-01-01T00:00:00.000Z',
      results: [],
    };
    expect(run.id).toBe('exp-1');
    expect(run.results).toEqual([]);
  });
});

describe('experiment - reporter', () => {
  const makeResult = (overrides: Partial<ExperimentResult> = {}): ExperimentResult => ({
    modelId: 'gpt-4o',
    provider: 'openai',
    response: 'some response text here',
    latencyMs: 500,
    tokensIn: 100,
    tokensOut: 50,
    costUsd: 0.002,
    status: 'success',
    ...overrides,
  });

  const makeRun = (overrides: Partial<ExperimentRun> = {}): ExperimentRun => ({
    id: 'exp-1',
    prompt: 'hello',
    promptHash: 'abc',
    createdAt: '2026-01-01T00:00:00.000Z',
    results: [
      makeResult({ modelId: 'gpt-4o', latencyMs: 500, costUsd: 0.002, tokensOut: 50 }),
      makeResult({ modelId: 'claude-3', latencyMs: 300, costUsd: 0.001, tokensOut: 80, qualityScore: 95 }),
      makeResult({ modelId: 'llama3', latencyMs: 800, costUsd: 0.0005, tokensOut: 40, qualityScore: 85 }),
    ],
    ...overrides,
  });

  describe('buildReport', () => {
    it('deve identificar modelo mais rapido', () => {
      const report = buildReport(makeRun());
      expect(report.fastest.modelId).toBe('claude-3');
      expect(report.fastest.latencyMs).toBe(300);
    });

    it('deve identificar modelo mais barato', () => {
      const report = buildReport(makeRun());
      expect(report.cheapest.modelId).toBe('llama3');
    });

    it('deve identificar modelo com mais tokens', () => {
      const report = buildReport(makeRun());
      expect(report.mostTokens.modelId).toBe('claude-3');
      expect(report.mostTokens.tokensOut).toBe(80);
    });

    it('deve calcular totalModels', () => {
      const report = buildReport(makeRun());
      expect(report.totalModels).toBe(3);
    });

    it('deve gerar ranking se ha quality scores', () => {
      const report = buildReport(makeRun());
      expect(report.ranking).toBeDefined();
      expect(report.ranking!.length).toBe(2);
      expect(report.ranking![0].modelId).toBe('claude-3');
    });

    it('deve lidar com resultados vazios', () => {
      const report = buildReport(makeRun({ results: [] }));
      expect(report.totalModels).toBe(0);
      expect(report.ranking).toBeUndefined();
    });

    it('deve lidar com todos resultados com erro', () => {
      const report = buildReport(makeRun({ results: [makeResult({ status: 'error', error: 'fail' })] }));
      expect(report.fastest.modelId).toBe('(nenhum)');
      expect(report.ranking).toBeUndefined();
    });
  });

  describe('formatReportMarkdown', () => {
    it('deve incluir cabecalho e metricas', () => {
      const report = buildReport(makeRun());
      const md = formatReportMarkdown(report);
      expect(md).toContain('Relatório de Experimento');
      expect(md).toContain('exp-1');
      expect(md).toContain('3');
    });

    it('deve incluir ranking quando disponivel', () => {
      const report = buildReport(makeRun());
      const md = formatReportMarkdown(report);
      expect(md).toContain('Ranking por Qualidade');
    });
  });

  describe('formatReportJson', () => {
    it('deve gerar JSON valido', () => {
      const report = buildReport(makeRun());
      const json = formatReportJson(report);
      const parsed = JSON.parse(json);
      expect(parsed.experimentId).toBe('exp-1');
    });
  });
});