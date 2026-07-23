import * as fs from 'node:fs';
import { analyzePrecision } from './precision';

jest.mock('node:fs');

describe('precision', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('analyzePrecision', () => {
    it('should return default values when reports dir does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = analyzePrecision();
      expect(result.confidence).toBeCloseTo(0.8, 1);
      expect(result.variance).toBeCloseTo(0.15, 2);
      expect(result.stable).toBe(true);
    });

    it('should return default values when reports dir is empty', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([] as unknown as ReturnType<typeof mockFs.readdirSync>);
      const result = analyzePrecision();
      expect(result.confidence).toBeCloseTo(0.8, 1);
      expect(result.variance).toBeCloseTo(0.15, 2);
      expect(result.stable).toBe(true);
    });

    it('should return default values when reports dir is empty', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([] as unknown as ReturnType<typeof mockFs.readdirSync>);
      const result = analyzePrecision();
      expect(result.confidence).toBe(0.8);
      expect(result.variance).toBe(0.15);
    });

    it('should process reports and compute precision', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['report1.json', 'report2.json', 'report3.json'] as unknown as ReturnType<typeof mockFs.readdirSync>);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ quality: { score: 85 }, totalDurationMs: 1000 }))
        .mockReturnValueOnce(JSON.stringify({ quality: { score: 90 }, totalDurationMs: 1500 }))
        .mockReturnValueOnce(JSON.stringify({ quality: { score: 95 }, totalDurationMs: 2000 }));

      const result = analyzePrecision();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.variance).toBeGreaterThan(0);
      expect(typeof result.stable).toBe('boolean');
    });

    it('should handle invalid JSON gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['invalid.json', 'valid.json'] as unknown as ReturnType<typeof mockFs.readdirSync>);
      mockFs.readFileSync
        .mockReturnValueOnce('invalid json')
        .mockReturnValueOnce(JSON.stringify({ quality: { score: 80 }, totalDurationMs: 1000 }));

      const result = analyzePrecision();
      expect(result).toBeDefined();
    });

    it('should handle missing quality score', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['report.json'] as unknown as ReturnType<typeof mockFs.readdirSync>);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ totalDurationMs: 1000 }));

      const result = analyzePrecision();
      expect(result).toBeDefined();
    });

    it('should compute stable as true when confidence high and variance low', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['r1.json', 'r2.json'] as unknown as ReturnType<typeof mockFs.readdirSync>);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ quality: { score: 95 }, totalDurationMs: 100 }))
        .mockReturnValueOnce(JSON.stringify({ quality: { score: 96 }, totalDurationMs: 110 }));

      const result = analyzePrecision();
      expect(result.stable).toBe(true);
    });

    it('should return low defaults on unexpected error', () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = analyzePrecision();
      expect(result.confidence).toBeCloseTo(0.7, 1);
      expect(result.variance).toBeCloseTo(0.2, 2);
      expect(result.stable).toBe(false);
    });
  });
});