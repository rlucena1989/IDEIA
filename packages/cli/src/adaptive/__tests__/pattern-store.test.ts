import { describe, it, expect } from '@jest/globals';
import { PatternStore } from '../pattern-store';
import { OperationalEvent, OperationalPattern } from '../pattern-types';

describe('pattern-store', () => {
  it('should add and list events', () => {
    const store = new PatternStore();
    const event: OperationalEvent = {
      eventId: 'e1', type: 'state', command: 'check',
      outcome: 'ok', createdAt: new Date().toISOString(),
    };
    store.addEvent(event);
    expect(store.listEvents()).toHaveLength(1);
  });

  it('should create and add event with generated id', () => {
    const store = new PatternStore();
    const event = store.createAndAddEvent({
      type: 'generation', command: 'generate', outcome: 'ok',
    });
    expect(event.eventId).toBeDefined();
    expect(event.type).toBe('generation');
    expect(event.outcome).toBe('ok');
  });

  it('should create event with optional scores and metadata', () => {
    const store = new PatternStore();
    const event = store.createAndAddEvent({
      type: 'hardening', command: 'harden', outcome: 'warning',
      scoreBefore: 0.5, scoreAfter: 0.3,
      metadata: { attempts: 2, partial: true },
    });
    expect(event.scoreBefore).toBeCloseTo(0.5);
    expect(event.metadata!.attempts).toBe(2);
  });

  it('should set and list patterns', () => {
    const store = new PatternStore();
    const patterns: OperationalPattern[] = [{
      patternId: 'p1', name: 'P1', description: '', frequency: 1,
      confidence: 0.9, impact: 'high', triggers: [], recommendedAction: 'repair',
    }];
    store.setPatterns(patterns);
    expect(store.listPatterns()).toHaveLength(1);
  });

  it('should clear all data', () => {
    const store = new PatternStore();
    store.createAndAddEvent({ type: 'state', command: 'check', outcome: 'ok' });
    store.setPatterns([{
      patternId: 'p1', name: 'P1', description: '', frequency: 1,
      confidence: 0.9, impact: 'high', triggers: [], recommendedAction: 'repair',
    }]);
    store.clear();
    expect(store.listEvents()).toHaveLength(0);
    expect(store.listPatterns()).toHaveLength(0);
  });

  it('should return copies from list methods', () => {
    const store = new PatternStore();
    store.createAndAddEvent({ type: 'state', command: 'check', outcome: 'ok' });
    const events = store.listEvents();
    events.push({ eventId: 'fake', type: 'state', command: '', outcome: 'ok', createdAt: '' });
    expect(store.listEvents()).toHaveLength(1);
  });

  it('should handle empty store gracefully', () => {
    const store = new PatternStore();
    expect(store.listEvents()).toEqual([]);
    expect(store.listPatterns()).toEqual([]);
  });
});
