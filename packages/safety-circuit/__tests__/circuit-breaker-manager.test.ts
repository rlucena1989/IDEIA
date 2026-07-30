import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CircuitBreakerManager } from '../src/circuit-breaker-manager';
import { BreakerType } from '../src/types';

jest.mock('@ideia/event-bus', () => ({
  EventBus: jest.fn(() => ({ emit: jest.fn() })),
}));
jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => ({ append: jest.fn().mockReturnValue({ eventId: 'mock', timestamp: new Date().toISOString() }) })),
}));
jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), fatal: jest.fn(), child: jest.fn(),
  })),
}));

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CircuitBreakerManager();
  });

  it('constructs with 5 default breakers', () => {
    const configs = manager.getConfigs();
    expect(configs).toHaveLength(5);
    const types = configs.map(c => c.type);
    expect(types).toEqual(['error-rate', 'throughput', 'latency', 'memory', 'rollback-rate']);
  });

  it('getStates returns initial untripped states', () => {
    const states = manager.getStates();
    expect(states).toHaveLength(5);
    for (const s of states) {
      expect(s.tripped).toBe(false);
      expect(s.currentValue).toBe(0);
    }
  });

  it('evaluateSingle under threshold returns not tripped', async () => {
    const result = await manager.evaluateSingle('error-rate', 5);
    expect(result.tripped).toBe(false);
    expect(result.breakerType).toBe('error-rate');
  });

  it('evaluateSingle over threshold trips the breaker', async () => {
    const result = await manager.evaluateSingle('error-rate', 15);
    expect(result.tripped).toBe(true);
    expect(result.action).toBe('stop');

    const states = manager.getStates();
    const errorBreaker = states.find(s => s.type === 'error-rate');
    expect(errorBreaker?.tripped).toBe(true);
    expect(errorBreaker?.trippedAt).toBeGreaterThan(0);
    expect(errorBreaker?.cooldownUntil).toBeGreaterThan(Date.now());
  });

  it('evaluateSingle on disabled breaker returns untripped', async () => {
    manager.updateConfig({ type: 'throughput', enabled: false, threshold: 50, cooldownMs: 300000, action: 'throttle' });
    const result = await manager.evaluateSingle('throughput', 100);
    expect(result.tripped).toBe(false);
    expect(result.reason).toContain('disabled');
  });

  it('tripped breaker in cooldown remains tripped', async () => {
    await manager.evaluateSingle('latency', 15000);
    const result = await manager.evaluateSingle('latency', 0);
    expect(result.tripped).toBe(true);
    expect(result.reason).toContain('cooldown');
  });

  it('tripped breaker after cooldown resets and re-evaluates', async () => {
    jest.useFakeTimers();
    await manager.evaluateSingle('memory', 90);
    let states = manager.getStates();
    expect(states.find(s => s.type === 'memory')?.tripped).toBe(true);

    jest.advanceTimersByTime(200000);

    const result = await manager.evaluateSingle('memory', 10);
    expect(result.tripped).toBe(false);

    states = manager.getStates();
    expect(states.find(s => s.type === 'memory')?.tripped).toBe(false);
    jest.useRealTimers();
  });

  it('resetBreaker clears tripped state', async () => {
    await manager.evaluateSingle('rollback-rate', 5);
    expect(manager.getStates().find(s => s.type === 'rollback-rate')?.tripped).toBe(true);
    manager.resetBreaker('rollback-rate');
    const state = manager.getStates().find(s => s.type === 'rollback-rate');
    expect(state?.tripped).toBe(false);
    expect(state?.trippedAt).toBeNull();
    expect(state?.cooldownUntil).toBeNull();
  });

  it('resetAll clears all breakers', async () => {
    await manager.evaluateSingle('error-rate', 15);
    await manager.evaluateSingle('throughput', 60);
    manager.resetAll();
    for (const s of manager.getStates()) {
      expect(s.tripped).toBe(false);
    }
  });

  it('updateConfig changes threshold', () => {
    manager.updateConfig({ type: 'error-rate', enabled: true, threshold: 20, cooldownMs: 300000, action: 'stop' });
    const configs = manager.getConfigs();
    const errorCfg = configs.find(c => c.type === 'error-rate');
    expect(errorCfg?.threshold).toBe(20);
  });

  it('evaluateAll runs all 5 breakers', async () => {
    const results = await manager.evaluateAll();
    expect(results).toHaveLength(5);
  });

  it('unknown breaker type returns untripped fallback', async () => {
    const result = await manager.evaluateSingle('unknown-breaker' as BreakerType, 10);
    expect(result.tripped).toBe(false);
    expect(result.reason).toContain('not found');
  });
});
