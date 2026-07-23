import { describe, it, expect } from '@jest/globals';
import { validateState } from '../state-validator';
import { buildDevkitState } from '../state-builder';

describe('state-validator', () => {
  it('validateState should be defined', () => {
    expect(validateState).toBeDefined();
  });

  it('should validate a built state as valid', () => {
    const state = buildDevkitState();
    const result = validateState(state);
    expect(result.valid).toBe(true);
  });

  it('should report errors for missing version', () => {
    const state = buildDevkitState();
    state.version = '';
    const result = validateState(state);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });

  it('should report errors for empty blocks', () => {
    const state = buildDevkitState();
    state.blocks = [];
    const result = validateState(state);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('block'))).toBe(true);
  });

  it('should warn about blockers', () => {
    const state = buildDevkitState();
    state.blockers = ['Algo pendente'];
    const result = validateState(state);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should warn about empty summary', () => {
    const state = buildDevkitState();
    state.summary = '';
    const result = validateState(state);
    expect(result.warnings.some(w => w.includes('summary'))).toBe(true);
  });
});
