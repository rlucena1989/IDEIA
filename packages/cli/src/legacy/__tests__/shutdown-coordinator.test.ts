import { describe, it, expect } from '@jest/globals';
import { shutdownSystem, confirmShutdown } from '../shutdown-coordinator';
import { freezeLegacy } from '../freeze-manager';

describe('shutdown-coordinator', () => {
  it('shutdownSystem should be defined', () => {
    expect(shutdownSystem).toBeDefined();
  });

  it('should set status to shutdown', () => {
    const state = freezeLegacy(['memory']);
    const result = shutdownSystem(state);
    expect(result.status).toBe('shutdown');
    expect(result.notes.length).toBeGreaterThan(state.notes.length);
  });

  it('confirmShutdown should return true after shutdown', () => {
    const state = freezeLegacy(['memory']);
    const shutdown = shutdownSystem(state);
    expect(confirmShutdown(shutdown)).toBe(true);
  });

  it('confirmShutdown should return false before shutdown', () => {
    const state = freezeLegacy(['memory']);
    expect(confirmShutdown(state)).toBe(false);
  });
});
