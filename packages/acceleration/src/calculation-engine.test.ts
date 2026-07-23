import { executeCalculation, calculateCached, clearCalcCache, markCalcDirty, getCalcCacheStats } from './calculation-engine';
import { CalculationRequest } from './calculation-engine';

describe('calculation-engine — incremental cache integration', () => {
  beforeEach(() => {
    clearCalcCache();
  });

  const mathReq: CalculationRequest = { type: 'math', input: '2 + 3 * 4' };

  it('should produce same result as executeCalculation on first call (cache miss)', () => {
    const expected = executeCalculation(mathReq);
    const cached = calculateCached(mathReq);
    expect(cached.success).toEqual(expected.success);
    expect(cached.result).toEqual(expected.result);
    expect(cached.method).toEqual(expected.method);
  });

  it('should return cached result on repeated call (cache hit)', () => {
    const first = calculateCached(mathReq);
    const statsAfterMiss = getCalcCacheStats();
    expect(statsAfterMiss.misses).toBe(1);
    expect(statsAfterMiss.hits).toBe(0);

    const second = calculateCached(mathReq);
    const statsAfterHit = getCalcCacheStats();
    expect(second).toEqual(first);
    expect(statsAfterHit.misses).toBe(1);
    expect(statsAfterHit.hits).toBe(1);
  });

  it('should treat different inputs as separate cache entries', () => {
    const reqA: CalculationRequest = { type: 'math', input: '10 + 20' };
    const reqB: CalculationRequest = { type: 'math', input: '100 + 200' };

    calculateCached(reqA);
    calculateCached(reqB);

    const stats = getCalcCacheStats();
    expect(stats.entries).toBe(2);
    expect(stats.misses).toBe(2);
  });

  it('should miss cache when params differ', () => {
    const reqA: CalculationRequest = { type: 'statistics', input: 'mean of data', params: [1, 2, 3] };
    const reqB: CalculationRequest = { type: 'statistics', input: 'mean of data', params: [4, 5, 6] };

    calculateCached(reqA);
    calculateCached(reqB);

    const stats = getCalcCacheStats();
    expect(stats.misses).toBe(2);
  });

  it('clearCalcCache should reset all stats', () => {
    calculateCached(mathReq);
    clearCalcCache();
    const stats = getCalcCacheStats();
    expect(stats.entries).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('markCalcDirty should force a recompute on next call', () => {
    const first = calculateCached(mathReq);
    expect(getCalcCacheStats().hits).toBe(0);

    markCalcDirty();
    const second = calculateCached(mathReq);
    expect(second).toEqual(first);
    expect(getCalcCacheStats().misses).toBe(2);
  });

  it('should handle physics calculations with caching', () => {
    const forceReq: CalculationRequest = { type: 'physics', input: 'force f=ma', params: [10, 2] };

    const r1 = calculateCached(forceReq);
    expect(r1.success).toBe(true);
    expect(r1.result).toBe(20);

    const r2 = calculateCached(forceReq);
    expect(r2).toEqual(r1);
    expect(getCalcCacheStats().hits).toBe(1);
  });

  it('should handle formula calculations with caching', () => {
    const formulaReq: CalculationRequest = { type: 'formula', input: 'bmi', formulaName: 'bmi', params: [70, 1.75] };

    const res = calculateCached(formulaReq);
    expect(res.success).toBe(true);
    expect((res.result as number) ?? 0).toBeGreaterThan(0);
  });
});
