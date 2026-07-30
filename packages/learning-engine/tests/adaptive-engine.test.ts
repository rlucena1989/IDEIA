import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdaptiveLearningEngine } from '../src/adaptive-engine';
import { EngineConfig } from '../src/types';

describe('AdaptiveLearningEngine', () => {
  let engine: AdaptiveLearningEngine;

  beforeEach(() => {
    engine = new AdaptiveLearningEngine();
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      const engine = new AdaptiveLearningEngine();
      expect(engine).toBeInstanceOf(AdaptiveLearningEngine);
    });

    it('should create engine with custom config', () => {
      const config: EngineConfig = {
        autoApply: true,
        minConfidence: 0.5,
      };
      const engine = new AdaptiveLearningEngine(config);
      expect(engine).toBeInstanceOf(AdaptiveLearningEngine);
    });
  });

  describe('recordUsage', () => {
    it('should record usage', () => {
      const record = engine.recordUsage('test-feature', 'test-action', 'session-1');
      expect(record).toBeDefined();
      expect(record.feature).toBe('test-feature');
      expect(record.action).toBe('test-action');
    });

    it('should record usage with metadata', () => {
      const record = engine.recordUsage('test-feature', 'test-action', 'session-1', { key: 'value' });
      expect(record.metadata).toEqual({ key: 'value' });
    });

    it('should record usage with duration', () => {
      const record = engine.recordUsage('test-feature', 'test-action', 'session-1', undefined, 1000);
      expect(record.durationMs).toBe(1000);
    });
  });

  describe('analyze', () => {
    it('should analyze usage and generate suggestions', () => {
      engine.recordUsage('test-feature', 'test-action', 'session-1');
      const result = engine.analyze();
      expect(result).toBeDefined();
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions excluding dismissed', () => {
      engine.recordUsage('test-feature', 'test-action', 'session-1');
      engine.analyze();
      const suggestions = engine.getSuggestions();
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return all suggestions including dismissed when requested', () => {
      engine.recordUsage('test-feature', 'test-action', 'session-1');
      engine.analyze();
      const suggestions = engine.getSuggestions(true);
      expect(suggestions).toBeDefined();
    });
  });

  describe('applySuggestion', () => {
    it('should apply suggestion', () => {
      engine.recordUsage('test-feature', 'test-action', 'session-1');
      const result = engine.analyze();
      if (result.suggestions.length > 0) {
        const applied = engine.applySuggestion(result.suggestions[0].id);
        expect(applied).toBe(true);
      }
    });

    it('should return false for non-existent suggestion', () => {
      const applied = engine.applySuggestion('non-existent');
      expect(applied).toBe(false);
    });
  });

  describe('dismissSuggestion', () => {
    it('should dismiss suggestion', () => {
      engine.recordUsage('test-feature', 'test-action', 'session-1');
      const result = engine.analyze();
      if (result.suggestions.length > 0) {
        const dismissed = engine.dismissSuggestion(result.suggestions[0].id);
        expect(dismissed).toBe(true);
      }
    });
  });

  describe('getStats', () => {
    it('should return all stats', () => {
      engine.recordUsage('test-feature', 'test-action', 'session-1');
      const stats = engine.getStats();
      expect(stats).toBeDefined();
    });

    it('should return stats for specific feature', () => {
      engine.recordUsage('test-feature', 'test-action', 'session-1');
      const stats = engine.getStats('test-feature');
      expect(stats).toBeDefined();
    });
  });

  describe('getTracker', () => {
    it('should return tracker instance', () => {
      const tracker = engine.getTracker();
      expect(tracker).toBeDefined();
    });
  });

  describe('getGenerator', () => {
    it('should return generator instance', () => {
      const generator = engine.getGenerator();
      expect(generator).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return config', () => {
      const config = engine.getConfig();
      expect(config).toBeDefined();
      expect(config.autoApply).toBeDefined();
    });
  });
});
