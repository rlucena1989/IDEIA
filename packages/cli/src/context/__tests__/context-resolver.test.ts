import { describe, it, expect } from '@jest/globals';
import { resolveActiveContext } from '../context-resolver';
import { OperationalContext } from '../context-types';

function makeCtx(overrides: Partial<OperationalContext>): OperationalContext {
  return {
    contextId: 'c1', name: 'Test', type: 'product', status: 'active', priority: 5,
    source: 'test', tags: [], dependencies: [], summary: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('context-resolver', () => {
  it('resolveActiveContext should be defined', () => {
    expect(resolveActiveContext).toBeDefined();
  });

  it('should return undefined for empty list', () => {
    expect(resolveActiveContext([])).toBeUndefined();
  });

  it('should skip archived contexts', () => {
    const ctxs = [
      makeCtx({ contextId: 'a', status: 'archived', priority: 10 }),
      makeCtx({ contextId: 'b', status: 'active', priority: 5 }),
    ];
    const result = resolveActiveContext(ctxs);
    expect(result?.contextId).toBe('b');
  });

  it('should pick highest priority non-archived', () => {
    const ctxs = [
      makeCtx({ contextId: 'low', priority: 1 }),
      makeCtx({ contextId: 'high', priority: 10 }),
    ];
    const result = resolveActiveContext(ctxs);
    expect(result?.contextId).toBe('high');
  });

  it('should deprioritize blocked contexts', () => {
    const ctxs = [
      makeCtx({ contextId: 'blocked', status: 'blocked', priority: 10 }),
      makeCtx({ contextId: 'active', status: 'active', priority: 5 }),
    ];
    const result = resolveActiveContext(ctxs);
    expect(result?.contextId).toBe('active');
  });
});
