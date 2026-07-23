import { describe, it, expect } from '@jest/globals';
import { DecisionEngine } from '../src/decision-engine';
import { BHP } from '../src/bhp';

describe('bhp', () => {
  it('DecisionEngine can be constructed with no deps', () => {
    const engine = new DecisionEngine();
    expect(engine).toBeDefined();
  });

  it('DecisionEngine has required methods', () => {
    const engine = new DecisionEngine();
    expect(typeof engine.evaluate).toBe('function');
    expect(typeof engine.detectConsensus).toBe('function');
  });

  it('BHP class is exported', () => {
    expect(BHP).toBeDefined();
    expect(typeof BHP).toBe('function');
  });
});
