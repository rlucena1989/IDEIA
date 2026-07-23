import { describe, it, expect } from '@jest/globals';
import { prioritizeContexts } from '../context-prioritizer';
import { OperationalContext } from '../context-types';

function makeCtx(overrides: Partial<OperationalContext>): OperationalContext {
  return {
    contextId: 'c1', name: 'Test', type: 'product', status: 'active', priority: 5,
    source: 'test', tags: [], dependencies: [], summary: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('context-prioritizer', () => {
  it('prioritizeContexts should be defined', () => {
    expect(prioritizeContexts).toBeDefined();
  });

  it('should return sorted results', () => {
    const ctxs = [
      makeCtx({ contextId: 'a', name: 'A', priority: 1 }),
      makeCtx({ contextId: 'b', name: 'B', priority: 10 }),
    ];
    const results = prioritizeContexts(ctxs);
    expect(results[0].name).toBe('B');
    expect(results[1].name).toBe('A');
  });

  it('should penalize blocked contexts', () => {
    const ctxs = [
      makeCtx({ contextId: 'a', name: 'Active', priority: 10 }),
      makeCtx({ contextId: 'b', name: 'Blocked', status: 'blocked', priority: 10 }),
    ];
    const results = prioritizeContexts(ctxs);
    expect(results[0].name).toBe('Active');
  });

  it('should reward contexts with dependencies', () => {
    const ctxs = [
      makeCtx({ contextId: 'a', name: 'No deps', priority: 5 }),
      makeCtx({ contextId: 'b', name: 'Has deps', priority: 5, dependencies: ['a', 'b'] }),
    ];
    const results = prioritizeContexts(ctxs);
    expect(results[0].name).toBe('Has deps');
  });
});
