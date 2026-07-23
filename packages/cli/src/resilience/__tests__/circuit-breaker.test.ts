import { describe, it, expect } from '@jest/globals';
import { createCircuitBreaker, updateCircuitBreaker, resetCircuitBreaker } from '../circuit-breaker';

describe('circuit-breaker', () => {
  it('createCircuitBreaker should create closed breaker', () => {
    const cb = createCircuitBreaker('test');
    expect(cb.open).toBe(false);
    expect(cb.failureCount).toBe(0);
    expect(cb.threshold).toBe(3);
  });

  it('should open after threshold failures', () => {
    let cb = createCircuitBreaker('test', 2);
    cb = updateCircuitBreaker(cb, true);
    cb = updateCircuitBreaker(cb, true);
    expect(cb.open).toBe(true);
    expect(cb.failureCount).toBe(2);
  });

  it('should reset on success', () => {
    let cb = createCircuitBreaker('test', 3);
    cb = updateCircuitBreaker(cb, true);
    cb = updateCircuitBreaker(cb, false);
    expect(cb.open).toBe(false);
    expect(cb.failureCount).toBe(0);
  });

  it('resetCircuitBreaker should reset to closed', () => {
    let cb = createCircuitBreaker('test', 1);
    cb = updateCircuitBreaker(cb, true);
    expect(cb.open).toBe(true);
    cb = resetCircuitBreaker(cb);
    expect(cb.open).toBe(false);
    expect(cb.failureCount).toBe(0);
  });
});
