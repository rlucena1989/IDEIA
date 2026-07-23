import { topologicalSort } from '../acceleration/task-graph';
import { PriorityQueue } from '../acceleration/priority-queue';
import { getRetryDecision } from '../acceleration/retry-policy';
import { StateManager } from '../acceleration/state-manager';
import { MetricsStore } from '../acceleration/metrics-store';
import { analyzeHistory } from '../acceleration/history-analyzer';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('acceleration - task-graph topSort', () => {
  it('deve retornar ordenacao vazia para entrada vazia', () => {
    const result = topologicalSort([]);
    expect(result).toEqual([]);
  });

  it('deve ordenar nos sem dependencias', () => {
    const result = topologicalSort([
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: [] },
    ]);
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  it('deve respeitar dependencias (a antes de b)', () => {
    const result = topologicalSort([
      { id: 'b', dependsOn: ['a'] },
      { id: 'a', dependsOn: [] },
    ]);
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
  });

  it('deve lidar com grafo complexo', () => {
    const result = topologicalSort([
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['b'] },
      { id: 'd', dependsOn: ['a', 'b'] },
    ]);
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
    expect(result.indexOf('b')).toBeLessThan(result.indexOf('c'));
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('d'));
  });

  it('deve ignorar dependencias ciclicas', () => {
    const result = topologicalSort([
      { id: 'a', dependsOn: ['b'] },
      { id: 'b', dependsOn: ['a'] },
    ]);
    // Deve retornar ambos sem entrar em loop infinito
    expect(result).toContain('a');
    expect(result).toContain('b');
  });
});

describe('acceleration - priority-queue', () => {
  it('deve estar vazia inicialmente', () => {
    const q = new PriorityQueue<string>();
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
  });

  it('deve retornar itens por prioridade (maior primeiro)', () => {
    const q = new PriorityQueue<string>();
    q.push('low', 1);
    q.push('high', 10);
    q.push('medium', 5);
    expect(q.pop()).toBe('high');
    expect(q.pop()).toBe('medium');
    expect(q.pop()).toBe('low');
  });

  it('pop deve retornar undefined se vazia', () => {
    const q = new PriorityQueue<string>();
    expect(q.pop()).toBeUndefined();
  });

  it('deve atualizar size corretamente', () => {
    const q = new PriorityQueue<number>();
    expect(q.size()).toBe(0);
    q.push(1, 1);
    q.push(2, 2);
    expect(q.size()).toBe(2);
    q.pop();
    expect(q.size()).toBe(1);
  });
});

describe('acceleration - retry-policy', () => {
  it('deve retornar shouldRetry=true para attempt < maxAttempts', () => {
    const decision = getRetryDecision(0);
    expect(decision.shouldRetry).toBe(true);
    expect(decision.delayMs).toBeGreaterThan(0);
  });

  it('deve retornar shouldRetry=false quando atingir maxAttempts', () => {
    const decision = getRetryDecision(3);
    expect(decision.shouldRetry).toBe(false);
  });

  it('deve aumentar delay exponencialmente', () => {
    const d1 = getRetryDecision(0);
    const d2 = getRetryDecision(1);
    const d3 = getRetryDecision(2);
    expect(d1.delayMs).toBe(1000);
    expect(d2.delayMs).toBe(2000);
    expect(d3.delayMs).toBe(4000);
  });

  it('delay maximo deve ser 10s', () => {
    const decision = getRetryDecision(10, 20);
    expect(decision.delayMs).toBeLessThanOrEqual(10000);
  });
});

describe('acceleration - state-manager', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'state-')), 'state.json');
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch {}
  });

  it('deve iniciar com estado padrao', () => {
    const sm = new StateManager(tmpFile);
    const state = sm.getState();
    expect(state.failures).toBe(0);
    expect(state.successes).toBe(0);
  });

  it('markSuccess deve incrementar successes', () => {
    const sm = new StateManager(tmpFile);
    sm.markSuccess('balanced');
    expect(sm.getState().successes).toBe(1);
  });

  it('markFailure deve incrementar failures', () => {
    const sm = new StateManager(tmpFile);
    sm.markFailure('deep');
    expect(sm.getState().failures).toBe(1);
  });

  it('deve persistir estado em disco', () => {
    const sm1 = new StateManager(tmpFile);
    sm1.markSuccess('fast', { quality: 95, maturity: 90 });
    const sm2 = new StateManager(tmpFile);
    expect(sm2.getState().successes).toBe(1);
    expect(sm2.getState().quality).toBe(95);
    expect(sm2.getState().maturity).toBe(90);
  });
});

describe('acceleration - metrics-store', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-')), 'metrics.json');
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch {}
  });

  it('deve registrar metrica', () => {
    const ms = new MetricsStore(tmpFile);
    ms.record('test.count', 42, { env: 'test' });
    const all = ms.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('test.count');
    expect(all[0].value).toBe(42);
  });

  it('deve persistir metricas', () => {
    const ms1 = new MetricsStore(tmpFile);
    ms1.record('persist', 1);
    const ms2 = new MetricsStore(tmpFile);
    expect(ms2.getAll()).toHaveLength(1);
  });
});

describe('acceleration - history-analyzer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('deve retornar defaults se diretorio vazio', () => {
    const history = analyzeHistory(tmpDir);
    expect(history.runs).toBe(0);
    expect(history.successRate).toBe(1);
    expect(history.averageQualityScore).toBe(80);
  });

  it('deve analisar relatorios existentes', () => {
    fs.writeFileSync(path.join(tmpDir, 'r1.json'), JSON.stringify({ success: true, quality: { score: 90 }, totalDurationMs: 5000 }));
    fs.writeFileSync(path.join(tmpDir, 'r2.json'), JSON.stringify({ success: true, quality: { score: 80 }, totalDurationMs: 3000 }));
    const history = analyzeHistory(tmpDir);
    expect(history.runs).toBe(2);
    expect(history.successRate).toBe(1);
    expect(history.averageQualityScore).toBe(85);
  });

  it('deve ignorar arquivos JSON invalidos', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.json'), 'invalid{json');
    fs.writeFileSync(path.join(tmpDir, 'good.json'), JSON.stringify({ success: true, quality: { score: 75 }, totalDurationMs: 4000 }));
    const history = analyzeHistory(tmpDir);
    expect(history.runs).toBe(1);
  });
});