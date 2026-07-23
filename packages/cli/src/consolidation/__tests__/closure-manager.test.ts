import { describe, it, expect } from '@jest/globals';
import { closeCycle } from '../closure-manager';

describe('closure-manager', () => {
  it('closeCycle should be defined', () => {
    expect(closeCycle).toBeDefined();
  });

  it('should close with clean notes when no pending items', () => {
    const c = closeCycle(['item1'], []);
    expect(c.completedItems).toContain('item1');
    expect(c.pendingItems).toEqual([]);
    expect(c.notes).toContain('Cycle closed cleanly.');
  });

  it('should warn when pending items exist', () => {
    const c = closeCycle(['done'], ['todo']);
    expect(c.notes).toContain('Cycle closed with pending items.');
  });
});
