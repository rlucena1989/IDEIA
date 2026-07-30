import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextComposer } from '../src/composer';
import { ContextComposerConfig, TaskProfile, ContextSource } from '../src/types';

describe('ContextComposer', () => {
  let composer: ContextComposer;
  let config: Partial<ContextComposerConfig>;

  beforeEach(() => {
    config = {
      defaultTokenBudget: 10000,
      minConfidence: 0.5,
      maxItemsPerSource: 10,
      dedupSimilarityThreshold: 0.8,
      freshnessDecayHours: 24,
      enableProvenance: true,
      sourcePriorities: {},
      categoryWeights: {},
    };
    composer = new ContextComposer(config);
  });

  describe('constructor', () => {
    it('should create composer with default config', () => {
      const composer = new ContextComposer();
      expect(composer).toBeInstanceOf(ContextComposer);
    });

    it('should create composer with custom config', () => {
      const composer = new ContextComposer(config);
      expect(composer).toBeInstanceOf(ContextComposer);
    });
  });

  describe('compose', () => {
    it('should compose context from sources', async () => {
      const profile: TaskProfile = {
        taskType: 'feature',
        scope: 'single_file',
        complexity: 'low',
        risk: 'low',
        environment: 'dev',
      };
      const sources: ContextSource[] = [
        {
          name: 'test',
          priority: 1,
          maxItems: 10,
        },
      ];
      const result = await composer.compose(profile, sources);
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.totalTokens).toBeDefined();
    });

    it('should respect token budget', async () => {
      const profile: TaskProfile = {
        taskType: 'feature',
        scope: 'single_file',
        complexity: 'low',
        risk: 'low',
        environment: 'dev',
      };
      const sources: ContextSource[] = [
        {
          name: 'test',
          priority: 1,
          maxItems: 10,
        },
      ];
      const result = await composer.compose(profile, sources);
      expect(result.totalTokens).toBeLessThanOrEqual(10000);
    });
  });

  describe('provenance', () => {
    it('should track provenance when enabled', async () => {
      const configWithProvenance: Partial<ContextComposerConfig> = {
        ...config,
        enableProvenance: true,
      };
      const composer = new ContextComposer(configWithProvenance);
      const profile: TaskProfile = {
        taskType: 'feature',
        scope: 'single_file',
        complexity: 'low',
        risk: 'low',
        environment: 'dev',
      };
      const sources: ContextSource[] = [
        {
          name: 'test',
          priority: 1,
          maxItems: 10,
        },
      ];
      const result = await composer.compose(profile, sources);
      expect(result.provenance).toBeDefined();
    });
  });
});
