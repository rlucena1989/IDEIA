import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdaptiveLearningEngine } from '../src/adaptive-engine';
import { UsageTracker } from '../src/usage-tracker';
import { SuggestionGenerator } from '../src/suggestion-generator';
import type { UsageRecord } from '../src/types';

function _recordUsage(
  tracker: UsageTracker,
  count: number,
  feature?: string,
  action?: string,
  sessionId?: string,
): void {
  const f = feature ?? 'cmd';
  const a = action ?? 'run';
  const s = sessionId ?? 'session-main';
  for (let i = 0; i < count; i++) {
    tracker.record(f, a, s, { index: i }, undefined, 'cli');
  }
}

describe('AdaptiveLearningEngine', () => {
  let engine: AdaptiveLearningEngine;

  beforeEach(() => {
    engine = new AdaptiveLearningEngine({ minConfidence: 0 });
  });

  it('starts with empty state', () => {
    const suggestions = engine.getSuggestions();
    expect(suggestions).toEqual([]);
  });

  it('records usage and returns record', () => {
    const record = engine.recordUsage('test', 'run', 's1', { key: 'val' }, 100, 'cli');
    expect(record.feature).toBe('test');
    expect(record.action).toBe('run');
    expect(record.sessionId).toBe('s1');
  });

  it('analyze produces suggestions from recorded data', () => {
    for (let i = 0; i < 15; i++) {
      engine.recordUsage('cli', 'build', 's1');
    }
    const result = engine.analyze();
    expect(result.totalRecords).toBe(15);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('getSuggestions returns non-dismissed suggestions', () => {
    for (let i = 0; i < 15; i++) {
      engine.recordUsage('cli', 'build', 's1');
    }
    engine.analyze();
    const suggestions = engine.getSuggestions();
    expect(suggestions.every(s => !s.dismissed)).toBe(true);
  });

  it('applySuggestion marks suggestion as applied', () => {
    for (let i = 0; i < 15; i++) {
      engine.recordUsage('cli', 'build', 's1');
    }
    engine.analyze();
    const s = engine.getSuggestions()[0];
    expect(s).toBeDefined();
    const applied = engine.applySuggestion(s.id);
    expect(applied).toBe(true);
    const updated = engine.getSuggestions().find(x => x.id === s.id);
    expect(updated?.applied).toBe(true);
  });

  it('applySuggestion returns false for unknown id', () => {
    expect(engine.applySuggestion('nope')).toBe(false);
  });

  it('dismissSuggestion marks suggestion as dismissed', () => {
    for (let i = 0; i < 15; i++) {
      engine.recordUsage('cli', 'build', 's1');
    }
    engine.analyze();
    const s = engine.getSuggestions()[0];
    expect(s).toBeDefined();
    const dismissed = engine.dismissSuggestion(s.id);
    expect(dismissed).toBe(true);
    expect(engine.getSuggestions().find(x => x.id === s.id)).toBeUndefined();
    expect(engine.getSuggestions(true).find(x => x.id === s.id)?.dismissed).toBe(true);
  });

  it('dismissSuggestion returns false for unknown id', () => {
    expect(engine.dismissSuggestion('nope')).toBe(false);
  });

  it('getStats returns all stats or single feature', () => {
    engine.recordUsage('a', 'x', 's1');
    engine.recordUsage('b', 'y', 's2');
    const all = engine.getStats() as ReturnType<UsageTracker['getAllStats']>;
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(2);

    const single = engine.getStats('a') as ReturnType<UsageTracker['getStats']>;
    expect(single.totalUses).toBe(1);
    expect(single.feature).toBe('a');
  });

  it('returns the tracker instance', () => {
    const tracker = engine.getTracker();
    expect(tracker).toBeInstanceOf(UsageTracker);
  });

  it('returns the generator instance', () => {
    const generator = engine.getGenerator();
    expect(generator).toBeInstanceOf(SuggestionGenerator);
  });

  it('returns config', () => {
    const config = engine.getConfig();
    expect(config.minConfidence).toBe(0);
    expect(config.autoApply).toBe(false);
  });
});

describe('UsageTracker — advanced scenarios', () => {
  it('computes frequency by hour and day', () => {
    const tracker = new UsageTracker();
    const base = new Date('2026-06-15T10:30:00Z');
    for (let i = 0; i < 5; i++) {
      const ts = new Date(base.getTime() + i * 3600000).toISOString();
      tracker.record('test', 'run', 's1', undefined, 100);
      const records = tracker.getRecords();
      const last = records[records.length - 1];
      (last as UsageRecord).timestamp = ts;
    }
    const stats = tracker.getStats('test');
    expect(Object.keys(stats.frequencyByHour).length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(stats.frequencyByDay).length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty records for unknown feature stats', () => {
    const tracker = new UsageTracker();
    const stats = tracker.getStats('nada');
    expect(stats.totalUses).toBe(0);
    expect(stats.sessionsUsed).toBe(0);
    expect(typeof stats.firstUsed).toBe('string');
    expect(typeof stats.lastUsed).toBe('string');
  });

  it('returns correct session count', () => {
    const tracker = new UsageTracker();
    tracker.record('a', 'x', 's1');
    tracker.record('b', 'x', 's2');
    tracker.record('c', 'x', 's2');
    expect(tracker.getSessionCount()).toBe(2);
  });
});

describe('SuggestionGenerator — edge cases', () => {
  let generator: SuggestionGenerator;

  beforeEach(() => {
    generator = new SuggestionGenerator({ windowSizeMs: 365 * 24 * 60 * 60 * 1000 });
  });

  it('does not crash with empty records', () => {
    const result = generator.generate([]);
    expect(result.suggestions).toEqual([]);
  });

  it('does not generate suggestions below threshold', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 3; i++) {
      records.push({ id: `r${i}`, feature: 'x', action: 'y', timestamp: new Date().toISOString(), sessionId: 's1' });
    }
    const result = generator.generate(records);
    expect(result.suggestions).toEqual([]);
  });

  it('handles records outside window', () => {
    const oldGen = new SuggestionGenerator({ windowSizeMs: 1000 });
    const old: UsageRecord = {
      id: 'old',
      feature: 'cli',
      action: 'build',
      timestamp: new Date('2020-01-01').toISOString(),
      sessionId: 's1',
    };
    const result = oldGen.generate([old]);
    expect(result.suggestions).toEqual([]);
  });

  it('returns suggestions with confidence in [0, 1]', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 50; i++) {
      records.push({ id: `r${i}`, feature: 'cli', action: 'build', timestamp: new Date().toISOString(), sessionId: 's1' });
    }
    const result = generator.generate(records, 0);
    for (const s of result.suggestions) {
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('generates config suggestions for busy sessions', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 12; i++) {
      records.push({ id: `r${i}`, feature: `f${i % 4}`, action: 'run', timestamp: new Date().toISOString(), sessionId: 'heavy' });
    }
    const result = generator.generate(records, 0);
    const configs = result.suggestions.filter(s => s.type === 'config');
    expect(configs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('SuggestionGenerator — config', () => {
  it('uses custom thresholds', () => {
    const gen = new SuggestionGenerator({
      aliasThreshold: 2,
      workflowThreshold: 2,
      shortcutThreshold: 2,
      automationThreshold: 2,
      profileThreshold: 2,
      windowSizeMs: 365 * 24 * 60 * 60 * 1000,
    });
    const records: UsageRecord[] = [];
    for (let i = 0; i < 5; i++) {
      records.push({ id: `r${i}`, feature: 'cli', action: 'build', timestamp: new Date().toISOString(), sessionId: 's1' });
    }
    const result = gen.generate(records, 0);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('uses default config when not provided', () => {
    const gen = new SuggestionGenerator();
    const config = gen.getConfig();
    expect(config.aliasThreshold).toBe(10);
    expect(config.workflowThreshold).toBe(5);
    expect(config.shortcutThreshold).toBe(8);
    expect(config.automationThreshold).toBe(3);
    expect(config.profileThreshold).toBe(15);
  });
});

describe('AdaptiveLearningEngine — auto-apply', () => {
  it('auto-analyzes when autoApply is enabled', () => {
    const autoEngine = new AdaptiveLearningEngine({ autoApply: true, minConfidence: 0 });
    for (let i = 0; i < 15; i++) {
      autoEngine.recordUsage('cli', 'build', 's1');
    }
    const suggestions = autoEngine.getSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('still works with no records and auto-apply', () => {
    const autoEngine = new AdaptiveLearningEngine({ autoApply: true, minConfidence: 0 });
    const suggestions = autoEngine.getSuggestions();
    expect(suggestions).toEqual([]);
  });
});
