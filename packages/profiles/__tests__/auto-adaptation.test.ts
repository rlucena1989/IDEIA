import { describe, it, expect } from '@jest/globals';
import { AutoAdaptation } from '../src/auto-adaptation';
import type { AdaptiveSuggestion } from '../src/adaptive-suggestions';
import type { InteractionTracker } from '../src/auto-adaptation';

class MockTracker implements InteractionTracker {
  private count = 0;
  record(): void { this.count++; }
  getCount(): number { return this.count; }
  setCount(n: number): void { this.count = n; }
}

const makeSuggestion = (overrides: Partial<AdaptiveSuggestion> = {}): AdaptiveSuggestion => ({
  id: 's1',
  type: 'profile',
  title: 'Switch profile',
  description: 'Switch to automator profile',
  currentValue: 'solo-dev',
  suggestedValue: 'automator',
  confidence: 0.9,
  reason: 'Better fit for workflow',
  category: 'efficiency',
  createdAt: new Date().toISOString(),
  applied: false,
  ...overrides,
});

describe('AutoAdaptation', () => {
  it('starts in observation phase when interaction count < threshold', () => {
    const tracker = new MockTracker();
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    expect(engine.getPhase()).toBe('observation');
  });

  it('enters suggestion phase at 50-199 interactions', () => {
    const tracker = new MockTracker();
    tracker.setCount(60);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    expect(engine.getPhase()).toBe('suggestion');
  });

  it('enters auto phase at 200+ interactions', () => {
    const tracker = new MockTracker();
    tracker.setCount(250);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    expect(engine.getPhase()).toBe('auto');
  });

  it('does not auto-apply suggestions in observation phase', () => {
    const tracker = new MockTracker();
    tracker.setCount(10);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    const result = engine.evaluate([makeSuggestion({ confidence: 0.99 })]);
    expect(result.apply).toHaveLength(0);
    expect(result.skip).toHaveLength(1);
  });

  it('auto-applies high-confidence suggestions in suggestion phase when requireApproval=false', () => {
    const tracker = new MockTracker();
    tracker.setCount(100);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    engine.updateConfig({ requireApproval: false });
    const suggestion = makeSuggestion({ confidence: 0.96 });
    const result = engine.evaluate([suggestion]);
    expect(result.apply).toHaveLength(1);
    expect(result.skip).toHaveLength(0);
  });

  it('does not auto-apply below-threshold confidence in suggestion phase', () => {
    const tracker = new MockTracker();
    tracker.setCount(100);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    const suggestion = makeSuggestion({ confidence: 0.85 });
    const result = engine.evaluate([suggestion]);
    expect(result.apply).toHaveLength(0);
    expect(result.skip).toHaveLength(1);
  });

  it('auto-applies suggestions with confidence >= 0.85 in auto phase', () => {
    const tracker = new MockTracker();
    tracker.setCount(250);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    const suggestions = [
      makeSuggestion({ id: 's1', confidence: 0.9 }),
      makeSuggestion({ id: 's2', confidence: 0.85 }),
      makeSuggestion({ id: 's3', confidence: 0.7 }),
    ];
    const result = engine.evaluate(suggestions);
    expect(result.apply).toHaveLength(2);
    expect(result.skip).toHaveLength(1);
    expect(result.apply.map(s => s.id)).toEqual(['s1', 's2']);
  });

  it('supports manual phase transition', () => {
    const tracker = new MockTracker();
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    const transition = engine.transitionTo('auto');
    expect(transition.from).toBe('observation');
    expect(transition.to).toBe('auto');
    expect(transition.triggeredBy).toBe('manual');
    expect(engine.getPhase()).toBe('auto');
  });

  it('tracks phase transition history', () => {
    const tracker = new MockTracker();
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    engine.transitionTo('suggestion');
    engine.transitionTo('auto', 'override');
    const history = engine.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].to).toBe('suggestion');
    expect(history[0].triggeredBy).toBe('manual');
    expect(history[1].to).toBe('auto');
    expect(history[1].triggeredBy).toBe('override');
  });

  it('allows config overrides via updateConfig', () => {
    const tracker = new MockTracker();
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    const initial = engine.getConfig();
    expect(initial.observationThreshold).toBe(50);
    expect(initial.suggestionThreshold).toBe(200);

    engine.updateConfig({ observationThreshold: 100, autoApplyConfidence: 0.9 });
    const updated = engine.getConfig();
    expect(updated.observationThreshold).toBe(100);
    expect(updated.autoApplyConfidence).toBe(0.9);
    expect(updated.suggestionThreshold).toBe(200);
  });

  it('triggers automatic phase transition when interaction count crosses threshold', async () => {
    const tracker = new MockTracker();
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    expect(engine.getPhase()).toBe('observation');
    tracker.setCount(60);

    const result = await engine.execute([makeSuggestion({ confidence: 0.99 })]);
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0].from).toBe('observation');
    expect(result.transitions[0].to).toBe('suggestion');
    expect(result.transitions[0].triggeredBy).toBe('threshold');
  });

  it('returns correct summary string from execute', async () => {
    const tracker = new MockTracker();
    tracker.setCount(250);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    const result = await engine.execute([
      makeSuggestion({ id: 's1', confidence: 0.9 }),
      makeSuggestion({ id: 's2', confidence: 0.7 }),
    ]);
    expect(result.summary).toContain('Applied 1');
    expect(result.summary).toContain('skipped 1');
    expect(result.summary).toContain('auto');
  });

  it('handles empty suggestions array', () => {
    const tracker = new MockTracker();
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    const result = engine.evaluate([]);
    expect(result.apply).toHaveLength(0);
    expect(result.skip).toHaveLength(0);
  });

  it('does not auto-apply if requireApproval is true in suggestion phase', () => {
    const tracker = new MockTracker();
    tracker.setCount(100);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    engine.updateConfig({ requireApproval: true });
    const result = engine.evaluate([makeSuggestion({ confidence: 0.99 })]);
    expect(result.apply).toHaveLength(0);
    expect(result.skip).toHaveLength(1);
  });

  it('respects custom thresholds in determinePhase', () => {
    const tracker = new MockTracker();
    tracker.setCount(30);
    const engine = new AutoAdaptation('solo-dev', 'assisted', tracker);
    engine.updateConfig({ observationThreshold: 20, suggestionThreshold: 100 });
    expect(engine.getPhase()).toBe('suggestion');
  });
});
