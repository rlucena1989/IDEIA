import { describe, it, expect } from '@jest/globals';
import { publishContext } from '../context-publisher';
import { OperationalContext } from '../context-types';

describe('context-publisher', () => {
  it('publishContext should be defined', () => {
    expect(publishContext).toBeDefined();
  });

  it('should publish to cli target', () => {
    const ctx: OperationalContext = {
      contextId: 'c1', name: 'Test', type: 'product', status: 'active', priority: 5,
      source: 'test', tags: [], dependencies: [], summary: 'Resumo do contexto',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const result = publishContext(ctx, 'cli');
    expect(result.contextId).toBe('c1');
    expect(result.target).toBe('cli');
    expect(result.summary).toBe('Resumo do contexto');
  });

  it('should publish to json target', () => {
    const ctx: OperationalContext = {
      contextId: 'c2', name: 'Test 2', type: 'extension', status: 'active', priority: 3,
      source: 'ext', tags: [], dependencies: [], summary: 'Extensão',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const result = publishContext(ctx, 'json');
    expect(result.target).toBe('json');
  });
});
