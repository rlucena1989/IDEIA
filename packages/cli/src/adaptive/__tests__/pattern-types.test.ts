import { describe, it, expect } from '@jest/globals';
import { OperationalEvent, OperationalPattern } from '../pattern-types';

describe('pattern-types', () => {
  it('should create a valid OperationalEvent', () => {
    const event: OperationalEvent = {
      eventId: 'evt-1',
      type: 'state',
      command: 'check',
      outcome: 'ok',
      createdAt: new Date().toISOString(),
    };
    expect(event.type).toBe('state');
    expect(event.outcome).toBe('ok');
  });

  it('should support all event types', () => {
    const types: OperationalEvent['type'][] = ['state', 'consistency', 'hardening', 'generation', 'evolution'];
    for (const t of types) {
      const e: OperationalEvent = { eventId: `e-${t}`, type: t, command: '', outcome: 'ok', createdAt: '' };
      expect(e.type).toBe(t);
    }
  });

  it('should support all outcome values', () => {
    const outcomes: OperationalEvent['outcome'][] = ['ok', 'warning', 'blocked', 'failed'];
    for (const o of outcomes) {
      const e: OperationalEvent = { eventId: `e-${o}`, type: 'state', command: '', outcome: o, createdAt: '' };
      expect(e.outcome).toBe(o);
    }
  });

  it('should support optional scores and metadata', () => {
    const event: OperationalEvent = {
      eventId: 'evt-2', type: 'generation', command: 'generate', outcome: 'warning',
      scoreBefore: 0.9, scoreAfter: 0.6,
      createdAt: '', metadata: { attempts: 3, reason: 'low_quality' },
    };
    expect(event.scoreBefore).toBeCloseTo(0.9);
    expect(event.metadata!.attempts).toBe(3);
  });

  it('should create a valid OperationalPattern', () => {
    const pattern: OperationalPattern = {
      patternId: 'p-1',
      name: 'Degradation Pattern',
      description: 'Score drops detected',
      frequency: 5,
      confidence: 0.85,
      impact: 'high',
      triggers: ['score_after < score_before'],
      recommendedAction: 'repair',
    };
    expect(pattern.frequency).toBe(5);
    expect(pattern.confidence).toBeCloseTo(0.85);
    expect(pattern.impact).toBe('high');
  });

  it('should support all pattern recommended actions', () => {
    const actions: OperationalPattern['recommendedAction'][] = ['generate', 'repair', 'sync', 'review', 'block', 'defer'];
    for (const a of actions) {
      const p: OperationalPattern = {
        patternId: `p-${a}`, name: '', description: '', frequency: 0,
        confidence: 0, impact: 'low', triggers: [], recommendedAction: a,
      };
      expect(p.recommendedAction).toBe(a);
    }
  });
});
