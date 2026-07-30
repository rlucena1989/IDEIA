import { ConfidenceScorer } from '../src/scorer';
import { ClassificationResult, ConsensusResult, ConfidenceScoreSchema } from '../src/types';

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;

  beforeEach(() => {
    scorer = new ConfidenceScorer();
  });

  describe('score', () => {
    it('should return zero score with no factors', async () => {
      const result = await scorer.score({});
      
      expect(result.overall).toBe(0);
      expect(result.level).toBe('unknown');
      expect(result.factors).toEqual([]);
    });

    it('should score with custom factors', async () => {
      const result = await scorer.score({
        factors: [
          { name: 'test', weight: 0.5, score: 0.8 },
        ],
      });
      
      expect(result.overall).toBe(0.8);
      expect(result.level).toBe('high');
      expect(result.factors).toHaveLength(1);
    });

    it('should score with input text', async () => {
      const result = await scorer.score({
        input: 'Build a React REST API',
      });
      
      expect(result.overall).toBeGreaterThan(0);
      expect(result.factors).toContainEqual(
        expect.objectContaining({ name: 'classification' })
      );
    });

    it('should score with provided classification', async () => {
      const classification: ClassificationResult = {
        domain: ['web-development'],
        complexity: 'moderate',
        confidence: 0.8,
        keywords: ['react', 'rest', 'api'],
      };
      
      const result = await scorer.score({
        classification,
      });
      
      expect(result.overall).toBe(0.8);
      expect(result.level).toBe('high');
    });

    it('should score with consensus', async () => {
      const consensus: ConsensusResult = {
        consensus: 'yes',
        confidence: 0.9,
        agreement: 0.8,
        votes: [],
      };
      
      const result = await scorer.score({
        consensus,
      });
      
      expect(result.overall).toBeGreaterThan(0);
      expect(result.factors).toContainEqual(
        expect.objectContaining({ name: 'consensus' })
      );
    });

    it('should combine multiple factors', async () => {
      const classification: ClassificationResult = {
        domain: ['web-development'],
        complexity: 'moderate',
        confidence: 0.6,
        keywords: ['react'],
      };
      
      const consensus: ConsensusResult = {
        consensus: 'yes',
        confidence: 0.8,
        agreement: 0.9,
        votes: [],
      };
      
      const result = await scorer.score({
        classification,
        consensus,
        factors: [{ name: 'custom', weight: 0.3, score: 0.7 }],
      });
      
      expect(result.overall).toBeGreaterThan(0);
      expect(result.factors).toHaveLength(3);
    });

    it('should calculate weighted average correctly', async () => {
      const result = await scorer.score({
        factors: [
          { name: 'factor1', weight: 0.5, score: 0.8 },
          { name: 'factor2', weight: 0.5, score: 0.6 },
        ],
      });
      
      expect(result.overall).toBe(0.7);
    });

    it('should determine high confidence level', async () => {
      const result = await scorer.score({
        factors: [{ name: 'test', weight: 1, score: 0.8 }],
      });
      
      expect(result.level).toBe('high');
    });

    it('should determine medium confidence level', async () => {
      const result = await scorer.score({
        factors: [{ name: 'test', weight: 1, score: 0.5 }],
      });
      
      expect(result.level).toBe('medium');
    });

    it('should determine low confidence level', async () => {
      const result = await scorer.score({
        factors: [{ name: 'test', weight: 1, score: 0.2 }],
      });
      
      expect(result.level).toBe('low');
    });

    it('should determine unknown confidence level', async () => {
      const result = await scorer.score({
        factors: [{ name: 'test', weight: 1, score: 0.05 }],
      });
      
      expect(result.level).toBe('unknown');
    });

    it('should validate score schema', async () => {
      const result = await scorer.score({
        factors: [{ name: 'test', weight: 0.5, score: 0.8 }],
      });
      
      const parsed = ConfidenceScoreSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('classify', () => {
    it('should delegate to classifier', () => {
      const result = scorer.classify('React component');
      
      expect(result.domain).toContain('web-development');
    });
  });

  describe('consensus', () => {
    it('should delegate to consensus engine', async () => {
      const result = await scorer.consensus('test prompt', []);
      
      expect(result).toHaveProperty('consensus');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('agreement');
    });
  });
});
