import { describe, it, expect } from '@jest/globals';
import { mergeContexts } from '../context-merge';

describe('context-merge', () => {
  it('mergeContexts should be defined', () => {
    expect(mergeContexts).toBeDefined();
  });

  it('should merge fields from multiple contexts', () => {
    const ctxs = [
      { name: 'CLI', priority: 10 },
      { type: 'product', version: '2.0' },
    ];
    const result = mergeContexts(ctxs, ['ctx-1', 'ctx-2']);
    expect(result.sources.length).toBe(2);
    expect(Object.keys(result.fields).length).toBe(4);
    expect(result.fields['name'].value).toBe('CLI');
    expect(result.fields['type'].value).toBe('product');
    expect(result.fields['version'].value).toBe('2.0');
  });

  it('should preserve first occurrence on conflict', () => {
    const ctxs = [
      { name: 'First', priority: 10 },
      { name: 'Second', priority: 5 },
    ];
    const result = mergeContexts(ctxs, ['ctx-1', 'ctx-2']);
    expect(result.fields['name'].value).toBe('First');
    expect(result.fields['name'].sourceContextId).toBe('ctx-1');
  });
});
