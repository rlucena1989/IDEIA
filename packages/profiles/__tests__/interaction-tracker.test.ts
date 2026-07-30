import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserInteractionTracker, OBSERVATION_THRESHOLD, SUGGESTION_THRESHOLD, PHASE_OBSERVATION, PHASE_SUGGESTION, PHASE_AUTO } from '../src/interaction-tracker';
import type { InteractionType } from '../src/interaction-tracker';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const ALL_TYPES: InteractionType[] = [
  'command.executed',
  'config.changed',
  'approval.granted',
  'approval.denied',
  'profile.applied',
  'suggestion.accepted',
  'suggestion.dismissed',
  'auto.fix.applied',
  'auto.fix.rejected',
];

describe('UserInteractionTracker', () => {
  let tracker: UserInteractionTracker;

  beforeEach(() => {
    tracker = new UserInteractionTracker();
  });

  afterEach(() => {
    tracker.clear();
  });

  it('records different interaction types', () => {
    for (const type of ALL_TYPES) {
      tracker.record(type, 'test-suite');
    }

    expect(tracker.getCount()).toBe(ALL_TYPES.length);

    for (const type of ALL_TYPES) {
      expect(tracker.getByType(type)).toBe(1);
    }
  });

  it('returns zero count when no interactions recorded', () => {
    expect(tracker.getCount()).toBe(0);
    expect(tracker.getState().totalInteractions).toBe(0);
  });

  it('returns zero for getByType when type has no interactions', () => {
    expect(tracker.getByType('command.executed')).toBe(0);
  });

  it('returns correct count by type with multiple interactions', () => {
    tracker.record('command.executed', 'test');
    tracker.record('command.executed', 'test');
    tracker.record('command.executed', 'test');
    tracker.record('config.changed', 'test');
    tracker.record('approval.granted', 'test');
    tracker.record('approval.granted', 'test');

    expect(tracker.getByType('command.executed')).toBe(3);
    expect(tracker.getByType('config.changed')).toBe(1);
    expect(tracker.getByType('approval.granted')).toBe(2);
    expect(tracker.getByType('approval.denied')).toBe(0);
  });

  it('returns the recorded interaction with correct shape', () => {
    const interaction = tracker.record('command.executed', 'test-source', { key: 'value' }, { command: 'lint', duration: 42 });

    expect(interaction.id).toBeDefined();
    expect(typeof interaction.id).toBe('string');
    expect(interaction.type).toBe('command.executed');
    expect(interaction.source).toBe('test-source');
    expect(interaction.timestamp).toBeDefined();
    expect(() => new Date(interaction.timestamp)).not.toThrow();
    expect(interaction.metadata).toEqual({ key: 'value' });
    expect(interaction.context).toEqual({ command: 'lint', duration: 42 });
  });

  it('records interaction without optional fields', () => {
    const interaction = tracker.record('profile.applied', 'system');

    expect(interaction.id).toBeDefined();
    expect(interaction.type).toBe('profile.applied');
    expect(interaction.source).toBe('system');
    expect(interaction.metadata).toBeUndefined();
    expect(interaction.context).toBeUndefined();
  });

  describe('phase detection', () => {
    it('returns observation phase when count < OBSERVATION_THRESHOLD', () => {
      for (let i = 0; i < OBSERVATION_THRESHOLD - 1; i++) {
        tracker.record('command.executed', 'test');
      }

      expect(tracker.getPhase()).toBe(PHASE_OBSERVATION);
    });

    it('returns suggestion phase when count >= OBSERVATION_THRESHOLD and < SUGGESTION_THRESHOLD', () => {
      for (let i = 0; i < OBSERVATION_THRESHOLD; i++) {
        tracker.record('command.executed', 'test');
      }

      expect(tracker.getPhase()).toBe(PHASE_SUGGESTION);
    });

    it('returns suggestion phase at midpoint', () => {
      for (let i = 0; i < SUGGESTION_THRESHOLD - 1; i++) {
        tracker.record('command.executed', 'test');
      }

      expect(tracker.getPhase()).toBe(PHASE_SUGGESTION);
    });

    it('returns auto phase when count >= SUGGESTION_THRESHOLD', () => {
      for (let i = 0; i < SUGGESTION_THRESHOLD; i++) {
        tracker.record('command.executed', 'test');
      }

      expect(tracker.getPhase()).toBe(PHASE_AUTO);
    });
  });

  describe('state summary', () => {
    it('returns correct state with no interactions', () => {
      const state = tracker.getState();

      expect(state.totalInteractions).toBe(0);
      expect(state.byType).toEqual({});
      expect(state.byHour).toEqual({});
      expect(state.recentCommands).toEqual([]);
      expect(state.periodStart).toEqual(state.lastUpdated);
    });

    it('returns state with correct counts by type', () => {
      tracker.record('command.executed', 'test');
      tracker.record('config.changed', 'test');
      tracker.record('command.executed', 'test');

      const state = tracker.getState();

      expect(state.totalInteractions).toBe(3);
      expect(state.byType).toEqual({
        'command.executed': 2,
        'config.changed': 1,
      });
    });

    it('aggregates by hour', () => {
      tracker.record('command.executed', 'test');
      tracker.record('config.changed', 'test');

      const state = tracker.getState();
      const hourKey = state.lastUpdated.slice(0, 13);

      expect(state.byHour[hourKey]).toBe(2);
    });

    it('collects recent commands from context', () => {
      tracker.record('command.executed', 'test', undefined, { command: 'lint' });
      tracker.record('command.executed', 'test', undefined, { command: 'build' });
      tracker.record('command.executed', 'test', undefined, { command: 'lint' });

      const state = tracker.getState();

      expect(state.recentCommands).toContainEqual({ command: 'lint', count: 2 });
      expect(state.recentCommands).toContainEqual({ command: 'build', count: 1 });
    });

    it('sorts recent commands by count descending', () => {
      tracker.record('command.executed', 'test', undefined, { command: 'a' });
      tracker.record('command.executed', 'test', undefined, { command: 'b' });
      tracker.record('command.executed', 'test', undefined, { command: 'b' });
      tracker.record('command.executed', 'test', undefined, { command: 'c' });
      tracker.record('command.executed', 'test', undefined, { command: 'c' });
      tracker.record('command.executed', 'test', undefined, { command: 'c' });

      const state = tracker.getState();

      expect(state.recentCommands[0]).toEqual({ command: 'c', count: 3 });
      expect(state.recentCommands[1]).toEqual({ command: 'b', count: 2 });
      expect(state.recentCommands[2]).toEqual({ command: 'a', count: 1 });
    });
  });

  describe('getRecent', () => {
    it('returns last N interactions in order', () => {
      for (let i = 0; i < 10; i++) {
        tracker.record('command.executed', 'test', { index: i });
      }

      const recent = tracker.getRecent(3);

      expect(recent).toHaveLength(3);
      expect(recent[0].metadata).toEqual({ index: 7 });
      expect(recent[1].metadata).toEqual({ index: 8 });
      expect(recent[2].metadata).toEqual({ index: 9 });
    });

    it('returns all interactions when limit exceeds count', () => {
      for (let i = 0; i < 3; i++) {
        tracker.record('command.executed', 'test');
      }

      const recent = tracker.getRecent(50);

      expect(recent).toHaveLength(3);
    });

    it('defaults to limit of 50', () => {
      for (let i = 0; i < 100; i++) {
        tracker.record('command.executed', 'test');
      }

      const recent = tracker.getRecent();

      expect(recent).toHaveLength(50);
    });
  });

  describe('clear', () => {
    it('resets all data', () => {
      tracker.record('command.executed', 'test');
      tracker.record('config.changed', 'test');

      expect(tracker.getCount()).toBe(2);

      tracker.clear();

      expect(tracker.getCount()).toBe(0);
      expect(tracker.getPhase()).toBe(PHASE_OBSERVATION);
    });
  });

  describe('getInteractionsSince', () => {
    it('returns interactions after the given date', () => {
      const before = new Date('2026-01-01T00:00:00.000Z');
      const after = new Date('2026-01-03T00:00:00.000Z');

      jest.useFakeTimers({ now: new Date('2026-01-02T00:00:00.000Z') });
      tracker.record('command.executed', 'test');
      jest.useRealTimers();

      const sinceResults = tracker.getInteractionsSince(after);
      expect(sinceResults).toHaveLength(0);

      const beforeResults = tracker.getInteractionsSince(before);
      expect(beforeResults).toHaveLength(1);
    });

    it('returns empty array when no interactions match', () => {
      const future = new Date('2099-01-01T00:00:00.000Z');
      const results = tracker.getInteractionsSince(future);

      expect(results).toEqual([]);
    });
  });

  describe('persistence', () => {
    let tmpFile: string;

    beforeEach(() => {
      tmpFile = join(tmpdir(), `interaction-tracker-test-${randomUUID()}.json`);
    });

    afterEach(() => {
      try {
        if (existsSync(tmpFile)) unlinkSync(tmpFile);
      } catch { /* ignore */ }
    });

    it('saves and loads interactions from file', () => {
      const saver = new UserInteractionTracker(tmpFile);
      saver.record('command.executed', 'test', { foo: 'bar' }, { command: 'build' });
      saver.record('config.changed', 'user', { profile: 'solo-dev' });
      saver.save();

      expect(existsSync(tmpFile)).toBe(true);

      const loaded = new UserInteractionTracker(tmpFile);
      loaded.load();

      expect(loaded.getCount()).toBe(2);
      expect(loaded.getByType('command.executed')).toBe(1);
      expect(loaded.getByType('config.changed')).toBe(1);

      const first = loaded.getRecent(1)[0];
      expect(first.source).toBe('user');
      expect(first.metadata).toEqual({ profile: 'solo-dev' });
    });

    it('loads empty state when file does not exist', () => {
      const loader = new UserInteractionTracker(tmpFile);
      loader.load();

      expect(loader.getCount()).toBe(0);
    });

    it('loads gracefully from corrupt file', () => {
      const dir = tmpFile.slice(0, tmpFile.lastIndexOf('\\'));
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const { writeFileSync } = require('node:fs') as typeof import('node:fs');
      writeFileSync(tmpFile, 'not-json', 'utf-8');

      const loader = new UserInteractionTracker(tmpFile);

      expect(() => loader.load()).toThrow();
    });

    it('overwrites save file with latest data', () => {
      const tracker1 = new UserInteractionTracker(tmpFile);
      tracker1.record('command.executed', 'test');
      tracker1.save();

      const tracker2 = new UserInteractionTracker(tmpFile);
      tracker2.record('config.changed', 'test');
      tracker2.save();

      const tracker3 = new UserInteractionTracker(tmpFile);
      tracker3.load();

      expect(tracker3.getCount()).toBe(1);
      expect(tracker3.getByType('config.changed')).toBe(1);
      expect(tracker3.getByType('command.executed')).toBe(0);
    });
  });
});
