import { describe, it, expect, beforeEach } from '@jest/globals';
import { FeedbackOrchestrator } from '../src/orchestrator';
import { FeedbackEvent, FeedbackAction, PatternEntry } from '../src/types';

describe('FeedbackOrchestrator', () => {
  let orchestrator: FeedbackOrchestrator;

  beforeEach(() => {
    orchestrator = new FeedbackOrchestrator();
  });

  describe('onEvent', () => {
    it('should create action for critical event', async () => {
      const event: Omit<FeedbackEvent, 'id'> = {
        type: 'test_failure',
        source: 'test',
        data: { error: 'test failed' },
        severity: 'critical',
        timestamp: Date.now(),
      };
      const action = await orchestrator.onEvent(event);
      expect(action.type).toBe('escalate');
      expect(action.status).toBe('running');
    });

    it('should create action for high severity event', async () => {
      const event: Omit<FeedbackEvent, 'id'> = {
        type: 'gate_blocked',
        source: 'quality-gate',
        data: { gate: 'security' },
        severity: 'high',
        timestamp: Date.now(),
      };
      const action = await orchestrator.onEvent(event);
      expect(action.type).toBe('fix');
      expect(action.status).toBe('running');
    });

    it('should create action for medium severity event', async () => {
      const event: Omit<FeedbackEvent, 'id'> = {
        type: 'pattern_detected',
        source: 'pattern-detector',
        data: { pattern: 'memory leak' },
        severity: 'medium',
        timestamp: Date.now(),
      };
      const action = await orchestrator.onEvent(event);
      expect(action.type).toBe('log');
      expect(action.status).toBe('completed');
    });

    it('should create action for low severity event', async () => {
      const event: Omit<FeedbackEvent, 'id'> = {
        type: 'improvement',
        source: 'analytics',
        data: { metric: 'performance' },
        severity: 'low',
        timestamp: Date.now(),
      };
      const action = await orchestrator.onEvent(event);
      expect(action.status).toBe('completed');
    });
  });

  describe('registerPattern', () => {
    it('should register pattern and return id', () => {
      const pattern: Omit<PatternEntry, 'id'> = {
        pattern: 'memory leak',
        symptom: 'increasing memory usage',
        fix: 'fix resource cleanup',
        frequency: 5,
        lastDetected: Date.now(),
        confidence: 0.9,
      };
      const id = orchestrator.registerPattern(pattern);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  describe('findPatterns', () => {
    it('should find patterns by symptom', () => {
      orchestrator.registerPattern({
        pattern: 'memory leak',
        symptom: 'increasing memory usage',
        fix: 'fix resource cleanup',
        frequency: 5,
        lastDetected: Date.now(),
        confidence: 0.9,
      });
      const patterns = orchestrator.findPatterns('memory');
      expect(patterns).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const patterns = orchestrator.findPatterns('non-existent');
      expect(patterns).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return stats with no events', () => {
      const stats = orchestrator.getStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.totalActions).toBe(0);
      expect(stats.patternsCount).toBe(0);
      expect(stats.topSeverity).toBe('none');
    });

    it('should return stats with events', async () => {
      await orchestrator.onEvent({
        type: 'test_failure',
        source: 'test',
        data: {},
        severity: 'critical',
        timestamp: Date.now(),
      });
      const stats = orchestrator.getStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.totalActions).toBe(1);
      expect(stats.topSeverity).toBe('critical');
    });
  });

  describe('processQueue', () => {
    it('should process queued events', async () => {
      await orchestrator.onEvent({
        type: 'test_failure',
        source: 'test',
        data: {},
        severity: 'low',
        timestamp: Date.now(),
      });
      await orchestrator.processQueue();
      const stats = orchestrator.getStats();
      expect(stats.totalEvents).toBe(1);
    });
  });
});
