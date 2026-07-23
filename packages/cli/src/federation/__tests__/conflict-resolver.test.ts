import { describe, it, expect } from '@jest/globals';
import { resolveConflict } from '../conflict-resolver';

describe('conflict-resolver', () => {
  it('resolveConflict should be defined', () => {
    expect(resolveConflict).toBeDefined();
  });

  it('should block critical conflicts', () => {
    const r = resolveConflict('version-mismatch', 'critical');
    expect(r.resolved).toBe(false);
    expect(r.action).toBe('review');
  });

  it('should merge low severity', () => {
    const r = resolveConflict('sync-conflict', 'low');
    expect(r.resolved).toBe(true);
    expect(r.action).toBe('merge');
  });

  it('should prefer local for medium/high', () => {
    const r = resolveConflict('sync-conflict', 'medium');
    expect(r.resolved).toBe(true);
    expect(r.action).toBe('prefer-local');
  });
});
