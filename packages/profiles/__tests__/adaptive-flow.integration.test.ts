import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { randomUUID } from 'node:crypto';

import { UserInteractionTracker } from '../src/interaction-tracker';
import { AdaptiveSuggestions } from '../src/adaptive-suggestions';
import type { AdaptiveSuggestion } from '../src/adaptive-suggestions';
import { AutoAdaptation } from '../src/auto-adaptation';
import type { AutoAdaptResult } from '../src/auto-adaptation';
import { Profiles } from '../src/profiles';
import type { Interaction } from '../src/interaction-tracker';

function makeInteraction(type: string, overrides?: Partial<Interaction>): Interaction {
  return {
    id: randomUUID(),
    type,
    source: 'test',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeSuggestion(overrides?: Partial<AdaptiveSuggestion>): AdaptiveSuggestion {
  return {
    id: randomUUID(),
    type: 'autonomy',
    title: 'Test suggestion',
    description: 'Integration test suggestion',
    currentValue: 'assisted',
    suggestedValue: 'autonomous',
    confidence: 0.9,
    reason: 'Integration test',
    category: 'efficiency',
    createdAt: new Date().toISOString(),
    applied: false,
    ...overrides,
  };
}

class MockInteractionTracker {
  private count = 0;
  record(): void {
    this.count++;
  }
  getCount(): number {
    return this.count;
  }
  setCount(n: number): void {
    this.count = n;
  }
}

function createMockEventBus() {
  return {
    emit: jest.fn<any>().mockResolvedValue({
      id: randomUUID(),
      type: 'profile.applied',
      source: 'profiles',
      timestamp: new Date().toISOString(),
      payload: {},
    }),
    subscribe: jest.fn<any>().mockResolvedValue(randomUUID()),
    unsubscribe: jest.fn<any>().mockResolvedValue(true),
    subscribeOnce: jest.fn<any>().mockResolvedValue(randomUUID()),
    getHistory: jest.fn<any>().mockResolvedValue([]),
    clearHistory: jest.fn<any>().mockResolvedValue(undefined),
    subscriberCount: jest.fn<any>().mockResolvedValue(0),
  };
}

function createMockAuditTrail() {
  const events: Array<Record<string, unknown>> = [];
  return {
    append: jest.fn((evt: Record<string, unknown>) => {
      const full: Record<string, unknown> = {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        ...evt,
      };
      events.push(full);
      return full;
    }),
    verifyChain: jest.fn().mockReturnValue({ valid: true, totalEvents: events.length }),
  };
}

// Mock ConfigEngine — in-memory, no fs
class MockConfigEngine {
  config: Record<string, unknown> = {};
  async load(): Promise<void> {}
  get(path?: string): unknown {
    if (!path) return this.config;
    const parts = path.split('.');
    let cur: unknown = this.config;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  }
  async set(path: string, value: unknown): Promise<void> {
    const parts = path.split('.');
    let cur = this.config;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!;
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]!] = value;
  }
  getFull(): Record<string, unknown> {
    return this.config;
  }
  getGlobal(): Record<string, unknown> {
    return {};
  }
  getProject(): Record<string, unknown> {
    return this.config;
  }
}

// Mock ConfigVersioning — in-memory
class MockConfigVersioning {
  snapshots: Array<{ id: string; name: string; timestamp: string; config: Record<string, unknown> }> = [];
  constructor(private configProvider: () => Record<string, unknown>) {}
  async initialize(): Promise<void> {}
  async save(name: string): Promise<string> {
    const id = randomUUID();
    this.snapshots.push({ id, name, timestamp: new Date().toISOString(), config: this.configProvider() });
    return id;
  }
  list() {
    return [...this.snapshots];
  }
  diff(v1: string, v2: string) {
    const s1 = this.snapshots.find((s) => s.id === v1);
    const s2 = this.snapshots.find((s) => s.id === v2);
    if (!s1) throw new Error(`Snapshot not found: ${v1}`);
    if (!s2) throw new Error(`Snapshot not found: ${v2}`);
    return { from: v1, to: v2, changes: [] };
  }
  async rollback(id: string): Promise<void> {
    if (!this.snapshots.find((s) => s.id === id)) throw new Error(`Snapshot not found: ${id}`);
  }
  history() {
    return [...this.snapshots];
  }
}

// Mock ContextDetector — in-memory
class MockContextDetector {
  current = 'development';
  history: Array<{ context: string; timestamp: string; source: string }> = [];
  constructor(private configEngine: MockConfigEngine) {}
  async detect(): Promise<string> {
    return this.current;
  }
  async switch(ctx: string): Promise<void> {
    this.history.push({ context: ctx, timestamp: new Date().toISOString(), source: 'test' });
    this.current = ctx;
  }
  getCurrent(): string {
    return this.current;
  }
  getContextHistory() {
    return [...this.history];
  }
}

// ==============================================================================
// ADAPTIVE LEARNING FLOW — INTEGRATION TESTS (S25-09)
// ==============================================================================

describe('Adaptive Learning Flow Integration (S25-09)', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockAuditTrail: ReturnType<typeof createMockAuditTrail>;
  let mockTracker: MockInteractionTracker;
  let autoAdaptation: AutoAdaptation;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockAuditTrail = createMockAuditTrail();
    mockTracker = new MockInteractionTracker();
    autoAdaptation = new AutoAdaptation('solo-dev', 'assisted', mockTracker);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // SCENARIO 1: Full wizard → track → suggest → adapt flow
  // --------------------------------------------------------------------------
  describe('Scenario 1: Full wizard → track → suggest → adapt flow', () => {
    it('runs complete end-to-end adaptive flow', () => {
      // 1. Initialize Profiles with mock deps
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);
      expect(profiles.list()).toHaveLength(7);

      // 2. Create UserInteractionTracker (real class, in-memory)
      const tracker = new UserInteractionTracker();
      expect(tracker.getCount()).toBe(0);
      expect(tracker.getPhase()).toBe('observation');

      // 3. Simulate wizard selecting profile
      const soloDevProfile = profiles.get('solo-dev');
      expect(soloDevProfile.id).toBe('solo-dev');

      // 4. Record interactions to push past observation threshold
      for (let i = 0; i < 55; i++) {
        tracker.record(i < 40 ? 'ai_action_approved' : 'command_run', 'user');
      }
      expect(tracker.getPhase()).toBe('suggestion');
      expect(tracker.getCount()).toBe(55);

      // 5. Generate AdaptiveSuggestions
      const suggestionEngine = new AdaptiveSuggestions(tracker.getInteractions(), 'solo-dev', 'assisted');
      const result = suggestionEngine.analyze();
      expect(result.totalInteractions).toBe(55);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);

      const autoSuggestion = result.suggestions.find((s) => s.type === 'autonomy');
      expect(autoSuggestion).toBeDefined();
      expect(autoSuggestion!.suggestedValue).toBe('autonomous');

      // 6. Auto-adaptation evaluation (phase = suggestion)
      const evaluation = autoAdaptation.evaluate(result.suggestions);
      expect(evaluation.skip.length).toBeGreaterThanOrEqual(1);
    });

    it('creates profiles and applies through event bus', async () => {
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);
      await profiles.apply('tech-lead');

      expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'profile.applied' }));
      expect(mockAuditTrail.append).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'profile.apply', target: 'tech-lead' }));
    });

    it('matches wizard profile choices to Profiles system', () => {
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);
      const presetIds = profiles.getPresetIds();

      const wizardProfiles = ['solo-dev', 'tech-lead', 'automator', 'enterprise', 'custom', 'student', 'reviewer'];
      for (const wp of wizardProfiles) {
        expect(presetIds).toContain(wp);
        const profile = profiles.get(wp);
        expect(profile.name).toBeTruthy();
        expect(profile.config.autonomy.level).toBeTruthy();
      }
    });

    it('full adaptive flow generates suggestions with correct structure', () => {
      const tracker = new UserInteractionTracker();
      for (let i = 0; i < 60; i++) {
        tracker.record(i < 50 ? 'ai_action_approved' : 'ai_action_rejected', 'wizard-flow', { step: i }, { wizardMode: 'quick' });
      }

      const engine = new AdaptiveSuggestions(tracker.getInteractions(), 'solo-dev', 'assisted');
      const analysis = engine.analyze();

      for (const s of analysis.suggestions) {
        expect(s.id).toBeTruthy();
        expect(['profile', 'autonomy', 'config']).toContain(s.type);
        expect(s.confidence).toBeGreaterThanOrEqual(0.5);
        expect(s.confidence).toBeLessThanOrEqual(0.95);
        expect(s.createdAt).toBeTruthy();
      }
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: Auto-adaptation at 200+ interactions
  // --------------------------------------------------------------------------
  describe('Scenario 2: Auto-adaptation at 200+ interactions', () => {
    it('auto-applies high-confidence suggestions in auto phase', async () => {
      mockTracker.setCount(210);
      autoAdaptation = new AutoAdaptation('solo-dev', 'assisted', mockTracker);
      expect(autoAdaptation.getPhase()).toBe('auto');

      const suggestions = [
        makeSuggestion({ id: 's-apply-1', confidence: 0.9, type: 'autonomy' }),
        makeSuggestion({ id: 's-skip-1', confidence: 0.6, type: 'config' }),
        makeSuggestion({ id: 's-apply-2', confidence: 0.88, type: 'profile' }),
      ];

      const evaluation = autoAdaptation.evaluate(suggestions);
      expect(evaluation.apply).toHaveLength(2);
      expect(evaluation.skip).toHaveLength(1);
      expect(evaluation.apply.map((s) => s.id)).toEqual(['s-apply-1', 's-apply-2']);
    });

    it('execute returns correct AutoAdaptResult with applied suggestions', async () => {
      mockTracker.setCount(250);
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);
      autoAdaptation = new AutoAdaptation('solo-dev', 'assisted', mockTracker, profiles);

      const suggestions = [
        makeSuggestion({ id: 'exec-1', confidence: 0.92, type: 'autonomy' }),
        makeSuggestion({ id: 'exec-2', confidence: 0.95, type: 'config' }),
        makeSuggestion({ id: 'exec-3', confidence: 0.5, type: 'autonomy' }),
      ];

      const result: AutoAdaptResult = await autoAdaptation.execute(suggestions);
      expect(result.phase).toBe('auto');
      expect(result.applied).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.summary).toContain('Applied 2');
      expect(result.summary).toContain('skipped 1');
    });

    it('records transitions when crossing into auto phase', async () => {
      mockTracker.setCount(199);
      autoAdaptation = new AutoAdaptation('solo-dev', 'assisted', mockTracker);
      expect(autoAdaptation.getPhase()).toBe('suggestion');
      mockTracker.setCount(250);
      const result = await autoAdaptation.execute([makeSuggestion({ confidence: 0.95 })]);
      expect(result.phase).toBe('auto');
      expect(result.transitions.length).toBeGreaterThanOrEqual(1);
      expect(result.transitions[0].to).toBe('auto');
      expect(result.transitions[0].triggeredBy).toBe('threshold');
      expect(result.transitions[0].interactionCount).toBe(250);
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: Phase transitions
  // --------------------------------------------------------------------------
  describe('Scenario 3: Phase transitions', () => {
    it('starts in observation and transitions through suggestion to auto', () => {
      const tracker = new UserInteractionTracker();
      expect(tracker.getPhase()).toBe('observation');

      for (let i = 0; i < 50; i++) tracker.record('command_run', 'test');
      expect(tracker.getPhase()).toBe('suggestion');

      for (let i = 0; i < 150; i++) tracker.record('command_run', 'test');
      expect(tracker.getPhase()).toBe('auto');
      expect(tracker.getCount()).toBe(200);
    });

    it('supports manual override back to suggestion and tracks history', () => {
      const tracker = new MockInteractionTracker();
      autoAdaptation = new AutoAdaptation('solo-dev', 'assisted', tracker);

      // Start observation → transition to suggestion via manual
      autoAdaptation.transitionTo('suggestion', 'manual');
      expect(autoAdaptation.getPhase()).toBe('suggestion');

      // Transition to auto via override
      autoAdaptation.transitionTo('auto', 'override');
      expect(autoAdaptation.getPhase()).toBe('auto');

      // Back to observation
      autoAdaptation.transitionTo('observation', 'manual');
      expect(autoAdaptation.getPhase()).toBe('observation');

      const history = autoAdaptation.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].from).toBe('observation');
      expect(history[0].to).toBe('suggestion');
      expect(history[0].triggeredBy).toBe('manual');
      expect(history[1].to).toBe('auto');
      expect(history[1].triggeredBy).toBe('override');
      expect(history[2].to).toBe('observation');
      expect(history[2].triggeredBy).toBe('manual');
    });

    it('auto-transitions when interaction crosses threshold during execute', async () => {
      const tracker = new MockInteractionTracker();
      autoAdaptation = new AutoAdaptation('solo-dev', 'assisted', tracker);
      expect(autoAdaptation.getPhase()).toBe('observation');

      tracker.setCount(60);
      const result = await autoAdaptation.execute([makeSuggestion()]);
      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0].from).toBe('observation');
      expect(result.transitions[0].to).toBe('suggestion');
      expect(result.phase).toBe('suggestion');
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 4: Empty / no-data edge cases
  // --------------------------------------------------------------------------
  describe('Scenario 4: Empty / no-data edge cases', () => {
    it('tracker with no interactions returns observation phase and empty state', () => {
      const tracker = new UserInteractionTracker();
      expect(tracker.getPhase()).toBe('observation');
      expect(tracker.getCount()).toBe(0);
      expect(tracker.getState().byType).toEqual({});
      expect(tracker.getRecent()).toHaveLength(0);
    });

    it('adaptive suggestions with empty tracker return no suggestions', () => {
      const engine = new AdaptiveSuggestions([], 'solo-dev', 'assisted');
      const result = engine.analyze();
      expect(result.suggestions).toHaveLength(0);
      expect(result.totalInteractions).toBe(0);
    });

    it('auto-adaptation with empty suggestions returns no apply/skip', () => {
      mockTracker.setCount(100);
      autoAdaptation = new AutoAdaptation('solo-dev', 'assisted', mockTracker);
      const result = autoAdaptation.evaluate([]);
      expect(result.apply).toHaveLength(0);
      expect(result.skip).toHaveLength(0);
    });

    it('auto-adaptation with no interactions defaults to observation phase', () => {
      const emptyTracker = new MockInteractionTracker();
      const engine = new AutoAdaptation('solo-dev', 'assisted', emptyTracker);
      expect(engine.getPhase()).toBe('observation');
      expect(engine.getHistory()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 5: Error handling
  // --------------------------------------------------------------------------
  describe('Scenario 5: Error handling', () => {
    it('handles invalid interaction types gracefully', () => {
      const tracker = new UserInteractionTracker();
      tracker.record('unknown_type_xyz', 'test');
      expect(tracker.getCount()).toBe(1);
      expect(tracker.getByType('unknown_type_xyz')).toBe(1);
      expect(tracker.getPhase()).toBe('observation');
    });

    it('manages markApplied with non-existent id', () => {
      const interactions = Array.from({ length: 55 }, () => makeInteraction('ai_action_approved'));
      const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
      engine.analyze();

      const result = engine.markApplied('non-existent-id');
      expect(result).toBe(false);
      expect(engine.dismiss('non-existent-id')).toBe(false);
    });

    it('suggestions with interactions below threshold produce empty results', () => {
      const interactions = Array.from({ length: 10 }, () => makeInteraction('ai_action_approved'));
      const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
      const result = engine.analyze();

      expect(result.suggestions).toHaveLength(0);
      expect(result.totalInteractions).toBe(10);
      expect(result.analysisPeriod).toBeTruthy();
    });

    it('rejects Profiles.apply with invalid profile id', async () => {
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);
      await expect(profiles.apply('nonexistent')).rejects.toThrow('Profile not found');
      expect(mockAuditTrail.append).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 6: CLI integration simulation
  // --------------------------------------------------------------------------
  describe('Scenario 6: CLI integration simulation', () => {
    it('simulates record → status → suggestions → apply CLI flow', () => {
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);
      const tracker = new UserInteractionTracker();

      // Step 1: User completes wizard → selects profile
      profiles.get('solo-dev');

      // Step 2: Record interactions
      for (let i = 0; i < 60; i++) {
        tracker.record(i < 45 ? 'ai_action_approved' : 'command_run', 'cli', { iteration: i }, { profile: 'solo-dev' });
      }

      // Step 3: Check status
      const state = tracker.getState();
      expect(state.totalInteractions).toBe(60);
      expect(tracker.getPhase()).toBe('suggestion');

      // Step 4: Get suggestions
      const engine = new AdaptiveSuggestions(tracker.getInteractions(), 'solo-dev', 'assisted');
      const analysis = engine.analyze();
      expect(analysis.suggestions.length).toBeGreaterThan(0);

      // Step 5: Apply suggestions via AutoAdaptation
      const cliTracker = new MockInteractionTracker();
      cliTracker.setCount(tracker.getCount());
      const cliAdapt = new AutoAdaptation('solo-dev', 'assisted', cliTracker, profiles);
      const evaluation = cliAdapt.evaluate(analysis.suggestions);

      // In suggestion phase, only >= 0.95 confidence auto-applies without approval
      const highConf = analysis.suggestions.filter((s) => s.confidence >= 0.95);
      expect(evaluation.apply.length).toBeLessThanOrEqual(highConf.length);
      expect(evaluation.skip.length).toBeGreaterThanOrEqual(analysis.suggestions.length - highConf.length);
    });

    it('simulates auto-adaptation phase with CLI-like interaction recording', async () => {
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);
      const tracker = new UserInteractionTracker();

      // Record 210 interactions (simulating weeks of CLI usage)
      for (let i = 0; i < 180; i++) {
        tracker.record('ai_action_approved', 'cli', { iteration: i });
      }
      for (let i = 0; i < 30; i++) {
        tracker.record('command_run', 'cli', { command: 'build' });
      }
      expect(tracker.getCount()).toBe(210);
      expect(tracker.getPhase()).toBe('auto');

      // Get suggestions from the full history
      const engine = new AdaptiveSuggestions(tracker.getInteractions(), 'solo-dev', 'assisted');
      const analysis = engine.analyze();
      expect(analysis.suggestions.length).toBeGreaterThan(0);

      // Apply via auto-adaptation
      const cliTracker = new MockInteractionTracker();
      cliTracker.setCount(tracker.getCount());
      const cliAdapt = new AutoAdaptation('solo-dev', 'assisted', cliTracker, profiles);
      const result = await cliAdapt.execute(analysis.suggestions);

      expect(result.phase).toBe('auto');
      expect(result.applied.length + result.skipped.length).toBe(analysis.suggestions.length);
    });

    it('simulates config persisted after adaptation', async () => {
      const configEngine = new MockConfigEngine();
      const configVersioning = new MockConfigVersioning(() => configEngine.config);
      await configVersioning.initialize();

      // Simulate adaptive suggestion writing config
      await configEngine.set('autonomy.level', 'autonomous');
      await configEngine.set('autonomy.riskThreshold', 'medium');
      expect(configEngine.get('autonomy.level')).toBe('autonomous');

      // Save snapshot
      const snapshotId = await configVersioning.save('post-adaptation-v1');
      expect(snapshotId).toBeTruthy();
      expect(configVersioning.list()).toHaveLength(1);
      expect(configVersioning.history()).toHaveLength(1);

      // Further adaptation → another snapshot
      await configEngine.set('autonomy.autoFixCategories', ['style', 'docs', 'security']);
      await configEngine.set('notifications.channel', 'terminal');
      const snapshotId2 = await configVersioning.save('post-adaptation-v2');
      expect(snapshotId2).not.toBe(snapshotId);

      // Verify diff between versions
      const diff = configVersioning.diff(snapshotId, snapshotId2);
      expect(diff.from).toBe(snapshotId);
      expect(diff.to).toBe(snapshotId2);
      expect(diff.changes).toBeDefined();

      // Rollback to v1
      await configVersioning.rollback(snapshotId);
    });

    it('simulates context detection after profile change', async () => {
      const configEngine = new MockConfigEngine();
      const contextDetector = new MockContextDetector(configEngine);
      const profiles = new Profiles(mockEventBus as any, mockAuditTrail as any);

      // Initial context
      expect(contextDetector.getCurrent()).toBe('development');
      expect(contextDetector.getContextHistory()).toHaveLength(0);

      // Apply profile
      await profiles.apply('enterprise');

      // Switch context to production (enterprise grade)
      await contextDetector.switch('production');
      expect(contextDetector.getCurrent()).toBe('production');
      expect(contextDetector.getContextHistory()).toHaveLength(1);
      expect(contextDetector.getContextHistory()[0].context).toBe('production');
    });
  });
});
