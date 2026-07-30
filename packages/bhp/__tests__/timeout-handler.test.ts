import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TimeoutHandler, createTimeoutHandler } from '../src/timeout-handler';
import { SessionManager } from '../src/session-manager';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('TimeoutHandler', () => {
  let sessionManager: SessionManager;
  let handler: TimeoutHandler;

  beforeEach(() => {
    jest.useFakeTimers();
    sessionManager = new SessionManager();
    handler = new TimeoutHandler(sessionManager, { responseTimeoutMs: 5000, maxRetries: 2, retryDelayMs: 1000 });
  });

  afterEach(() => {
    handler.dispose();
    jest.useRealTimers();
  });

  it('starts a timer for a session', () => {
    const session = sessionManager.createSession('ia', 'ideia', 'Test');
    expect(() => handler.startTimer(session.id)).not.toThrow();
  });

  it('resolveSession completes the session', () => {
    const session = sessionManager.createSession('ia', 'ideia', 'Test');
    handler.startTimer(session.id);

    const result = handler.resolveSession(session.id);
    expect(result.resolved).toBe(true);
    expect(result.finalStatus).toBe('completed');
    expect(sessionManager.getSession(session.id)!.status).toBe('completed');
  });

  it('cancels the timer', () => {
    const session = sessionManager.createSession('ia', 'ideia', 'Test');
    handler.startTimer(session.id);
    handler.cancelTimer(session.id);
    expect(handler.getRetryCount(session.id)).toBe(0);
  });

  it('refreshes timer when retries remain', () => {
    const session = sessionManager.createSession('ia', 'ideia', 'Test');
    handler.startTimer(session.id);
    handler.refreshTimer(session.id);
    expect(handler.getRetryCount(session.id)).toBe(0);
  });

  it('dispose cleans up all timers', () => {
    const session = sessionManager.createSession('ia', 'ideia', 'Test');
    handler.startTimer(session.id);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('createTimeoutHandler factory works', () => {
    expect(createTimeoutHandler(sessionManager)).toBeInstanceOf(TimeoutHandler);
  });
});
