import { Telemetry } from '../acceleration/telemetry';
import { MetricsStore } from '../acceleration/metrics-store';
import { Observability } from '../acceleration/observability';
import { buildAlerts } from '../acceleration/alerts';
import { decideFeedback } from '../acceleration/feedback-controller';
import { defaultThresholds } from '../acceleration/thresholds';
import { healthCheck } from '../acceleration/health-check';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('acceleration - telemetry', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tele-')), 'tele.json');
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch {}
  });

  it('deve emitir e recuperar eventos', () => {
    const t = new Telemetry(tmpFile);
    t.emit('test.event', { value: 42 });
    const all = t.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('test.event');
    expect(all[0].data).toEqual({ value: 42 });
  });

  it('deve persistir eventos em disco', () => {
    const t1 = new Telemetry(tmpFile);
    t1.emit('persist', { ok: true });
    const t2 = new Telemetry(tmpFile);
    expect(t2.getAll()).toHaveLength(1);
  });
});

describe('acceleration - metrics-store', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'met-')), 'metrics.json');
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch {}
  });

  it('deve registrar e recuperar metricas', () => {
    const m = new MetricsStore(tmpFile);
    m.record('test.counter', 10, { tag: 'val' });
    const all = m.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('test.counter');
    expect(all[0].value).toBe(10);
    expect(all[0].tags).toEqual({ tag: 'val' });
  });
});

describe('acceleration - observability', () => {
  let obs: Observability;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-'));
    const tele = new Telemetry(path.join(tmpDir, 'tele.json'));
    const metrics = new MetricsStore(path.join(tmpDir, 'met.json'));
    obs = new Observability(tele, metrics);
  });

  it('trackCycleStart deve registrar evento e metrica', () => {
    expect(() => obs.trackCycleStart('fast')).not.toThrow();
  });

  it('trackCycleEnd deve registrar fim de ciclo', () => {
    expect(() => obs.trackCycleEnd('balanced', true, 1000, 95)).not.toThrow();
  });

  it('trackAlert deve registrar alerta', () => {
    expect(() => obs.trackAlert('warning', 'test alert')).not.toThrow();
  });

  it('trackDecision deve registrar decisao', () => {
    expect(() => obs.trackDecision({ mode: 'deep', shouldPause: true, reason: 'test' })).not.toThrow();
  });
});

describe('acceleration - thresholds', () => {
  it('deve ter valores default', () => {
    expect(defaultThresholds.scorecardMin).toBe(80);
    expect(defaultThresholds.coverageMin).toBe(80);
    expect(defaultThresholds.historySuccessMin).toBe(0.8);
    expect(defaultThresholds.maturityMin).toBe(70);
  });
});

describe('acceleration - alerts', () => {
  const scorecardGood = { score: 90, trend: 'flat' as const, status: 'good' as const };
  const coverageGood = { total: 85, lines: 85, branches: 80, functions: 80, status: 'good' as const };
  const historyGood = { successRate: 0.95, averageQualityScore: 90, averageDurationMs: 1000, runs: 10 };

  it('nao deve gerar alertas se tudo ok', () => {
    const alerts = buildAlerts(defaultThresholds, scorecardGood, coverageGood, historyGood);
    expect(alerts).toHaveLength(0);
  });

  it('deve gerar alerta critical se scorecard baixo', () => {
    const scorecardBad = { ...scorecardGood, score: 60, status: 'warning' as const };
    const alerts = buildAlerts(defaultThresholds, scorecardBad, coverageGood, historyGood);
    expect(alerts.some(a => a.level === 'critical')).toBe(true);
  });

  it('deve gerar alerta warning se coverage baixo', () => {
    const coverageBad = { ...coverageGood, total: 65, status: 'warning' as const };
    const alerts = buildAlerts(defaultThresholds, scorecardGood, coverageBad, historyGood);
    expect(alerts.some(a => a.level === 'warning')).toBe(true);
  });

  it('deve gerar alerta critical se successRate baixo', () => {
    const historyBad = { ...historyGood, successRate: 0.5 };
    const alerts = buildAlerts(defaultThresholds, scorecardGood, coverageGood, historyBad);
    expect(alerts.some(a => a.level === 'critical')).toBe(true);
  });
});

describe('acceleration - feedback-controller', () => {
  it('deve pausar e ir para deep se alerta critical', () => {
    const alerts = [{ level: 'critical' as const, message: 'fail' }];
    const result = decideFeedback(alerts, 'balanced');
    expect(result.nextMode).toBe('deep');
    expect(result.shouldPause).toBe(true);
  });

  it('deve ir para deep sem pausar se warning', () => {
    const alerts = [{ level: 'warning' as const, message: 'warn' }];
    const result = decideFeedback(alerts, 'fast');
    expect(result.nextMode).toBe('deep');
    expect(result.shouldPause).toBe(false);
  });

  it('deve manter modo se sem alertas', () => {
    const result = decideFeedback([], 'balanced');
    expect(result.nextMode).toBe('balanced');
    expect(result.shouldPause).toBe(false);
  });
});

describe('acceleration - health-check', () => {
  it('deve verificar existencia de configs no dir atual', () => {
    const result = healthCheck();
    expect(result).toHaveProperty('healthy');
    expect(result).toHaveProperty('reasons');
    expect(Array.isArray(result.reasons)).toBe(true);
  });
});