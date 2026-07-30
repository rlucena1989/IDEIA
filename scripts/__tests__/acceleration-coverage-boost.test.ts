import { parseExpression, simplify, exprToString } from '../../packages/acceleration/src/symbolic-engine';
import { mergeResults, weightedMerge, mergeByMajority } from '../../packages/acceleration/src/result-merger';
import { OLLAMA_ADAPTER, LOCAL_MOCK_ADAPTER } from '../../packages/acceleration/src/local-model-adapter';
import { OPENAI_ADAPTER, ANTHROPIC_ADAPTER, GOOGLE_ADAPTER } from '../../packages/acceleration/src/remote-model-adapter';
import { summary, median, correlation, linearRegression, quartiles } from '../../packages/acceleration/src/stats-engine';
import { evaluateFormula, registerFormula, listFormulas, getFormula } from '../../packages/acceleration/src/formula-registry';
import { runAllBenchmarks, runBenchmark } from '../../packages/acceleration/src/benchmark';
import { reachConsensus, createConsensusGroup, mockConsensus } from '../../packages/acceleration/src/consensus';
import { shouldInvalidate, invalidateByAgeMap, invalidateByPrefixMap } from '../../packages/acceleration/src/cache-invalidation';
import { evaluatePolicies, addPolicy, clearPolicies, getPolicies } from '../../packages/acceleration/src/policy-engine';
import { validateInput, validateOutput } from '../../packages/acceleration/src/guardrails';
import { estimateBudget, mergeBudgets, budgetToString } from '../../packages/acceleration/src/budget';
import { estimateTokens, estimateTimeMs, estimateCostUsd, estimateTotal } from '../../packages/acceleration/src/estimator';
import { rankProviders, selectProvider } from '../../packages/acceleration/src/provider-router';
import { mean, stddev, variance, sum, clamp, lerp, min, max, roundTo } from '../../packages/acceleration/src/numerical-engine';
import { force, kineticEnergy, potentialEnergy, power, density, momentum, acceleration } from '../../packages/acceleration/src/physics-engine';
import { detectAnomalies, detectTrend } from '../../packages/acceleration/src/anomaly-detector';
import { classifyComplexity, complexityToDepth } from '../../packages/acceleration/src/classifier';
import { readHardwareProfile, tierFromHardware } from '../../packages/acceleration/src/hardware-profile';
import { optimizeMode, suggestOptimizations, canRunLocally } from '../../packages/acceleration/src/optimizer';
import { isEnabled, enableFlag, disableFlag, listFlags, initializeFlags } from '../../packages/acceleration/src/feature-flags';
import { logAudit, getAuditLog, clearAuditLog, totalCost, totalTokens, successRate, exportAuditLog } from '../../packages/acceleration/src/audit-log';
import { compressSmart, compressToTarget, compressTrivial, compressRemoveComments, compressRemoveWhitespace, compressKeepStructure } from '../../packages/acceleration/src/context-compressor';
import { tokenizeMath, evaluateSimpleMath, extractNumbers, isNumeric } from '../../packages/acceleration/src/math-parser';
import { estimateTokensFromText, estimateTokensFromMessages, estimateTokensFromFiles, estimateOutputTokens } from '../../packages/acceleration/src/token-estimator';
import { countChars, countWords, estimateTokens as tokenMeterEstimate, measureCost, formatTokenReport } from '../../packages/acceleration/src/token-meter';
import { getCostEntry, calculateCost, listModels, cheapestModel } from '../../packages/acceleration/src/cost-model';
import { getLatency, estimateLatencyMs } from '../../packages/acceleration/src/latency-model';
import { selectRoute } from '../../packages/acceleration/src/route-selector';

describe('symbolic-engine (coverage boost)', () => {
  it('parseExpression com numeros negativos', () => {
    const e = parseExpression('-5');
    expect(e).toBeTruthy();
  });

  it('simplify com sqrt numerico', () => {
    const e = simplify({ op: 'sqrt', args: [9] });
    expect(e).toBe(3);
  });

  it('simplify com abs numerico', () => {
    const e = simplify({ op: 'abs', args: [-5] });
    expect(e).toBe(5);
  });

  it('simplify com multiplicacao por 1', () => {
    const e = simplify({ op: '*', args: [1, 'x'] });
    expect(e).toBe('x');
  });

  it('simplify com multiplicacao 0', () => {
    const e = simplify({ op: '*', args: [0, 'x'] });
    expect(e).toBe(0);
  });

  it('exprToString com operacao', () => {
    const s = exprToString({ op: '+', args: [1, 2] });
    expect(s).toBe('+(1, 2)');
  });

  it('exprToString com string', () => {
    expect(exprToString('x')).toBe('x');
  });

  it('parse expression with unknown identifier', () => {
    const e = parseExpression('foo');
    expect(e).toBe('foo');
  });
});

describe('result-merger (coverage boost)', () => {
  it('mergeResults vazio retorna null', () => {
    expect(mergeResults([])).toBeNull();
  });

  it('mergeResults objects', () => {
    const r = mergeResults([{ a: 1, b: 2 }, { c: 3 }]);
    expect(r).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('weightedMerge com pesos zero', () => {
    expect(weightedMerge([{ value: 10, weight: 0 }])).toBe(0);
  });

  it('weightedMerge fallback para nao numerico', () => {
    const r = weightedMerge([{ value: 'a', weight: 2 }, { value: 'b', weight: 1 }]);
    expect(r).toBe('a');
  });

  it('mergeByMajority retorna valor mais frequente', () => {
    expect(mergeByMajority(['a', 'b', 'a', 'c', 'a'])).toBe('a');
  });

  it('mergeByMajority vazio', () => {
    expect(mergeByMajority([])).toBeNull();
  });
});

describe('remote-model-adapter (coverage boost)', () => {
  it('OPENAI_ADAPTER nao disponivel sem API key', () => {
    expect(OPENAI_ADAPTER.isAvailable()).toBe(false);
  });

  it('ANTHROPIC_ADAPTER nao disponivel sem API key', () => {
    expect(ANTHROPIC_ADAPTER.isAvailable()).toBe(false);
  });

  it('GOOGLE_ADAPTER nao disponivel sem API key', () => {
    expect(GOOGLE_ADAPTER.isAvailable()).toBe(false);
  });

  it('OPENAI_ADAPTER retorna erro sem API key', async () => {
    const r = await OPENAI_ADAPTER.send({ model: 'gpt-4o', prompt: 'test', maxTokens: 100, temperature: 0.5, stream: false });
    expect(r.success).toBe(false);
    expect(r.error).toContain('OPENAI_API_KEY');
  });
});

describe('local-model-adapter (coverage boost)', () => {
  it('OLLAMA_ADAPTER disponivel apenas se instalado', () => {
    expect(typeof OLLAMA_ADAPTER.isAvailable()).toBe('boolean');
  });

  it('LOCAL_MOCK_ADAPTER sempre disponivel', () => {
    expect(LOCAL_MOCK_ADAPTER.isAvailable()).toBe(true);
  });

  it('LOCAL_MOCK_ADAPTER retorna resposta mock', async () => {
    const r = await LOCAL_MOCK_ADAPTER.send({ model: 'mock', prompt: 'test prompt', maxTokens: 100, temperature: 0.5, stream: false });
    expect(r.success).toBe(true);
    expect(r.content).toContain('test prompt');
  });
});

describe('stats-engine (coverage boost)', () => {
  it('quartiles', () => {
    const q = quartiles([1, 2, 3, 4, 5, 6, 7]);
    expect(q.q1).toBeDefined();
    expect(q.q3).toBeDefined();
  });

  it('linearRegression com n<2', () => {
    const r = linearRegression([1], [2]);
    expect(r.slope).toBe(0);
  });

  it('linearRegression normal', () => {
    const r = linearRegression([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r.slope).toBe(2);
    expect(r.intercept).toBe(0);
    expect(r.r2).toBeCloseTo(1, 1);
  });

  it('correlation com diferentes tamanhos retorna 0', () => {
    expect(correlation([1, 2], [1])).toBe(0);
  });

  it('summary com array vazio', () => {
    const s = summary([]);
    expect(s.count).toBe(0);
    expect(s.min).toBe(0);
  });
});

describe('formula-registry (coverage boost)', () => {
  it('evaluateFormula inexistente retorna null', () => {
    expect(evaluateFormula('nonexistent', 1, 2)).toBeNull();
  });

  it('listFormulas por categoria', () => {
    const formulas = listFormulas('finance');
    expect(formulas.length).toBeGreaterThanOrEqual(1);
  });

  it('getFormula', () => {
    const f = getFormula('bmi');
    expect(f).toBeDefined();
    expect(f!.name).toBe('bmi');
  });

  it('registerFormula customizada', () => {
    registerFormula({ name: 'test_calc', category: 'test', params: ['a', 'b'], eval: (a, b) => a * b });
    expect(evaluateFormula('test_calc', 3, 4)).toBe(12);
  });
});

describe('benchmark (coverage boost)', () => {
  it('runBenchmark com provider invalido retorna null', async () => {
    const r = await runBenchmark('invalid' as any);
    expect(r).toBeNull();
  });

  it('runAllBenchmarks inclui pelo menos mock', async () => {
    const results = await runAllBenchmarks();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(r => r.provider === 'mock')).toBe(true);
  });
});

describe('consensus (coverage boost)', () => {
  it('createConsensusGroup com providers conhecidos', () => {
    const g = createConsensusGroup(['mock', 'local', 'openai']);
    expect(g.length).toBe(3);
  });

  it('createConsensusGroup com provider desconhecido', () => {
    const g = createConsensusGroup(['unknown' as any]);
    expect(g.length).toBe(0);
  });
});

describe('cache-invalidation (coverage boost)', () => {
  it('invalidateByAgeMap', () => {
    const map = new Map();
    const old = { key: 'old', value: 'x', createdAt: new Date(Date.now() - 100000).toISOString(), ttlMs: 5000 };
    map.set('old', old);
    const recent = { key: 'recent', value: 'y', createdAt: new Date().toISOString(), ttlMs: 60000 };
    map.set('recent', recent);
    const r = invalidateByAgeMap(map, 50000);
    expect(r).toContain('old');
    expect(r).not.toContain('recent');
  });

  it('invalidateByPrefixMap', () => {
    const map = new Map();
    map.set('abc.1', { key: 'abc.1', value: 'x', createdAt: new Date().toISOString(), ttlMs: 60000 });
    map.set('abc.2', { key: 'abc.2', value: 'y', createdAt: new Date().toISOString(), ttlMs: 60000 });
    map.set('xyz.1', { key: 'xyz.1', value: 'z', createdAt: new Date().toISOString(), ttlMs: 60000 });
    const r = invalidateByPrefixMap(map, 'abc');
    expect(r.length).toBe(2);
  });

  it('shouldInvalidate sem TTL configurado', () => {
    const e = { key: 'x', value: 'y', createdAt: new Date().toISOString(), ttlMs: 60000 };
    expect(shouldInvalidate(e, { strategy: 'manual' })).toBe(false);
  });
});

describe('guardrails (coverage boost)', () => {
  it('validateOutput aceito para output pequeno', () => {
    const r = validateOutput('small output');
    expect(r.approved).toBe(true);
  });

  it('validateOutput rejeitado para output muito grande', () => {
    const r = validateOutput('x'.repeat(60000));
    expect(r.approved).toBe(false);
  });

  it('validateInput rejeita binario', () => {
    const r = validateInput('text\x00with\x01binary');
    expect(r.approved).toBe(false);
  });
});

describe('budget (coverage boost)', () => {
  it('mergeBudgets combina multiplos budgets', () => {
    const b1 = estimateBudget(2, 1000);
    const b2 = estimateBudget(5, 5000);
    const merged = mergeBudgets([b1, b2]);
    expect(merged.tokensMax).toBeGreaterThanOrEqual(b1.tokensMax + b2.tokensMax);
    expect(merged.costMaxUsd).toBeGreaterThan(0);
    expect(merged.latencyMaxMs).toBeGreaterThanOrEqual(b2.latencyMaxMs);
  });

  it('budgetToString formatado', () => {
    const b = estimateBudget(3, 1000);
    const s = budgetToString(b);
    expect(s).toContain('tokens=');
    expect(s).toContain('cost=$');
  });
});

describe('estimator (coverage boost)', () => {
  it('estimateCostUsd com provider local', () => {
    const c = estimateCostUsd(1000, 'simple', 'local');
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(0.01);
  });

  it('estimateTotal retorna objeto completo', () => {
    const e = estimateTotal('hello world test', 'moderate', 'fast', 'local');
    expect(e.tokens).toBeGreaterThan(0);
    expect(e.timeMs).toBeGreaterThan(0);
    expect(typeof e.costUsd).toBe('number');
  });
});

describe('numerical-engine (coverage boost)', () => {
  it('min com array vazio', () => { expect(min([])).toBe(0); });
  it('max com array vazio', () => { expect(max([])).toBe(0); });
  it('roundTo', () => { expect(roundTo(3.14159, 2)).toBe(3.14); });
  it('variance com 0 elementos', () => { expect(variance([])).toBe(0); });
  it('stddev com 0 elementos', () => { expect(stddev([])).toBe(0); });
});

describe('physics-engine (coverage boost)', () => {
  it('power', () => { expect(power(100, 10)).toBe(10); });
  it('power com time 0', () => { expect(power(100, 0)).toBe(0); });
  it('density', () => { expect(density(10, 2)).toBe(5); });
  it('density com volume 0', () => { expect(density(10, 0)).toBe(0); });
  it('momentum', () => { expect(momentum(5, 2)).toBe(10); });
  it('acceleration', () => { expect(acceleration(10, 2)).toBe(5); });
  it('acceleration com massa 0', () => { expect(acceleration(10, 0)).toBe(0); });
  it('velocityFromEnergy', () => { const v = kineticEnergy(2, 3); expect(v).toBe(9); });
});

describe('anomaly-detector (coverage boost)', () => {
  it('detectTrend com <3 valores retorna stable', () => {
    expect(detectTrend([1])).toBe('stable');
  });
});

describe('classifier (coverage boost)', () => {
  it('complexityToDepth mapeia todos os niveis', () => {
    expect(complexityToDepth('trivial')).toBe(1);
    expect(complexityToDepth('simple')).toBe(2);
    expect(complexityToDepth('moderate')).toBe(3);
    expect(complexityToDepth('hard')).toBe(5);
    expect(complexityToDepth('extreme')).toBe(8);
  });
});

describe('hardware-profile (coverage boost)', () => {
  it('tierFromHardware baixo para specs minimas', () => {
    const hw = { cpuCores: 1, cpuUsage: 0.9, ramTotalGb: 2, ramFreeGb: 0.1, diskFreeGb: 0, nodeVersion: 'v20', platform: 'win32' };
    expect(tierFromHardware(hw)).toBe('low');
  });

  it('tierFromHardware alto para specs altas', () => {
    const hw = { cpuCores: 16, cpuUsage: 0.1, ramTotalGb: 64, ramFreeGb: 32, diskFreeGb: 500, nodeVersion: 'v22', platform: 'linux' };
    expect(tierFromHardware(hw)).toBe('high');
  });
});

describe('optimizer (coverage boost)', () => {
  it('canRunLocally verifica RAM', () => {
    const hw = { cpuCores: 4, cpuUsage: 0.3, ramTotalGb: 16, ramFreeGb: 8, diskFreeGb: 100, nodeVersion: 'v20', platform: 'win32' };
    expect(canRunLocally(hw, 4)).toBe(true);
    expect(canRunLocally(hw, 16)).toBe(false);
  });
});

describe('feature-flags (coverage boost)', () => {
  it('initializeFlags carrega defaults', () => {
    initializeFlags();
    const flags = listFlags();
    expect(flags.length).toBeGreaterThan(0);
  });
});

describe('audit-log (coverage boost)', () => {
  beforeEach(() => clearAuditLog());

  it('totalCost e totalTokens', () => {
    logAudit({ action: 'a', provider: 'mock', tokens: 100, costUsd: 0.05, latencyMs: 10, success: true, details: '' });
    logAudit({ action: 'b', provider: 'mock', tokens: 200, costUsd: 0.10, latencyMs: 20, success: false, details: '' });
    expect(totalCost()).toBeCloseTo(0.15, 2);
    expect(totalTokens()).toBe(300);
  });

  it('successRate', () => {
    logAudit({ action: 'a', provider: 'mock', tokens: 10, costUsd: 0.01, latencyMs: 5, success: true, details: '' });
    logAudit({ action: 'b', provider: 'mock', tokens: 10, costUsd: 0.01, latencyMs: 5, success: false, details: '' });
    expect(successRate()).toBe(0.5);
  });

  it('successRate com log vazio', () => {
    expect(successRate()).toBe(1);
  });
});

describe('context-compressor (coverage boost)', () => {
  it('compressTrivial', () => {
    const r = compressTrivial('  hello   world  ');
    expect(r).toBe('hello world');
  });

  it('compressRemoveComments', () => {
    const r = compressRemoveComments('a // comment\nb /* block */ c');
    expect(r).not.toContain('comment');
  });

  it('compressKeepStructure com menos linhas que max', () => {
    const r = compressKeepStructure('a\nb\nc', 10);
    expect(r).toBe('a\nb\nc');
  });
});

describe('math-parser (coverage boost)', () => {
  it('isNumeric', () => {
    expect(isNumeric('123')).toBe(true);
    expect(isNumeric('abc')).toBe(false);
  });

  it('evaluateSimpleMath com expressao invalida', () => {
    expect(evaluateSimpleMath('not math')).toBeNull();
  });
});

describe('token-estimator (coverage boost)', () => {
  it('estimateTokensFromMessages', () => {
    const t = estimateTokensFromMessages([{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'world' }]);
    expect(t).toBeGreaterThan(0);
  });

  it('estimateTokensFromFiles', () => {
    const t = estimateTokensFromFiles([{ path: 'test.ts', content: 'const x = 1;' }]);
    expect(t).toBeGreaterThan(0);
  });

  it('estimateOutputTokens', () => {
    expect(estimateOutputTokens('simple')).toBe(200);
    expect(estimateOutputTokens('moderate')).toBe(500);
    expect(estimateOutputTokens('complex')).toBe(1500);
  });
});

describe('token-meter (coverage boost)', () => {
  it('countWords', () => { expect(countWords('hello world')).toBe(2); });
  it('countWords vazio', () => { expect(countWords('')).toBe(0); });
  it('measureCost', () => { expect(measureCost(1000, 0.01)).toBe(0.01); });
  it('formatTokenReport', () => {
    const r = formatTokenReport('hello world', 0.01);
    expect(r.chars).toBe(11);
    expect(r.words).toBe(2);
    expect(r.tokens).toBeGreaterThan(0);
    expect(r.costUsd).toBeGreaterThan(0);
  });
});

describe('cost-model (coverage boost)', () => {
  it('getCostEntry retorna undefined para provider desconhecido', () => {
    expect(getCostEntry('unknown' as any, 'x')).toBeUndefined();
  });

  it('calculateCost', () => {
    const entry = getCostEntry('mock', 'mock-v1');
    expect(entry).toBeDefined();
    const cost = calculateCost(entry!, 1000, 200);
    expect(cost).toBe(0);
  });

  it('cheapestModel', () => {
    const c = cheapestModel('openai');
    expect(c.model).toBe('gpt-4o-mini');
  });
});

describe('latency-model (coverage boost)', () => {
  it('getLatency para provider desconhecido', () => {
    expect(getLatency('unknown' as any, 'x')).toBeUndefined();
  });

  it('estimateLatencyMs para provider desconhecido', () => {
    expect(estimateLatencyMs('unknown' as any, 'x', 100)).toBe(1000);
  });
});
