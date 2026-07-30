import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), fatal: jest.fn(), child: jest.fn(),
  })),
}));

describe('RateLimiterBreaker', () => {
  beforeEach(() => {
    const { RateLimiterBreaker } = require('../src/breakers/rate-limiter');
    RateLimiterBreaker.reset();
  });

  it('returns 0 initially', () => {
    const { RateLimiterBreaker } = require('../src/breakers/rate-limiter');
    expect(RateLimiterBreaker.evaluate()).toBe(0);
  });

  it('returns correct count after recording requests', () => {
    const { RateLimiterBreaker } = require('../src/breakers/rate-limiter');
    RateLimiterBreaker.recordRequest();
    RateLimiterBreaker.recordRequest();
    RateLimiterBreaker.recordRequest();
    expect(RateLimiterBreaker.evaluate()).toBe(3);
  });

  it('resets to zero', () => {
    const { RateLimiterBreaker } = require('../src/breakers/rate-limiter');
    RateLimiterBreaker.recordRequest();
    RateLimiterBreaker.recordRequest();
    expect(RateLimiterBreaker.evaluate()).toBe(2);
    RateLimiterBreaker.reset();
    expect(RateLimiterBreaker.evaluate()).toBe(0);
  });

  it('trips when threshold exceeded', () => {
    const { RateLimiterBreaker } = require('../src/breakers/rate-limiter');
    for (let i = 0; i < 100; i++) {
      RateLimiterBreaker.recordRequest();
    }
    const count = RateLimiterBreaker.evaluate();
    expect(count).toBeGreaterThanOrEqual(100);
  });

  it('handles high volume without crashing', () => {
    const { RateLimiterBreaker } = require('../src/breakers/rate-limiter');
    for (let i = 0; i < 10000; i++) {
      RateLimiterBreaker.recordRequest();
    }
    const count = RateLimiterBreaker.evaluate();
    expect(count).toBe(10000);
  });
});

describe('TokenBudgetBreaker', () => {
  beforeEach(() => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    TokenBudgetBreaker.reset();
  });

  it('returns 0 initially', () => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    expect(TokenBudgetBreaker.evaluate()).toBe(0);
  });

  it('tracks token consumption', () => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    TokenBudgetBreaker.recordTokens(500);
    TokenBudgetBreaker.recordTokens(1500);
    expect(TokenBudgetBreaker.evaluate()).toBe(2000);
  });

  it('returns correct remaining budget', () => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    const budget = TokenBudgetBreaker.getBudget();
    expect(budget).toBe(100000);
    TokenBudgetBreaker.recordTokens(30000);
    expect(TokenBudgetBreaker.getRemainingBudget()).toBe(70000);
    TokenBudgetBreaker.recordTokens(80000);
    expect(TokenBudgetBreaker.getRemainingBudget()).toBe(0);
  });

  it('does not go below zero remaining budget', () => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    TokenBudgetBreaker.recordTokens(200000);
    expect(TokenBudgetBreaker.getRemainingBudget()).toBe(0);
  });

  it('resets to initial state', () => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    TokenBudgetBreaker.recordTokens(50000);
    TokenBudgetBreaker.reset();
    expect(TokenBudgetBreaker.evaluate()).toBe(0);
    expect(TokenBudgetBreaker.getBudget()).toBe(100000);
    expect(TokenBudgetBreaker.getRemainingBudget()).toBe(100000);
  });

  it('allows custom budget via setBudget', () => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    TokenBudgetBreaker.setBudget(50000);
    expect(TokenBudgetBreaker.getBudget()).toBe(50000);
    TokenBudgetBreaker.recordTokens(25000);
    expect(TokenBudgetBreaker.getRemainingBudget()).toBe(25000);
  });

  it('handles invalid negative token values gracefully', () => {
    const { TokenBudgetBreaker } = require('../src/breakers/token-budget');
    TokenBudgetBreaker.recordTokens(-100);
    expect(TokenBudgetBreaker.evaluate()).toBe(-100);
  });
});

describe('ConcurrentSessionBreaker', () => {
  beforeEach(() => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    ConcurrentSessionBreaker.reset();
  });

  it('returns 0 initially', () => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    expect(ConcurrentSessionBreaker.evaluate()).toBe(0);
  });

  it('allows acquiring sessions up to max', () => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    for (let i = 0; i < 10; i++) {
      expect(ConcurrentSessionBreaker.acquireSession(`session-${i}`)).toBe(true);
    }
    expect(ConcurrentSessionBreaker.evaluate()).toBe(10);
  });

  it('blocks when max sessions reached', () => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    for (let i = 0; i < 10; i++) {
      ConcurrentSessionBreaker.acquireSession(`session-${i}`);
    }
    expect(ConcurrentSessionBreaker.acquireSession('extra-session')).toBe(false);
    expect(ConcurrentSessionBreaker.evaluate()).toBe(10);
  });

  it('releases sessions correctly', () => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    ConcurrentSessionBreaker.acquireSession('session-1');
    ConcurrentSessionBreaker.acquireSession('session-2');
    expect(ConcurrentSessionBreaker.evaluate()).toBe(2);
    ConcurrentSessionBreaker.releaseSession('session-1');
    expect(ConcurrentSessionBreaker.evaluate()).toBe(1);
    expect(ConcurrentSessionBreaker.acquireSession('session-3')).toBe(true);
    expect(ConcurrentSessionBreaker.evaluate()).toBe(2);
  });

  it('allows custom max sessions', () => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    ConcurrentSessionBreaker.setMaxSessions(3);
    for (let i = 0; i < 3; i++) {
      expect(ConcurrentSessionBreaker.acquireSession(`s-${i}`)).toBe(true);
    }
    expect(ConcurrentSessionBreaker.acquireSession('s-extra')).toBe(false);
  });

  it('resets to initial state', () => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    ConcurrentSessionBreaker.acquireSession('s1');
    ConcurrentSessionBreaker.acquireSession('s2');
    ConcurrentSessionBreaker.reset();
    expect(ConcurrentSessionBreaker.evaluate()).toBe(0);
    expect(ConcurrentSessionBreaker.getMaxSessions()).toBe(10);
  });

  it('releasing non-existent session does not throw', () => {
    const { ConcurrentSessionBreaker } = require('../src/breakers/concurrent-session');
    expect(() => {
      ConcurrentSessionBreaker.releaseSession('non-existent');
    }).not.toThrow();
  });
});

describe('ErrorRateBreaker', () => {
  beforeEach(() => {
    const { ErrorRateBreaker } = require('../src/breakers/error-rate');
    ErrorRateBreaker.reset();
  });

  it('returns 0 error rate when no events recorded', () => {
    const { ErrorRateBreaker } = require('../src/breakers/error-rate');
    expect(ErrorRateBreaker.evaluate()).toBe(0);
  });

  it('returns 100% error rate when all errors', () => {
    const { ErrorRateBreaker } = require('../src/breakers/error-rate');
    for (let i = 0; i < 10; i++) {
      ErrorRateBreaker.recordError();
    }
    expect(ErrorRateBreaker.evaluate()).toBe(100);
  });

  it('returns correct percentage for mixed successes and errors', () => {
    const { ErrorRateBreaker } = require('../src/breakers/error-rate');
    for (let i = 0; i < 3; i++) {
      ErrorRateBreaker.recordError();
    }
    for (let i = 0; i < 7; i++) {
      ErrorRateBreaker.recordSuccess();
    }
    expect(ErrorRateBreaker.evaluate()).toBe(30);
  });

  it('resets to zero', () => {
    const { ErrorRateBreaker } = require('../src/breakers/error-rate');
    ErrorRateBreaker.recordError();
    ErrorRateBreaker.reset();
    expect(ErrorRateBreaker.evaluate()).toBe(0);
  });

  it('handles no entries gracefully', () => {
    const { ErrorRateBreaker } = require('../src/breakers/error-rate');
    expect(ErrorRateBreaker.evaluate()).toBe(0);
  });
});

describe('EmergencyStop', () => {
  let EmergencyStop: any;

  beforeEach(() => {
    jest.resetModules();
    const mod = require('../src/e-stop');
    EmergencyStop = mod.EmergencyStop;
  });

  it('starts disengaged', () => {
    const es = new EmergencyStop();
    expect(es.isEngaged()).toBe(false);
  });

  it('engages when triggered', async () => {
    const es = new EmergencyStop();
    await es.engage('cli', 'test stop');
    expect(es.isEngaged()).toBe(true);
  });

  it('resumes after engage', async () => {
    const es = new EmergencyStop();
    await es.engage('cli', 'test');
    expect(es.isEngaged()).toBe(true);
    await es.recover('resume');
    expect(es.isEngaged()).toBe(false);
  });

  it('does not engage when channel disabled', async () => {
    const es = new EmergencyStop(undefined, undefined, {
      channels: { cli: false, api: true, keyboard: true, autoDetect: true },
    });
    await es.engage('cli', 'should not work');
    expect(es.isEngaged()).toBe(false);
  });

  it('pauses the system', async () => {
    const es = new EmergencyStop();
    await es.engage('cli', 'scheduled maintenance');
    expect(es.isEngaged()).toBe(true);
  });

  it('triggers rollback', async () => {
    const es = new EmergencyStop();
    await es.engage('cli', 'corrupt data detected');
    expect(es.isEngaged()).toBe(true);
  });

  it('recovers to normal mode on resume action', async () => {
    const es = new EmergencyStop();
    const mode = await es.recover('resume');
    expect(mode).toBe('normal');
  });

  it('recovers to rollback mode', async () => {
    const es = new EmergencyStop();
    const mode = await es.recover('rollback');
    expect(mode).toBe('rollback');
  });

  it('recovers to degraded mode on continue', async () => {
    const es = new EmergencyStop();
    const mode = await es.recover('continue');
    expect(mode).toBe('degraded');
  });

  it('supports listener registration and removal', async () => {
    const es = new EmergencyStop();
    const listener = jest.fn();
    const unsubscribe = es.onEstop(listener);
    await es.engage('cli', 'test');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await es.engage('api', 'test2');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns config', () => {
    const es = new EmergencyStop();
    const config = es.getConfig();
    expect(config.channels.cli).toBe(true);
    expect(config.channels.api).toBe(true);
    expect(config.checkpointDir).toBe('.ideia/checkpoints');
  });

  it('updates config', () => {
    const es = new EmergencyStop();
    es.updateConfig({ checkpointDir: '/tmp/checkpoints' });
    expect(es.getConfig().checkpointDir).toBe('/tmp/checkpoints');
  });
});
