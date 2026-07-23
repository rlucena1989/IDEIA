import { classifyComplexity } from '../acceleration/classifier';
import { estimateBudget } from '../acceleration/budget';
import { readHardwareProfile } from '../acceleration/hardware-profile';
import { executeCalculation, isLocallySolvable } from '../acceleration/calculation-engine';
import { validateInput, validateOutput } from '../acceleration/guardrails';
import { compressSmart, compressToTarget } from '../acceleration/context-compressor';
import { logAudit, getAuditLog, clearAuditLog } from '../acceleration/audit-log';
import { mergeResults } from '../acceleration/result-merger';
import { estimateTokens, estimateTimeMs, estimateCostUsd } from '../acceleration/estimator';
import { suggestOptimizations, optimizeMode } from '../acceleration/optimizer';
import { shouldInvalidate } from '../acceleration/cache-invalidation';
import { evaluatePolicies, addPolicy, clearPolicies } from '../acceleration/policy-engine';
import { detectAnomalies, detectTrend } from '../acceleration/anomaly-detector';
import { tokenizeMath, evaluateSimpleMath, extractNumbers } from '../acceleration/math-parser';
import { evaluateFormula } from '../acceleration/formula-registry';
import { summary, median, correlation } from '../acceleration/stats-engine';
import { mean, stddev, variance, sum, clamp, lerp } from '../acceleration/numerical-engine';
import { force, kineticEnergy, potentialEnergy } from '../acceleration/physics-engine';
import { parseExpression, simplify } from '../acceleration/symbolic-engine';
import { isEnabled, enableFlag, disableFlag, listFlags } from '../acceleration/feature-flags';
import { reachConsensus, mockConsensus } from '../acceleration/consensus';
import { rankProviders, selectProvider } from '../acceleration/provider-router';

describe('classifier', () => {
  it('classifica trivial para texto curto', () => {
    const r = classifyComplexity('hello');
    expect(r.complexity).toBe('trivial');
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('classifica simple para texto medio', () => {
    const r = classifyComplexity('add two numbers and return the result');
    expect(['trivial', 'simple']).toContain(r.complexity);
  });

  it('detecta dominio statistics', () => {
    const r = classifyComplexity('calculate mean and stddev of dataset');
    expect(r.domain).toContain('statistics');
  });

  it('detecta dominio physics', () => {
    const r = classifyComplexity('calculate force from mass and acceleration');
    expect(r.domain).toContain('physics');
  });
});

describe('budget', () => {
  it('estima budget basico', () => {
    const b = estimateBudget(3, 1000);
    expect(b.tokensMax).toBeGreaterThan(1000);
    expect(b.costMaxUsd).toBeGreaterThan(0);
    expect(b.latencyMaxMs).toBeGreaterThan(0);
  });
});

describe('hardware-profile', () => {
  it('le perfil de hardware', () => {
    const hw = readHardwareProfile();
    expect(hw.cpuCores).toBeGreaterThan(0);
    expect(hw.ramTotalGb).toBeGreaterThan(0);
    expect(hw.platform).toBeTruthy();
  });
});

describe('calculation-engine', () => {
  it('resolve expressao matematica simples', () => {
    const r = executeCalculation({ type: 'math', input: '2 + 3 * 4' });
    expect(r.success).toBe(true);
    expect(r.result).toBe(14);
  });

  it('detecta problemas localmente resolveveis', () => {
    expect(isLocallySolvable('sum of numbers')).toBe(true);
    expect(isLocallySolvable('what is the meaning of life?')).toBe(false);
  });
});

describe('guardrails', () => {
  it('aprova entrada normal', () => {
    const r = validateInput('hello world');
    expect(r.approved).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('rejeita entrada com secret key', () => {
    const r = validateInput('my key is sk-test-placeholder');
    expect(r.approved).toBe(false);
  });

  it('rejeita SQL injection', () => {
    const r = validateInput('DROP TABLE users');
    expect(r.approved).toBe(false);
  });
});

describe('context-compressor', () => {
  it('comprime string longa', () => {
    const r = compressSmart('a'.repeat(500) + '  ' + 'b'.repeat(500));
    expect(r.compressed.length).toBeLessThan(r.originalChars);
    expect(r.ratio).toBeLessThan(1);
  });

  it('comprime para target tokens', () => {
    const r = compressToTarget('hello '.repeat(500), 10);
    expect(r.compressed.length).toBeLessThan(2500);
  });
});

describe('audit-log', () => {
  beforeEach(() => clearAuditLog());

  it('registra e le entradas', () => {
    logAudit({ action: 'test', provider: 'mock', tokens: 100, costUsd: 0.01, latencyMs: 50, success: true, details: 'test' });
    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('test');
  });
});

describe('result-merger', () => {
  it('faz merge de numeros com media', () => {
    const r = mergeResults([1, 2, 3]);
    expect(r).toBe(2);
  });

  it('faz merge de arrays com flatten', () => {
    const r = mergeResults([[1, 2], [3, 4]]);
    expect(r).toEqual([1, 2, 3, 4]);
  });
});

describe('estimator', () => {
  it('estima tokens', () => {
    const t = estimateTokens('hello world');
    expect(t).toBeGreaterThan(0);
  });

  it('estima tempo', () => {
    const t = estimateTimeMs(100, 'moderate', 'balanced');
    expect(t).toBeGreaterThan(0);
  });
});

describe('optimizer', () => {
  it('otimiza modo baseado em historico', () => {
    const mode = optimizeMode({ avgQuality: 95, avgDuration: 100, successRate: 0.98 });
    expect(mode).toBe('fast');
  });
});

describe('cache-invalidation', () => {
  it('shouldInvalidate por TTL', () => {
    const entry = { key: 'test', value: 'x', createdAt: new Date(Date.now() - 100000).toISOString(), ttlMs: 5000 };
    const r = shouldInvalidate(entry, { strategy: 'ttl', maxAgeMs: 10000 });
    expect(r).toBe(true);
  });

  it('nao invalida dentro do TTL', () => {
    const entry = { key: 'test', value: 'x', createdAt: new Date().toISOString(), ttlMs: 60000 };
    const r = shouldInvalidate(entry, { strategy: 'ttl', maxAgeMs: 100000 });
    expect(r).toBe(false);
  });
});

describe('policy-engine', () => {
  beforeEach(() => clearPolicies());

  it('permite por padrao', () => {
    const r = evaluatePolicies('fast', 'local', 'mock', {});
    expect(r.allowed).toBe(true);
  });

  it('bloqueia quando policy impede', () => {
    addPolicy({ id: 'test', description: 'deny mock', appliesTo: { providers: ['mock'] }, action: 'deny' });
    const r = evaluatePolicies('fast', 'local', 'mock', {});
    expect(r.allowed).toBe(false);
    expect(r.denials).toHaveLength(1);
  });
});

describe('anomaly-detector', () => {
  it('detecta anomalias', () => {
    const r = detectAnomalies([1, 1, 1, 100, 1, 1], 1.5);
    const anomalies = r.filter(x => x.isAnomaly);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].severity).toBeTruthy();
  });

  it('detecta tendencia', () => {
    expect(detectTrend([1, 2, 3, 4, 5])).toBe('up');
    expect(detectTrend([5, 4, 3, 2, 1])).toBe('down');
    expect(detectTrend([3, 3, 3, 3])).toBe('stable');
  });
});

describe('math-parser', () => {
  it('tokeniza expressao', () => {
    const t = tokenizeMath('2 + 3');
    expect(t.length).toBeGreaterThanOrEqual(3);
  });

  it('avalia expressao simples', () => {
    expect(evaluateSimpleMath('3 * 4 + 2')).toBe(14);
  });

  it('extrai numeros do texto', () => {
    expect(extractNumbers('abc 123 def 45.6')).toEqual([123, 45.6]);
  });
});

describe('formula-registry', () => {
  it('avalia formula bmi', () => {
    expect(evaluateFormula('bmi', 70, 1.75)).toBeCloseTo(22.86, 1);
  });

  it('avalia formula circle_area', () => {
    expect(evaluateFormula('circle_area', 10)).toBeCloseTo(314.16, 1);
  });
});

describe('stats-engine', () => {
  it('calcula mediana', () => {
    expect(median([1, 2, 3, 4, 5])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('calcula correlacao', () => {
    const r = correlation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r).toBeCloseTo(1, 2);
  });

  it('summary values', () => {
    const s = summary([1, 2, 3, 4, 5]);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.mean).toBe(3);
    expect(s.count).toBe(5);
  });
});

describe('numerical-engine', () => {
  it('calcula media', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });
  it('calcula variancia', () => {
    expect(variance([1, 3])).toBe(1);
  });
  it('clamp', () => {
    expect(clamp(10, 0, 5)).toBe(5);
    expect(clamp(-1, 0, 5)).toBe(0);
  });
  it('lerp', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('physics-engine', () => {
  it('calcula forca', () => {
    expect(force(10, 9.8)).toBeCloseTo(98, 0);
  });
  it('calcula energia cinetica', () => {
    expect(kineticEnergy(2, 3)).toBe(9);
  });
});

describe('symbolic-engine', () => {
  it('simplifica expressao numerica', () => {
    const expr = parseExpression('3 + 5');
    expect(JSON.stringify(expr)).toBeTruthy();
  });
});

describe('feature-flags', () => {
  it('verifica flag padrao', () => {
    expect(isEnabled('co-pilot.enabled')).toBe(true);
  });
  it('desabilita e reabilita', () => {
    disableFlag('co-pilot.enabled');
    expect(isEnabled('co-pilot.enabled')).toBe(false);
    enableFlag('co-pilot.enabled');
    expect(isEnabled('co-pilot.enabled')).toBe(true);
  });
});

describe('consensus', () => {
  it('executa consenso mock', async () => {
    const r = await mockConsensus('should I use TypeScript?');
    expect(r.participants).toBeGreaterThanOrEqual(1);
    expect(r.decision).toBeTruthy();
  });
});

describe('provider-router', () => {
  it('seleciona provider baseado em perfil', () => {
    const hw = readHardwareProfile();
    const ranked = rankProviders('moderate', { tokensMax: 4000, costMaxUsd: 0.05, latencyMaxMs: 5000, depthMax: 3 }, hw, 0.8);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].score).toBeGreaterThan(0);
  });
});
