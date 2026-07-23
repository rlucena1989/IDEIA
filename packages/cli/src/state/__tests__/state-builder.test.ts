import { describe, it, expect } from '@jest/globals';
import { buildDevkitState } from '../state-builder';

describe('state-builder', () => {
  it('buildDevkitState should be defined', () => {
    expect(buildDevkitState).toBeDefined();
  });

  it('should return a valid DevkitState object', () => {
    const state = buildDevkitState();
    expect(state).toBeDefined();
    expect(typeof state.version).toBe('string');
    expect(typeof state.lastUpdated).toBe('string');
    expect(typeof state.summary).toBe('string');
  });

  it('should have at least one block', () => {
    const state = buildDevkitState();
    expect(state.blocks.length).toBeGreaterThan(0);
  });

  it('should have metrics defined', () => {
    const state = buildDevkitState();
    expect(state.metrics.length).toBeGreaterThan(0);
  });

  it('should have commands with status', () => {
    const state = buildDevkitState();
    for (const cmd of state.commands) {
      expect(['active', 'deprecated', 'planned']).toContain(cmd.status);
    }
  });

  it('each block should have valid status', () => {
    const state = buildDevkitState();
    for (const block of state.blocks) {
      expect(['done', 'partial', 'blocked', 'experimental']).toContain(block.status);
    }
  });
});
