import { describe, it, expect } from '@jest/globals';
import { analyzePatterns } from '../pattern-analyzer';
import { OperationalEvent } from '../pattern-types';

function makeEvent(overrides: Partial<OperationalEvent>): OperationalEvent {
  return {
    eventId: 'e1',
    type: 'consistency',
    command: 'test',
    outcome: 'ok',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('pattern-analyzer', () => {
  it('analyzePatterns should be defined', () => {
    expect(analyzePatterns).toBeDefined();
  });

  it('should return empty for no events', () => {
    expect(analyzePatterns([])).toEqual([]);
  });

  it('should detect inconsistency pattern with 3+ warnings', () => {
    const events = [
      makeEvent({ type: 'consistency', outcome: 'warning' }),
      makeEvent({ type: 'consistency', outcome: 'warning' }),
      makeEvent({ type: 'consistency', outcome: 'warning' }),
    ];
    const patterns = analyzePatterns(events);
    expect(patterns.some(p => p.patternId === 'pattern-consistency-docs')).toBe(true);
  });

  it('should detect repair loop with 2+ repair commands', () => {
    const events = [
      makeEvent({ type: 'evolution', command: 'evolve run repair', outcome: 'ok' }),
      makeEvent({ type: 'evolution', command: 'evolve run repair', outcome: 'ok' }),
    ];
    const patterns = analyzePatterns(events);
    expect(patterns.some(p => p.patternId === 'pattern-repair-loop')).toBe(true);
  });

  it('should detect blocked execution pattern with 3+ blocks', () => {
    const events = [
      makeEvent({ outcome: 'blocked' }),
      makeEvent({ outcome: 'blocked' }),
      makeEvent({ outcome: 'blocked' }),
    ];
    const patterns = analyzePatterns(events);
    expect(patterns.some(p => p.patternId === 'pattern-blocked-execution')).toBe(true);
  });

  it('should detect generation failure pattern with 2+ failures', () => {
    const events = [
      makeEvent({ type: 'generation', outcome: 'failed' }),
      makeEvent({ type: 'generation', outcome: 'failed' }),
    ];
    const patterns = analyzePatterns(events);
    expect(patterns.some(p => p.patternId === 'pattern-generation-failure')).toBe(true);
  });
});
