import { describe, it, expect, beforeEach } from '@jest/globals';
import { UsageTracker } from '../src/usage-tracker';
import { SuggestionGenerator } from '../src/suggestion-generator';
import type { UsageRecord } from '../src/types';

function makeRecord(
  feature: string,
  action: string,
  sessionId: string,
  overrides?: Partial<UsageRecord>,
): UsageRecord {
  return {
    id: `test-${Math.random().toString(36).slice(2, 10)}`,
    feature,
    action,
    timestamp: new Date().toISOString(),
    sessionId,
    ...overrides,
  };
}

describe('UsageTracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  it('starts empty', () => {
    expect(tracker.getTotalRecords()).toBe(0);
    expect(tracker.getSessions()).toEqual([]);
  });

  it('records a single usage', () => {
    const record = tracker.record('test-feature', 'run', 'session-1');
    expect(record.feature).toBe('test-feature');
    expect(record.action).toBe('run');
    expect(record.sessionId).toBe('session-1');
    expect(tracker.getTotalRecords()).toBe(1);
    expect(tracker.getSessions()).toEqual(['session-1']);
  });

  it('records with optional fields', () => {
    const record = tracker.record('build', 'compile', 'sess-a', { lang: 'ts' }, 3500, 'cli');
    expect(record.metadata).toEqual({ lang: 'ts' });
    expect(record.durationMs).toBe(3500);
    expect(record.source).toBe('cli');
  });

  it('returns records filtered by feature', () => {
    tracker.record('alpha', 'run', 's1');
    tracker.record('beta', 'run', 's1');
    tracker.record('alpha', 'stop', 's2');
    const alpha = tracker.getRecords('alpha');
    expect(alpha).toHaveLength(2);
    const beta = tracker.getRecords('beta');
    expect(beta).toHaveLength(1);
  });

  it('returns records filtered by date', () => {
    const past = new Date('2025-01-01');
    const future = new Date('2027-01-01');
    tracker.record('x', 'a', 's1');
    expect(tracker.getRecords(undefined, future)).toHaveLength(0);
    expect(tracker.getRecords(undefined, past).length).toBeGreaterThanOrEqual(1);
  });

  it('computes stats for a feature', () => {
    tracker.record('ping', 'check', 's1', undefined, 100);
    tracker.record('ping', 'check', 's1', undefined, 200);
    tracker.record('ping', 'check', 's2', undefined, 300);
    tracker.record('pong', 'check', 's1');

    const stats = tracker.getStats('ping');
    expect(stats.totalUses).toBe(3);
    expect(stats.sessionsUsed).toBe(2);
    expect(stats.avgDurationMs).toBe(200);
    expect(stats.feature).toBe('ping');
  });

  it('gets stats for unknown feature', () => {
    const stats = tracker.getStats('nope');
    expect(stats.totalUses).toBe(0);
    expect(stats.sessionsUsed).toBe(0);
  });

  it('returns all stats sorted by usage', () => {
    tracker.record('a', 'x', 's1');
    tracker.record('b', 'x', 's1');
    tracker.record('b', 'x', 's2');
    tracker.record('c', 'x', 's1');
    tracker.record('c', 'x', 's1');
    tracker.record('c', 'x', 's2');

    const all = tracker.getAllStats();
    expect(all).toHaveLength(3);
    expect(all[0].feature).toBe('c');
    expect(all[1].feature).toBe('b');
    expect(all[2].feature).toBe('a');
  });

  it('clears all records', () => {
    tracker.record('a', 'x', 's1');
    tracker.record('b', 'x', 's1');
    tracker.clear();
    expect(tracker.getTotalRecords()).toBe(0);
  });

  it('clears a specific session', () => {
    tracker.record('a', 'x', 's1');
    tracker.record('b', 'x', 's2');
    tracker.clearSession('s1');
    expect(tracker.getTotalRecords()).toBe(1);
    expect(tracker.getSessions()).toEqual(['s2']);
  });

  it('enforces max records', () => {
    const limited = new UsageTracker({ maxRecords: 5 });
    for (let i = 0; i < 10; i++) {
      limited.record(`f${i}`, 'x', 's1');
    }
    expect(limited.getTotalRecords()).toBe(5);
  });

  it('serializes and deserializes', () => {
    tracker.record('a', 'x', 's1');
    tracker.record('b', 'y', 's2');
    const json = tracker.toJSON();
    expect(json).toHaveLength(2);

    const tracker2 = new UsageTracker();
    tracker2.fromJSON(json);
    expect(tracker2.getTotalRecords()).toBe(2);
    expect(tracker2.getRecords('a')).toHaveLength(1);
  });

  it('trims on deserialization', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 10; i++) {
      records.push(makeRecord(`f${i}`, 'x', 's1'));
    }
    const limited = new UsageTracker({ maxRecords: 3 });
    limited.fromJSON(records);
    expect(limited.getTotalRecords()).toBe(3);
  });
});

describe('SuggestionGenerator', () => {
  let generator: SuggestionGenerator;

  beforeEach(() => {
    generator = new SuggestionGenerator({ windowSizeMs: 365 * 24 * 60 * 60 * 1000 });
  });

  it('returns empty result with no records', () => {
    const result = generator.generate([]);
    expect(result.suggestions).toEqual([]);
    expect(result.totalRecords).toBe(0);
    expect(result.generatedAt).toBeDefined();
  });

  it('generates alias suggestion for frequent action', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 12; i++) {
      records.push(makeRecord('cli', 'build', 's1'));
    }
    const result = generator.generate(records);
    const aliases = result.suggestions.filter(s => s.type === 'alias');
    expect(aliases.length).toBeGreaterThanOrEqual(1);
    expect(aliases[0].sourceFeature).toBe('cli');
  });

  it('generates workflow suggestion for repeated sequence', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 8; i++) {
      const base = new Date('2026-01-01T00:00:00Z').getTime() + i * 1000;
      records.push(makeRecord('a', 'x', 's1', { timestamp: new Date(base).toISOString() }));
      records.push(makeRecord('b', 'y', 's1', { timestamp: new Date(base + 100).toISOString() }));
      records.push(makeRecord('c', 'z', 's1', { timestamp: new Date(base + 200).toISOString() }));
    }
    const result = generator.generate(records);
    const workflows = result.suggestions.filter(s => s.type === 'workflow');
    expect(workflows.length).toBeGreaterThanOrEqual(1);
  });

  it('generates shortcut suggestion for slow commands', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 10; i++) {
      records.push(makeRecord('db', 'query', 's1', { durationMs: 15000 }));
    }
    const result = generator.generate(records);
    const shortcuts = result.suggestions.filter(s => s.type === 'shortcut');
    expect(shortcuts.length).toBeGreaterThanOrEqual(1);
  });

  it('generates automation suggestion for frequent feature', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 20; i++) {
      records.push(makeRecord('backup', 'run', 's1'));
    }
    const result = generator.generate(records);
    const automations = result.suggestions.filter(s => s.type === 'automation');
    expect(automations.length).toBeGreaterThanOrEqual(1);
  });

  it('generates profile suggestion when few features dominate', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 30; i++) {
      records.push(makeRecord('editor', 'open', 's1'));
    }
    for (let i = 0; i < 5; i++) {
      records.push(makeRecord('terminal', 'run', 's1'));
      records.push(makeRecord('git', 'commit', 's1'));
    }
    const result = generator.generate(records);
    const profiles = result.suggestions.filter(s => s.type === 'profile');
    expect(profiles.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by minConfidence', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 3; i++) {
      records.push(makeRecord('x', 'y', 's1'));
    }
    const result = generator.generate(records, 0.95);
    expect(result.suggestions).toEqual([]);
  });

  it('sorts suggestions by confidence descending', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 15; i++) {
      records.push(makeRecord('cli', 'build', 's1'));
    }
    for (let i = 0; i < 20; i++) {
      records.push(makeRecord('backup', 'run', 's2'));
    }
    const result = generator.generate(records, 0);
    for (let i = 1; i < result.suggestions.length; i++) {
      expect(result.suggestions[i - 1].confidence).toBeGreaterThanOrEqual(result.suggestions[i].confidence);
    }
  });

  it('returns suggestions with correct shape', () => {
    const records: UsageRecord[] = [];
    for (let i = 0; i < 12; i++) {
      records.push(makeRecord('cli', 'build', 's1'));
    }
    const result = generator.generate(records);
    if (result.suggestions.length > 0) {
      const s = result.suggestions[0];
      expect(s.id).toBeDefined();
      expect(s.type).toBeDefined();
      expect(s.title).toBeDefined();
      expect(s.description).toBeDefined();
      expect(typeof s.confidence).toBe('number');
      expect(s.reason).toBeDefined();
      expect(s.createdAt).toBeDefined();
      expect(s.applied).toBe(false);
      expect(s.dismissed).toBe(false);
      expect(s.sourceFeature).toBeDefined();
      expect(s.suggestedAction).toBeDefined();
    }
  });
});
