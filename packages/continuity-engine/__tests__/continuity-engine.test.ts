import { describe, it, expect } from '@jest/globals';
import { ContinuityEngine } from '../src/continuity-engine';
import { ContinuityScheduler } from '../src/scheduler';

describe('continuity-engine', () => {
  it('ContinuityEngine can be constructed with no deps', () => {
    const engine = new ContinuityEngine();
    expect(engine).toBeDefined();
  });

  it('registerDecision returns an id', () => {
    const engine = new ContinuityEngine();
    const id = engine.registerDecision({ description: 'test', profileMatch: 5 });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getPendingDecisions returns registered decisions', () => {
    const engine = new ContinuityEngine();
    engine.registerDecision({ description: 'test', profileMatch: 5 });
    expect(engine.getPendingDecisions().length).toBeGreaterThan(0);
  });

  it('ContinuityScheduler can be constructed', () => {
    const engine = new ContinuityEngine();
    const scheduler = new ContinuityScheduler(engine, { autoStart: false });
    expect(scheduler).toBeDefined();
    expect(scheduler.isRunning()).toBe(false);
  });
});
