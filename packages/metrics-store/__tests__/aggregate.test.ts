import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AggregateEngine } from '../src/aggregate';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

type AggregationType = 'avg' | 'max' | 'min' | 'sum' | 'p95' | 'count';

interface AggregateResult {
  name: string; from: number; to: number;
  aggregation: AggregationType; value: number; count: number;
}

function createMockBackend() {
  return {
    record: jest.fn(),
    query: jest.fn(),
    queryMetrics: jest.fn(),
    prune: jest.fn(),
    listCategories: jest.fn(),
    getTotalMetrics: jest.fn(),
  };
}

describe('AggregateEngine', () => {
  let engine: AggregateEngine;
  let mockBackend: ReturnType<typeof createMockBackend>;

  beforeEach(() => {
    engine = new AggregateEngine();
    mockBackend = createMockBackend();
  });

  it('aggregates values with avg', () => {
    expect(engine.aggregateValues([1, 2, 3, 4, 5], 'avg' as AggregationType)).toBe(3);
  });

  it('aggregates values with max', () => {
    expect(engine.aggregateValues([1, 2, 3, 4, 5], 'max' as AggregationType)).toBe(5);
  });

  it('aggregates values with min', () => {
    expect(engine.aggregateValues([1, 2, 3, 4, 5], 'min' as AggregationType)).toBe(1);
  });

  it('aggregates values with p95', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(engine.aggregateValues(values, 'p95' as AggregationType)).toBeGreaterThanOrEqual(95);
  });

  it('throws on unknown aggregation type', () => {
    expect(() => engine.aggregateValues([1, 2, 3], 'unknown' as AggregationType)).toThrow();
  });

  it('queryMetrics delegates to backend when range is valid', async () => {
    const expected: AggregateResult = { name: 'test', from: 0, to: 1000, aggregation: 'avg' as AggregationType, value: 50, count: 10 };
    mockBackend.queryMetrics.mockResolvedValue(expected);
    const result = await engine.queryMetrics(mockBackend, 'test', 0, 1000, 'avg' as AggregationType);
    expect(result).toEqual(expected);
  });

  it('returns zero when range is invalid (from >= to)', async () => {
    const result = await engine.queryMetrics(mockBackend, 'test', 100, 50, 'avg' as AggregationType);
    expect(result.value).toBe(0);
    expect(result.count).toBe(0);
    expect(mockBackend.queryMetrics).not.toHaveBeenCalled();
  });

  it('queryMultiple runs multiple queries', async () => {
    mockBackend.queryMetrics.mockResolvedValue({ name: 'q', from: 0, to: 100, aggregation: 'avg', value: 10, count: 1 });
    const results = await engine.queryMultiple(mockBackend, [
      { name: 'cpu', from: 0, to: 100, aggregation: 'avg' as AggregationType },
      { name: 'mem', from: 0, to: 100, aggregation: 'max' as AggregationType },
    ]);
    expect(results.length).toBe(2);
    expect(mockBackend.queryMetrics).toHaveBeenCalledTimes(2);
  });
});
