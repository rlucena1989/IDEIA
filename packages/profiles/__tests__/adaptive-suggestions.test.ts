import { describe, it, expect } from '@jest/globals';
import { AdaptiveSuggestions } from '../src/adaptive-suggestions';
import type { Interaction } from '../src/interaction-tracker';

function makeInteraction(
  type: Interaction['type'],
  overrides?: Partial<Interaction>
): Interaction {
  return {
    id: crypto.randomUUID(),
    type,
    source: 'test',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('AdaptiveSuggestions', () => {
  it('no suggestions below threshold', () => {
    const interactions = Array.from({ length: 49 }, () =>
      makeInteraction('ai_action_approved')
    );
    const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
    const result = engine.analyze();
    expect(result.suggestions).toHaveLength(0);
    expect(result.totalInteractions).toBe(49);
  });

  it('autonomy upgrade suggestion when approval rate is high', () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 45 }, () => makeInteraction('ai_action_approved')),
      ...Array.from({ length: 5 }, () => makeInteraction('ai_action_rejected')),
    ];
    const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
    const result = engine.analyze();
    expect(result.suggestions.length).toBeGreaterThan(0);
    const upgrade = result.suggestions.find(s => s.title.includes('Upgrade'));
    expect(upgrade).toBeDefined();
    expect(upgrade!.type).toBe('autonomy');
    expect(upgrade!.currentValue).toBe('assisted');
    expect(upgrade!.suggestedValue).toBe('autonomous');
    expect(upgrade!.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('autonomy downgrade suggestion when rejection rate is high', () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 20 }, () => makeInteraction('ai_action_approved')),
      ...Array.from({ length: 30 }, () => makeInteraction('ai_action_rejected')),
    ];
    const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
    const result = engine.analyze();
    expect(result.suggestions.length).toBeGreaterThan(0);
    const downgrade = result.suggestions.find(s => s.title.includes('Downgrade'));
    expect(downgrade).toBeDefined();
    expect(downgrade!.type).toBe('autonomy');
    expect(downgrade!.currentValue).toBe('assisted');
    expect(downgrade!.suggestedValue).toBe('passive');
  });

  it('profile change suggestion', () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 30 }, () => makeInteraction('feature_used', {
        metadata: { profileId: 'tech-lead' },
      })),
      ...Array.from({ length: 20 }, () => makeInteraction('ai_action_approved')),
    ];
    const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
    const result = engine.analyze();
    const profileSuggestion = result.suggestions.find(s => s.type === 'profile');
    expect(profileSuggestion).toBeDefined();
    expect(profileSuggestion!.currentValue).toBe('solo-dev');
    expect(profileSuggestion!.suggestedValue).toBe('tech-lead');
  });

  it('multiple suggestions together', () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 45 }, () => makeInteraction('ai_action_approved')),
      ...Array.from({ length: 5 }, () => makeInteraction('ai_action_rejected')),
      ...Array.from({ length: 10 }, () => makeInteraction('high_risk_action_accepted')),
      ...Array.from({ length: 14 }, () => makeInteraction('notification_dismissed')),
      ...Array.from({ length: 6 }, () => makeInteraction('notification_received')),
      ...Array.from({ length: 20 }, () => makeInteraction('command_run', {
        metadata: { command: 'build' },
      })),
      ...Array.from({ length: 20 }, () => makeInteraction('command_run', {
        metadata: { command: 'test' },
      })),
      ...Array.from({ length: 20 }, () => makeInteraction('command_run', {
        metadata: { command: 'lint' },
      })),
    ];
    const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
    const result = engine.analyze();
    expect(result.suggestions.length).toBeGreaterThan(1);
  });

  it('confidence scoring', () => {
    const highConfInteractions: Interaction[] = [
      ...Array.from({ length: 90 }, () => makeInteraction('ai_action_approved')),
      ...Array.from({ length: 10 }, () => makeInteraction('ai_action_rejected')),
    ];
    const engine1 = new AdaptiveSuggestions(highConfInteractions, 'solo-dev', 'assisted');
    const result1 = engine1.analyze();
    const upgrade = result1.suggestions.find(s => s.title.includes('Upgrade'));
    expect(upgrade).toBeDefined();
    expect(upgrade!.confidence).toBeGreaterThanOrEqual(0.85);

    const lowConfInteractions: Interaction[] = [
      ...Array.from({ length: 41 }, () => makeInteraction('ai_action_approved')),
      ...Array.from({ length: 9 }, () => makeInteraction('ai_action_rejected')),
    ];
    const engine2 = new AdaptiveSuggestions(lowConfInteractions, 'solo-dev', 'assisted');
    const result2 = engine2.analyze();
    const upgrade2 = result2.suggestions.find(s => s.title.includes('Upgrade'));
    expect(upgrade2).toBeDefined();
    expect(upgrade2!.confidence).toBeLessThan(upgrade!.confidence);
  });

  it('mark suggestion as applied', () => {
    const interactions: Interaction[] = [
      ...Array.from({ length: 45 }, () => makeInteraction('ai_action_approved')),
      ...Array.from({ length: 5 }, () => makeInteraction('ai_action_rejected')),
    ];
    const engine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
    const result = engine.analyze();
    expect(result.suggestions.length).toBeGreaterThan(0);
    const suggestionId = result.suggestions[0].id;
    expect(engine.getSuggestions()[0].applied).toBe(false);
    const marked = engine.markApplied(suggestionId);
    expect(marked).toBe(true);
    expect(engine.getSuggestions()[0].applied).toBe(true);

    const notFound = engine.markApplied('nonexistent-id');
    expect(notFound).toBe(false);
  });
});
