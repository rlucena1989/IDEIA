import { describe, it, expect } from '@jest/globals';
import { resolveFallback } from '../fallback-policy';
import { OperationalFailure } from '../failure-types';

function makeFailure(overrides: Partial<OperationalFailure>): OperationalFailure {
  return {
    failureId: 'f1', type: 'execution', source: 'test', message: 'test',
    severity: 'high', occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('fallback-policy', () => {
  it('resolveFallback should be defined', () => {
    expect(resolveFallback).toBeDefined();
  });

  it('should block critical failures', () => {
    const fb = resolveFallback(makeFailure({ severity: 'critical', type: 'critical' }));
    expect(fb.action).toBe('block');
    expect(fb.allowed).toBe(false);
  });

  it('should retry transient failures', () => {
    const fb = resolveFallback(makeFailure({ type: 'transient' }));
    expect(fb.action).toBe('retry');
    expect(fb.allowed).toBe(true);
  });

  it('should repair integrity failures', () => {
    const fb = resolveFallback(makeFailure({ type: 'integrity' }));
    expect(fb.action).toBe('repair-mode');
  });

  it('should repair consistency failures', () => {
    const fb = resolveFallback(makeFailure({ type: 'consistency' }));
    expect(fb.action).toBe('repair-mode');
  });

  it('should degrade for other failures', () => {
    const fb = resolveFallback(makeFailure({ type: 'execution' }));
    expect(fb.action).toBe('degrade');
    expect(fb.allowed).toBe(true);
  });
});
