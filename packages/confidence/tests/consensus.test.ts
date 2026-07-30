import { ConsensusEngine, createConsensusEngine } from '../src/consensus';
import { ConsensusResultSchema } from '../src/types';

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine();
  });

  describe('reachConsensus', () => {
    it('should reach consensus with unanimous votes', async () => {
      const mockProviders = [
        {
          name: 'provider1',
          vote: async () => ({ decision: 'yes', confidence: 0.9 }),
        },
        {
          name: 'provider2',
          vote: async () => ({ decision: 'yes', confidence: 0.85 }),
        },
      ];

      const result = await engine.reachConsensus('test prompt', mockProviders);
      
      expect(result.consensus).toBe('yes');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.agreement).toBe(1);
      expect(result.votes).toHaveLength(2);
    });

    it('should reach consensus with majority votes', async () => {
      const mockProviders = [
        {
          name: 'provider1',
          vote: async () => ({ decision: 'yes', confidence: 0.9 }),
        },
        {
          name: 'provider2',
          vote: async () => ({ decision: 'yes', confidence: 0.8 }),
        },
        {
          name: 'provider3',
          vote: async () => ({ decision: 'no', confidence: 0.7 }),
        },
      ];

      const result = await engine.reachConsensus('test prompt', mockProviders);
      
      expect(result.consensus).toBe('yes');
      expect(result.agreement).toBeGreaterThan(0.5);
      expect(result.votes).toHaveLength(3);
    });

    it('should handle no providers', async () => {
      const result = await engine.reachConsensus('test prompt', []);
      
      expect(result.consensus).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.agreement).toBe(0);
      expect(result.votes).toHaveLength(0);
    });

    it('should handle single provider', async () => {
      const mockProviders = [
        {
          name: 'provider1',
          vote: async () => ({ decision: 'yes', confidence: 0.9 }),
        },
      ];

      const result = await engine.reachConsensus('test prompt', mockProviders);
      
      expect(result.consensus).toBe('yes');
      expect(result.confidence).toBe(0.9);
      expect(result.agreement).toBe(1);
    });

    it('should validate result schema', async () => {
      const mockProviders = [
        {
          name: 'provider1',
          vote: async () => ({ decision: 'yes', confidence: 0.9 }),
        },
      ];

      const result = await engine.reachConsensus('test prompt', mockProviders);
      const parsed = ConsensusResultSchema.safeParse(result);
      
      expect(parsed.success).toBe(true);
    });
  });

  describe('createConsensusEngine', () => {
    it('should create a new engine instance', () => {
      const engine = createConsensusEngine();
      
      expect(engine).toBeInstanceOf(ConsensusEngine);
    });
  });
});
