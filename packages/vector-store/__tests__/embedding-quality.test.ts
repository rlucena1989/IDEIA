import { EmbeddingQualityEvaluator, QualityReport } from '../src/embedding-quality';

function makeEmbedding(dimensions: number, base = 0, noise = 0.1): number[] {
  return Array.from({ length: dimensions }, (_, i) => base + Math.sin(i) * noise);
}

describe('EmbeddingQualityEvaluator', () => {
  let evaluator: EmbeddingQualityEvaluator;

  beforeEach(() => {
    evaluator = new EmbeddingQualityEvaluator(10);
  });

  describe('evaluate', () => {
    it('should return a valid QualityReport for non-empty embeddings', () => {
      const embeddings = [makeEmbedding(4), makeEmbedding(4)];
      const report = evaluator.evaluate(embeddings);
      expect(report).toHaveProperty('dimensions');
      expect(report).toHaveProperty('meanVariance');
      expect(report).toHaveProperty('outlierCount');
      expect(report).toHaveProperty('score');
      expect(report).toHaveProperty('driftDetected');
    });

    it('should report correct dimensions', () => {
      const embeddings = [makeEmbedding(128), makeEmbedding(128)];
      const report = evaluator.evaluate(embeddings);
      expect(report.dimensions).toBe(128);
    });

    it('should handle empty embeddings gracefully', () => {
      const report = evaluator.evaluate([]);
      expect(report.dimensions).toBe(0);
      expect(report.score).toBe(100);
    });

    it('should detect outliers in dimension variance', () => {
      const embeddings: number[][] = [];
      for (let i = 0; i < 100; i++) {
        embeddings.push(Array.from({ length: 50 }, () => Math.random() * 0.01));
      }
      const outlier = Array.from({ length: 50 }, () => 0);
      outlier[0] = 100;
      outlier[1] = 100;
      outlier[2] = 100;
      embeddings.push(outlier);

      const report = evaluator.evaluate(embeddings);
      expect(report.outlierCount).toBeGreaterThan(0);
    });

    it('should produce a score between 0 and 100', () => {
      const embeddings = [makeEmbedding(8), makeEmbedding(8)];
      const report = evaluator.evaluate(embeddings);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });
  });

  describe('compare', () => {
    it('should detect drift when meanVariance changes significantly', () => {
      const previous: QualityReport = { dimensions: 4, meanVariance: 0.05, outlierCount: 0, score: 90, driftDetected: false };
      const current: QualityReport = { dimensions: 4, meanVariance: 0.3, outlierCount: 0, score: 80, driftDetected: false };
      expect(evaluator.compare(previous, current)).toBe(true);
    });

    it('should not detect drift when values are stable', () => {
      const previous: QualityReport = { dimensions: 4, meanVariance: 0.05, outlierCount: 0, score: 90, driftDetected: false };
      const current: QualityReport = { dimensions: 4, meanVariance: 0.06, outlierCount: 0, score: 89, driftDetected: false };
      expect(evaluator.compare(previous, current)).toBe(false);
    });

    it('should detect drift when outlier count changes substantially', () => {
      const previous: QualityReport = { dimensions: 4, meanVariance: 0.05, outlierCount: 0, score: 90, driftDetected: false };
      const current: QualityReport = { dimensions: 4, meanVariance: 0.05, outlierCount: 5, score: 90, driftDetected: false };
      expect(evaluator.compare(previous, current)).toBe(true);
    });

    it('should detect drift when score drops significantly', () => {
      const previous: QualityReport = { dimensions: 4, meanVariance: 0.05, outlierCount: 0, score: 85, driftDetected: false };
      const current: QualityReport = { dimensions: 4, meanVariance: 0.05, outlierCount: 0, score: 60, driftDetected: false };
      expect(evaluator.compare(previous, current)).toBe(true);
    });
  });

  describe('getScore', () => {
    it('should return the score from the latest evaluation', () => {
      const embeddings = [makeEmbedding(4), makeEmbedding(4)];
      const report = evaluator.evaluate(embeddings);
      expect(evaluator.getScore()).toBe(report.score);
    });

    it('should return 100 if no evaluations have been made', () => {
      const fresh = new EmbeddingQualityEvaluator();
      expect(fresh.getScore()).toBe(100);
    });
  });

  describe('drift detection in evaluate()', () => {
    it('should set driftDetected to true when quality changes', () => {
      const embeddings1 = [makeEmbedding(4, 0, 0.01), makeEmbedding(4, 0, 0.01)];
      evaluator.evaluate(embeddings1);

      const embeddings2 = [Array.from({ length: 4 }, () => 100), Array.from({ length: 4 }, () => -100)];
      const report = evaluator.evaluate(embeddings2);
      expect(report.driftDetected).toBe(true);
    });

    it('should set driftDetected to false on first evaluation', () => {
      const embeddings = [makeEmbedding(4)];
      const report = evaluator.evaluate(embeddings);
      expect(report.driftDetected).toBe(false);
    });
  });

  describe('getHistory', () => {
    it('should return all historical reports', () => {
      evaluator.evaluate([makeEmbedding(4)]);
      evaluator.evaluate([makeEmbedding(4)]);
      expect(evaluator.getHistory()).toHaveLength(2);
    });

    it('should limit history to maxHistory', () => {
      const small = new EmbeddingQualityEvaluator(3);
      for (let i = 0; i < 5; i++) {
        small.evaluate([makeEmbedding(4, i)]);
      }
      expect(small.getHistory()).toHaveLength(3);
    });
  });
});
