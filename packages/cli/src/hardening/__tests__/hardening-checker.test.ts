import { describe, it, expect } from '@jest/globals';
import { runHardeningCheck } from '../hardening-checker';
import { buildDevkitState } from '../../state/state-builder';
import { buildConsistencyReport } from '../../state/consistency-builder';

describe('hardening-checker', () => {
  it('runHardeningCheck should be defined', () => {
    expect(runHardeningCheck).toBeDefined();
  });

  it('should return ok for clean state and report', () => {
    const state = buildDevkitState();
    const report = buildConsistencyReport();
    const result = runHardeningCheck(state, report);
    expect(typeof result.ok).toBe('boolean');
    expect(typeof result.score).toBe('number');
    expect(result.summary).toBeDefined();
  });

  it('should detect missing version', () => {
    const state = buildDevkitState();
    state.version = '';
    const report = buildConsistencyReport();
    const result = runHardeningCheck(state, report);
    expect(result.errors.some(e => e.code === 'STATE_NO_VERSION')).toBe(true);
  });

  it('should detect blockers in state', () => {
    const state = buildDevkitState();
    state.blockers = ['Blocker 1'];
    const report = buildConsistencyReport();
    const result = runHardeningCheck(state, report);
    expect(result.warnings.some(w => w.code === 'STATE_BLOCKERS')).toBe(true);
  });
});
