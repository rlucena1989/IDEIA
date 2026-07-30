import { describe, it, expect, beforeEach } from '@jest/globals';
import { BenchmarkEngine } from '../src/benchmark-engine';
import { BenchmarkSuite, IndexConfig, VectorPoint, SearchQuery } from '../src/types';

describe('BenchmarkEngine', () => {
  let engine: BenchmarkEngine;
  let mockSuite: BenchmarkSuite;
  let mockData: VectorPoint[];
  let mockQueries: SearchQuery[];

  beforeEach(() => {
    engine = new BenchmarkEngine();
    
    mockData = [
      { id: '1', vector: [1, 2, 3] },
      { id: '2', vector: [4, 5, 6] },
      { id: '3', vector: [7, 8, 9] },
    ];
    
    mockQueries = [
      { id: 'q1', vector: [1, 2, 3], k: 5 },
      { id: 'q2', vector: [4, 5, 6], k: 5 },
    ];
    
    mockSuite = {
      name: 'test-suite',
      configs: [
        {
          type: 'hnsw',
          dimensions: 3,
          params: { M: 16, efConstruction: 200 },
        },
      ],
      data: mockData,
      queries: mockQueries,
    };
  });

  describe('constructor', () => {
    it('should create engine instance', () => {
      expect(engine).toBeInstanceOf(BenchmarkEngine);
    });
  });

  describe('run', () => {
    it('should run benchmark suite', () => {
      const results = engine.run(mockSuite);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
    });

    it('should return results for each config', () => {
      mockSuite.configs = [
        { type: 'hnsw', dimensions: 3, params: {} },
        { type: 'ivfflat', dimensions: 3, params: {} },
      ];
      const results = engine.run(mockSuite);
      expect(results).toHaveLength(2);
    });

    it('should handle empty configs', () => {
      mockSuite.configs = [];
      const results = engine.run(mockSuite);
      expect(results).toEqual([]);
    });
  });

  describe('runSingle', () => {
    it('should return benchmark result with metrics', () => {
      const config: IndexConfig = {
        type: 'hnsw',
        dimensions: 3,
        params: {},
      };
      const result = (engine as any).runSingle(config, mockData, mockQueries);
      expect(result).toBeDefined();
      expect(result.indexType).toBe('hnsw');
      expect(typeof result.buildTimeMs).toBe('number');
      expect(typeof result.throughput).toBe('number');
      expect(typeof result.memoryMB).toBe('number');
    });

    it('should calculate latency percentiles', () => {
      const config: IndexConfig = {
        type: 'hnsw',
        dimensions: 3,
        params: {},
      };
      const result = (engine as any).runSingle(config, mockData, mockQueries);
      expect(result.latencyP50).toBeDefined();
      expect(result.latencyP99).toBeDefined();
    });

    it('should calculate recall', () => {
      const config: IndexConfig = {
        type: 'hnsw',
        dimensions: 3,
        params: {},
      };
      const result = (engine as any).runSingle(config, mockData, mockQueries);
      expect(typeof result.recall).toBe('number');
    });
  });

  describe('buildIndex', () => {
    it('should build index from data', () => {
      const config: IndexConfig = {
        type: 'hnsw',
        dimensions: 3,
        params: {},
      };
      const index = (engine as any).buildIndex(config, mockData);
      expect(Array.isArray(index)).toBe(true);
      expect(index).toHaveLength(3);
    });
  });

  describe('search', () => {
    it('should search index with query', () => {
      const config: IndexConfig = {
        type: 'hnsw',
        dimensions: 3,
        params: {},
      };
      const index = (engine as any).buildIndex(config, mockData);
      const query = mockQueries[0];
      const results = (engine as any).search(index, query);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
