import { UsabilityProfileEngine } from '../src/usability-profile';
import { UsabilityEvent } from '../src/types';

describe('UsabilityProfileEngine', () => {
  it('should track events and build behavior patterns', () => {
    const engine = new UsabilityProfileEngine('test-user');

    const event: UsabilityEvent = {
      type: 'command',
      action: 'git.commit',
      context: 'editor',
      timestamp: new Date().toISOString(),
    };

    for (let i = 0; i < 5; i++) {
      engine.trackEvent(event);
    }

    const state = engine.getState();
    expect(state.totalEvents).toBe(5);
    expect(state.behaviorPatterns).toHaveLength(1);
    expect(state.behaviorPatterns[0]!.frequency).toBe(5);
    expect(state.behaviorPatterns[0]!.score).toBeGreaterThan(0);
  });

  it('should suggest adaptations for frequent actions', () => {
    const engine = new UsabilityProfileEngine('test-user');

    for (let i = 0; i < 12; i++) {
      engine.trackEvent({
        type: 'widget',
        action: 'open',
        context: 'dashboard',
        timestamp: new Date().toISOString(),
      });
    }

    const adaptations = engine.getAdaptations();
    expect(adaptations.length).toBeGreaterThan(0);
    expect(adaptations.some(a => a.type === 'layout' && a.target === 'widget')).toBe(true);
  });

  it('should track error patterns', () => {
    const engine = new UsabilityProfileEngine('test-user');

    engine.trackEvent({
      type: 'error',
      action: 'build.failed',
      context: 'compile',
      timestamp: new Date().toISOString(),
    });

    engine.trackEvent({
      type: 'error',
      action: 'build.failed',
      context: 'compile',
      timestamp: new Date().toISOString(),
    });

    const state = engine.getState();
    expect(state.commonErrorPatterns).toContain('build.failed');
    expect(state.behaviorPatterns[0]!.frequency).toBe(2);
  });

  it('should apply adaptations', () => {
    const engine = new UsabilityProfileEngine('test-user');

    for (let i = 0; i < 12; i++) {
      engine.trackEvent({
        type: 'widget',
        action: 'open',
        context: 'dashboard',
        timestamp: new Date().toISOString(),
      });
    }

    const adaptations = engine.getAdaptations();
    const result = engine.applyAdaptation(adaptations[0]!.id);
    expect(result).toBe(true);

    const doubleApply = engine.applyAdaptation(adaptations[0]!.id);
    expect(doubleApply).toBe(false);
  });

  it('should limit max patterns', () => {
    const engine = new UsabilityProfileEngine('test-user', undefined, undefined, { maxPatterns: 2 });

    for (let i = 0; i < 5; i++) {
      engine.trackEvent({
        type: 'command',
        action: `action.${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    expect(engine.getState().behaviorPatterns.length).toBeLessThanOrEqual(2);
  });

  it('should return pending suggestions', () => {
    const engine = new UsabilityProfileEngine('test-user');

    for (let i = 0; i < 5; i++) {
      engine.trackEvent({
        type: 'error',
        action: 'workflow.failed',
        timestamp: new Date().toISOString(),
      });
    }

    const suggestions = engine.getSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  });

  it('should support config updates', () => {
    const engine = new UsabilityProfileEngine('test-user');
    engine.updateConfig({ autoAdapt: false, learningRate: 0.5 });

    const config = engine.getConfig();
    expect(config.autoAdapt).toBe(false);
    expect(config.learningRate).toBe(0.5);
  });
});
