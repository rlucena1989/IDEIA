import { describe, it, expect } from '@jest/globals';
import { freezeLegacy } from '../freeze-manager';

describe('freeze-manager', () => {
  it('freezeLegacy should be defined', () => {
    expect(freezeLegacy).toBeDefined();
  });

  it('should create frozen state with items', () => {
    const state = freezeLegacy(['memory', 'docs']);
    expect(state.status).toBe('frozen');
    expect(state.legacyId).toContain('legacy-');
    expect(state.preservedItems).toEqual(['memory', 'docs']);
    expect(state.notes.length).toBeGreaterThan(0);
  });

  it('should handle empty items', () => {
    const state = freezeLegacy([]);
    expect(state.preservedItems).toEqual([]);
    expect(state.status).toBe('frozen');
  });
});
