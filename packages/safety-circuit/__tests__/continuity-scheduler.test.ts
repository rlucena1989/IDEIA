import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ContinuityScheduler, createContinuityScheduler } from '../src/continuity-scheduler';

jest.mock('@ideia/event-bus', () => ({
  EventBus: jest.fn(() => ({ emit: jest.fn() })),
}));
jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => ({ append: jest.fn() })),
}));
jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), fatal: jest.fn(), child: jest.fn(),
  })),
}));

describe('ContinuityScheduler', () => {
  let scheduler: ContinuityScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new ContinuityScheduler();
  });

  afterEach(() => {
    scheduler.dispose();
  });

  it('initial state is not paused', () => {
    const state = scheduler.getState();
    expect(state.paused).toBe(false);
    expect(state.pauseReason).toBeNull();
    expect(state.retriesRemaining).toBe(5);
  });

  it('pause sets paused state and records event', () => {
    const state = scheduler.pause('Testing pause');
    expect(state.paused).toBe(true);
    expect(state.pauseReason).toBe('Testing pause');
    expect(state.pausedAt).not.toBeNull();

    const events = scheduler.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('pause');
  });

  it('pause with autoResume schedules a timer', () => {
    jest.useFakeTimers();
    const autoScheduler = new ContinuityScheduler(undefined, undefined, { autoResume: true, maxPauseMs: 10000 });
    autoScheduler.pause('auto resume');

    expect(autoScheduler.getState().resumesScheduled).toBe(1);

    jest.advanceTimersByTime(10000);
    expect(autoScheduler.getState().paused).toBe(false);
    autoScheduler.dispose();
    jest.useRealTimers();
  });

  it('resume clears paused state', () => {
    scheduler.pause('test');
    expect(scheduler.getState().paused).toBe(true);

    const state = scheduler.resume();
    expect(state.paused).toBe(false);
    expect(state.pauseReason).toBeNull();
    expect(state.resumesExecuted).toBe(1);
  });

  it('resume when not paused returns current state', () => {
    const state = scheduler.resume();
    expect(state.paused).toBe(false);
  });

  it('retry calls operation and returns true on success', async () => {
    const operation = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const result = await scheduler.retry(operation);
    expect(result).toBe(true);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(scheduler.getState().lastError).toBeNull();
  });

  it('retry returns false and records error on failure', async () => {
    const operation = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const result = await scheduler.retry(operation);
    expect(result).toBe(false);
    expect(scheduler.getState().lastError).toContain('Retry 1 failed');
  });

  it('retry beyond maxRetries escalates', async () => {
    const failOp = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    for (let i = 0; i < 5; i++) {
      await scheduler.retry(failOp);
    }
    const result = await scheduler.retry(failOp);
    expect(result).toBe(false);
    expect(scheduler.getState().lastError).toBe('Max retries exceeded');

    const events = scheduler.getEvents();
    expect(events.some(e => e.type === 'escalate')).toBe(true);
  });

  it('successful retry resets the retry counter', async () => {
    const failOp = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const successOp = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);

    await scheduler.retry(failOp);
    expect(scheduler.getState().retriesRemaining).toBe(4);

    await scheduler.retry(successOp);
    expect(scheduler.getState().retriesRemaining).toBe(5);
    expect(scheduler.getState().lastError).toBeNull();
  });

  it('dispose clears events', () => {
    scheduler.pause('test');
    scheduler.dispose();
    expect(scheduler.getEvents()).toEqual([]);
  });

  it('getConfig returns default config', () => {
    const config = scheduler.getConfig();
    expect(config.maxPauseMs).toBe(300000);
    expect(config.maxRetries).toBe(5);
    expect(config.autoResume).toBe(true);
  });

  it('createContinuityScheduler factory works', () => {
    const instance = createContinuityScheduler();
    expect(instance).toBeInstanceOf(ContinuityScheduler);
  });
});
