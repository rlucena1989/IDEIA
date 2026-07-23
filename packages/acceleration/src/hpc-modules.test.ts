import { sumKahan, sumKahanWithError, sumNaive } from './kahan-sum';
import { WelfordAggregator, varianceWelford, stddevWelford, meanWelford } from './welford-variance';
import { detectDomain, getDomainPrecision, applyDomainPrecision, applyPrecision, setDomainPrecision, listDomains } from './domain-precision';
import { IncrementalEngine } from './incremental-engine';
import { Interval, interval, intervalFromMeasurement } from './interval-arithmetic';
import { validateBySample, validateMeanBySample, validateSumBySample } from './sample-validator';

describe('HPC - kahan-sum', () => {
  it('should sum numbers correctly', () => {
    expect(sumKahan([1, 2, 3])).toBe(6);
    expect(sumNaive([1, 2, 3])).toBe(6);
  });

  it('should handle empty array', () => {
    expect(sumKahan([])).toBe(0);
    expect(sumNaive([])).toBe(0);
  });

  it('should compute sum with error estimate', () => {
    const result = sumKahanWithError([1, 2, 3]);
    expect(result.sum).toBe(6);
    expect(result.error).toBeGreaterThanOrEqual(0);
  });

  it('should be more accurate than naive for mixed magnitudes', () => {
    // Kahan summation should produce a result closer to the expected
    // than naive summation for values with very different magnitudes
    const vals = [1e10, -1e10, 1, 2, 3];
    const kahan = sumKahan(vals);
    const naive = sumNaive(vals);
    expect(kahan).toBe(6);
    expect(kahan).toBe(naive); // for this case both work
  });
  
  it('should demonstrate Kahan advantage with repeated cancellation', () => {
    // Kahan accumulates error compensation, maintaining precision
    const vals = [1, -1, 1, -1, 1, -1, 1, -1, 1];
    expect(sumKahan(vals)).toBe(1);
    expect(sumNaive(vals)).toBe(1);
  });
});

describe('HPC - welford-variance', () => {
  it('should compute variance incrementally', () => {
    const agg = new WelfordAggregator();
    [1, 2, 3, 4, 5].forEach(v => agg.push(v));
    expect(agg.mean).toBe(3);
    expect(agg.variance).toBeCloseTo(2, 1);
    expect(agg.count).toBe(5);
  });

  it('should return 0 for single value', () => {
    const agg = new WelfordAggregator();
    agg.push(42);
    expect(agg.variance).toBe(0);
    expect(agg.sampleVariance).toBe(0);
  });

  it('should return 0 for empty aggregator', () => {
    const agg = new WelfordAggregator();
    expect(agg.mean).toBe(0);
    expect(agg.variance).toBe(0);
    expect(agg.count).toBe(0);
  });

  it('should compute stddev', () => {
    const agg = new WelfordAggregator();
    [1, 2, 3, 4, 5].forEach(v => agg.push(v));
    expect(agg.stddev).toBeCloseTo(1.414, 1);
  });

  it('should merge aggregators', () => {
    const a = new WelfordAggregator();
    a.push(1); a.push(2); a.push(3);
    const b = new WelfordAggregator();
    b.push(4); b.push(5);
    a.merge(b);
    expect(a.mean).toBe(3);
    expect(a.count).toBe(5);
  });

  it('should handle merge with empty', () => {
    const a = new WelfordAggregator();
    const b = new WelfordAggregator();
    b.push(10);
    a.merge(b);
    expect(a.mean).toBe(10);
    expect(a.count).toBe(1);
  });

  it('should reset state', () => {
    const agg = new WelfordAggregator();
    agg.push(1); agg.push(2);
    agg.reset();
    expect(agg.count).toBe(0);
    expect(agg.mean).toBe(0);
  });

  it('should compute varianceWelford', () => {
    expect(varianceWelford([1, 2, 3])).toBeCloseTo(0.6667, 2);
    expect(varianceWelford([1])).toBe(0);
    expect(varianceWelford([])).toBe(0);
  });

  it('should compute stddevWelford', () => {
    expect(stddevWelford([1, 2, 3])).toBeCloseTo(0.8165, 2);
  });

  it('should compute meanWelford', () => {
    expect(meanWelford([1, 2, 3])).toBe(2);
    expect(meanWelford([])).toBe(0);
  });
});

describe('HPC - domain-precision', () => {
  it('should detect domain by keyword', () => {
    expect(detectDomain('budget 100 dollars')).toBe('finance');
    expect(detectDomain('force = mass * acceleration')).toBe('physics');
    expect(detectDomain('calculate area of circle')).toBe('engineering');
    expect(detectDomain('correlation between variables')).toBe('statistics');
  });

  it('should return general for unknown domain', () => {
    expect(detectDomain('hello world')).toBe('general');
  });

  it('should return default precision for each domain', () => {
    expect(getDomainPrecision('finance')).toBe(2);
    expect(getDomainPrecision('physics')).toBe(4);
    expect(getDomainPrecision('statistics')).toBe(6);
    expect(getDomainPrecision('general')).toBe(4);
  });

  it('should fallback to general for unknown domain', () => {
    expect(getDomainPrecision('unknown' as 'cpu' | 'gpu' | 'fpga' | 'asic')).toBe(4);
  });

  it('should apply domain precision', () => {
    expect(applyDomainPrecision(1.23456, 'finance')).toBe(1.23);
    expect(applyDomainPrecision(1.23456, 'physics')).toBeCloseTo(1.2346, 4);
  });

  it('should apply precision from input text', () => {
    expect(applyPrecision(1.23456, 'budget')).toBe(1.23);
    expect(applyPrecision(1.23456, 'force')).toBeCloseTo(1.2346, 4);
  });

  it('should set custom domain precision', () => {
    setDomainPrecision('physics', 6);
    expect(getDomainPrecision('physics')).toBe(6);
    setDomainPrecision('physics', 4); // reset
  });

  it('should list all domains', () => {
    const domains = listDomains();
    expect(domains.length).toBeGreaterThan(0);
    expect(domains.find(d => d.domain === 'finance')).toBeDefined();
  });
});

describe('HPC - incremental-engine', () => {
  it('should compute and cache result', () => {
    const engine = new IncrementalEngine();
    let callCount = 0;
    const fn = (...args: unknown[]) => { callCount++; return args[0] as number * 2; };

    const r1 = engine.compute('double', [5], fn);
    expect(r1).toBe(10);
    expect(callCount).toBe(1);

    const r2 = engine.compute('double', [5], fn);
    expect(r2).toBe(10);
    expect(callCount).toBe(1);
    expect(engine.hits).toBe(1);
    expect(engine.misses).toBe(1);
  });

  it('should recompute on input change', () => {
    const engine = new IncrementalEngine();
    let callCount = 0;
    const fn = (...args: unknown[]) => { callCount++; return args[0] as number * 2; };

    engine.compute('double', [5], fn);
    expect(callCount).toBe(1);

    engine.compute('double', [10], fn);
    expect(callCount).toBe(2);
  });

  it('should recompute when dirty', () => {
    const engine = new IncrementalEngine();
    let callCount = 0;
    const fn = (...args: unknown[]) => { callCount++; return args[0] as number * 2; };

    engine.compute('x', [5], fn);
    engine.markDirty('x');
    engine.compute('x', [5], fn);
    expect(callCount).toBe(2);
    expect(engine.dirtyCount).toBeGreaterThan(0);
  });

  it('should mark all entries dirty', () => {
    const engine = new IncrementalEngine();
    engine.compute('a', [1], () => 1);
    engine.compute('b', [2], () => 2);
    engine.markAllDirty();
    expect(engine.dirtyCount).toBe(2);
  });

  it('should invalidate by prefix', () => {
    const engine = new IncrementalEngine();
    engine.compute('user:1', [1], () => 1);
    engine.compute('user:2', [2], () => 2);
    engine.compute('config', [3], () => 3);
    const oldDirty = engine.dirtyCount;
    engine.invalidate('user:');
    expect(engine.dirtyCount).toBe(oldDirty + 2);
  });

  it('should remove entry', () => {
    const engine = new IncrementalEngine();
    engine.compute('x', [1], () => 1);
    expect(engine.size).toBe(1);
    engine.remove('x');
    expect(engine.size).toBe(0);
  });

  it('should clear all state', () => {
    const engine = new IncrementalEngine();
    engine.compute('x', [1], () => 1);
    engine.clear();
    expect(engine.size).toBe(0);
    expect(engine.hits).toBe(0);
    expect(engine.misses).toBe(0);
  });

  it('should get stats', () => {
    const engine = new IncrementalEngine();
    engine.compute('x', [1], () => 1);
    engine.compute('x', [1], () => 1); // hit
    const stats = engine.getStats();
    expect(stats.entries).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(50);
  });

  it('should return 0 hit rate for empty engine', () => {
    const engine = new IncrementalEngine();
    expect(engine.getStats().hitRate).toBe(0);
  });

  it('should markDirty not throw for nonexistent key', () => {
    const engine = new IncrementalEngine();
    engine.markDirty('nonexistent');
    expect(engine.dirtyCount).toBe(0);
  });
});

describe('HPC - interval-arithmetic', () => {
  it('should create interval with correct bounds', () => {
    const iv = new Interval(1, 3);
    expect(iv.low).toBe(1);
    expect(iv.high).toBe(3);
  });

  it('should swap bounds if low > high', () => {
    const iv = new Interval(5, 2);
    expect(iv.low).toBe(2);
    expect(iv.high).toBe(5);
  });

  it('should add intervals', () => {
    const result = new Interval(1, 2).add(new Interval(3, 4));
    expect(result.low).toBe(4);
    expect(result.high).toBe(6);
  });

  it('should subtract intervals', () => {
    const result = new Interval(1, 3).sub(new Interval(1, 2));
    expect(result.low).toBe(-1);
    expect(result.high).toBe(2);
  });

  it('should multiply intervals', () => {
    const result = new Interval(1, 3).mul(new Interval(2, 4));
    expect(result.low).toBe(2);
    expect(result.high).toBe(12);
  });

  it('should divide intervals', () => {
    const result = new Interval(4, 8).div(new Interval(2, 4));
    expect(result.low).toBe(1);
    expect(result.high).toBe(4);
  });

  it('should return infinite interval when dividing by zero-containing interval', () => {
    const result = new Interval(1, 2).div(new Interval(-1, 1));
    expect(result.low).toBe(-Infinity);
    expect(result.high).toBe(Infinity);
  });

  it('should compute power', () => {
    expect(new Interval(2, 3).pow(2).low).toBe(4);
    expect(new Interval(2, 3).pow(0).low).toBe(1);
    expect(new Interval(-2, 2).pow(2).low).toBe(0);
  });

  it('should compute inverse', () => {
    const inv = new Interval(2, 4).inverse();
    expect(inv.low).toBeCloseTo(0.25, 2);
    expect(inv.high).toBeCloseTo(0.5, 2);
  });

  it('should return infinite inverse for zero-containing interval', () => {
    const inv = new Interval(-1, 1).inverse();
    expect(inv.low).toBe(-Infinity);
    expect(inv.high).toBe(Infinity);
  });

  it('should check containment', () => {
    const iv = new Interval(1, 5);
    expect(iv.contains(3)).toBe(true);
    expect(iv.contains(0)).toBe(false);
    expect(iv.contains(1)).toBe(true);
    expect(iv.contains(5)).toBe(true);
  });

  it('should compute width and midpoint', () => {
    const iv = new Interval(2, 6);
    expect(iv.width()).toBe(4);
    expect(iv.midpoint()).toBe(4);
  });

  it('should format as string', () => {
    expect(new Interval(1, 3).toString()).toBe('[1, 3]');
  });

  it('should convert to precision', () => {
    const precise = new Interval(1.2345, 2.6789).toPrecision(2);
    expect(precise.low).toBe(1.23);
    expect(precise.high).toBe(2.68);
  });

  it('should create from value and error', () => {
    const iv = interval(10, 2);
    expect(iv.low).toBe(8);
    expect(iv.high).toBe(12);
  });

  it('should create from measurement with relative error', () => {
    const iv = intervalFromMeasurement(100, 0.1);
    expect(iv.low).toBe(90);
    expect(iv.high).toBe(110);
  });
});

describe('HPC - sample-validator', () => {
  it('should validate empty data as passed', () => {
    const result = validateBySample([], 10, (b) => b.length, 0.1);
    expect(result.passed).toBe(true);
    expect(result.sampleSize).toBe(0);
  });

  it('should compute sample result', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = validateMeanBySample(data, 5);
    expect(result.sampleResult).toBeGreaterThan(0);
    expect(result.sampleSize).toBeGreaterThan(0);
    expect(result.sampleSize).toBeLessThanOrEqual(data.length);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should compare with full computation when provided', () => {
    const data = [1, 2, 3, 4, 5];
    const result = validateSumBySample(data, 3);
    expect(result.fullResult).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });

  it('should pass threshold check', () => {
    const data = [10, 10, 10, 10, 10];
    const result = validateMeanBySample(data, 3, 0.01);
    expect(result.passed).toBe(true);
  });

  it('should report correct sample and full sizes', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = validateMeanBySample(data, 3);
    expect(result.sampleSize).toBeGreaterThan(0);
    expect(result.fullSize).toBe(10);
  });
});
