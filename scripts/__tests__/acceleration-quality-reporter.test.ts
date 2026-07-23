import { qualityGate } from '../acceleration/quality-gate';
import { writeReport } from '../acceleration/reporter';
import { EngineReport, Forecast, PrecisionReport, JobResult, ScorecardAnalysis, CoverageAnalysis } from '../acceleration/types';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('acceleration - quality-gate', () => {
  const forecast: Forecast = { estimatedJobs: 5, estimatedDurationMs: 2000, risk: 'low' };
  const precision: PrecisionReport = { confidence: 0.95, variance: 0.05, stable: true };
  const scorecard: ScorecardAnalysis = { score: 90, trend: 'up', status: 'good' };
  const coverage: CoverageAnalysis = { total: 85, lines: 85, branches: 80, functions: 85, status: 'good' };

  it('deve aprovar execucao limpa', () => {
    const results: JobResult[] = [
      { id: 'j1', name: 't1', status: 'success', durationMs: 100, exitCode: 0 },
    ];
    const q = qualityGate(results, forecast, precision, scorecard, coverage);
    expect(q.approved).toBe(true);
    expect(q.score).toBeGreaterThanOrEqual(80);
  });

  it('deve reprovar se houver falha', () => {
    const results: JobResult[] = [
      { id: 'j1', name: 't1', status: 'failed', durationMs: 100, exitCode: 1, error: 'fail' },
    ];
    const q = qualityGate(results, forecast, precision, scorecard, coverage);
    expect(q.approved).toBe(false);
    expect(q.reasons).toContain('ha falhas na execucao');
  });

  it('deve reduzir score a cada falha', () => {
    const results: JobResult[] = [
      { id: 'j1', name: 't1', status: 'failed', durationMs: 100, exitCode: 1, error: 'e1' },
      { id: 'j2', name: 't2', status: 'failed', durationMs: 100, exitCode: 1, error: 'e2' },
    ];
    const q = qualityGate(results, forecast, precision, scorecard, coverage);
    expect(q.score).toBeLessThan(100);
  });

  it('deve alertar precisao instavel', () => {
    const results: JobResult[] = [{ id: 'j1', name: 't1', status: 'success', durationMs: 100, exitCode: 0 }];
    const unstablePrecision: PrecisionReport = { confidence: 0.5, variance: 0.4, stable: false };
    const q = qualityGate(results, forecast, unstablePrecision, scorecard, coverage);
    expect(q.reasons).toContain('precisao instavel');
    expect(q.score).toBeGreaterThanOrEqual(0);
    expect(q.score).toBeLessThan(100);
  });

  it('deve funcionar sem scorecard/coverage opcionais', () => {
    const results: JobResult[] = [{ id: 'j1', name: 't1', status: 'success', durationMs: 100, exitCode: 0 }];
    const q = qualityGate(results, forecast, precision);
    expect(q.score).toBeGreaterThanOrEqual(0);
  });

  it('score nunca deve ser negativo', () => {
    const results: JobResult[] = [
      { id: 'j1', name: 't1', status: 'failed', durationMs: 10000, exitCode: 1, error: 'x' },
      { id: 'j2', name: 't2', status: 'failed', durationMs: 10000, exitCode: 1, error: 'y' },
      { id: 'j3', name: 't3', status: 'failed', durationMs: 10000, exitCode: 1, error: 'z' },
    ];
    const q = qualityGate(results, forecast, precision, scorecard, coverage);
    expect(q.score).toBeGreaterThanOrEqual(0);
  });
});

describe('acceleration - reporter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reporter-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const makeReport = (overrides: Partial<EngineReport> = {}): EngineReport => ({
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:01:00.000Z',
    mode: 'balanced',
    forecast: { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'low' },
    precision: { confidence: 0.9, variance: 0.1, stable: true },
    quality: { approved: true, score: 92, reasons: [] },
    scorecard: { score: 85, trend: 'flat', status: 'good' },
    coverage: { total: 82, lines: 85, branches: 78, functions: 80, status: 'good' },
    gaps: [{ id: 'g1', severity: 'low', description: 'minor gap' }],
    maturity: { score: 75, level: 'medium' },
    history: { successRate: 0.9, averageQualityScore: 80, averageDurationMs: 5000, runs: 10 },
    results: [{ id: 'j1', name: 'test-job', status: 'success', durationMs: 500, exitCode: 0 }],
    totalDurationMs: 60000,
    success: true,
    ...overrides,
  });

  it('deve gerar arquivo JSON', () => {
    const config = { mode: 'balanced' as const, concurrency: 4, loop: false, stopOnFailure: true, reportDir: tmpDir, cacheFile: '', stateFile: '', metricsFile: '', telemetryFile: '' };
    writeReport(config, makeReport());
    const files = fs.readdirSync(tmpDir);
    expect(files.some(f => f.endsWith('.json'))).toBe(true);
  });

  it('deve gerar arquivo Markdown', () => {
    const config = { mode: 'balanced' as const, concurrency: 4, loop: false, stopOnFailure: true, reportDir: tmpDir, cacheFile: '', stateFile: '', metricsFile: '', telemetryFile: '' };
    writeReport(config, makeReport());
    const files = fs.readdirSync(tmpDir);
    expect(files.some(f => f.endsWith('.md'))).toBe(true);
  });

  it('JSON deve conter campos principais do report', () => {
    const config = { mode: 'balanced' as const, concurrency: 4, loop: false, stopOnFailure: true, reportDir: tmpDir, cacheFile: '', stateFile: '', metricsFile: '', telemetryFile: '' };
    writeReport(config, makeReport());
    const jsonFile = fs.readdirSync(tmpDir).find(f => f.endsWith('.json'))!;
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, jsonFile), 'utf8'));
    expect(content.mode).toBe('balanced');
    expect(content.success).toBe(true);
    expect(content.quality.score).toBe(92);
  });
});