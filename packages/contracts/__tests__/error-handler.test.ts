import { describe, it, expect, jest } from '@jest/globals';
import { setFatalErrorHandler, setupGlobalErrorHandlers } from '../src/error-handler';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('error-handler', () => {
  it('setFatalErrorHandler accepts null', () => {
    expect(() => setFatalErrorHandler(null)).not.toThrow();
  });

  it('setFatalErrorHandler accepts a function', () => {
    const handler = jest.fn();
    expect(() => setFatalErrorHandler(handler)).not.toThrow();
    setFatalErrorHandler(null);
  });

  it('setupGlobalErrorHandlers registers process handlers', () => {
    const originalUncaught = process.listeners('uncaughtException').length;
    const originalRejection = process.listeners('unhandledRejection').length;

    setupGlobalErrorHandlers(false);

    expect(process.listeners('uncaughtException').length).toBeGreaterThan(originalUncaught);
    expect(process.listeners('unhandledRejection').length).toBeGreaterThan(originalRejection);

    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
  });
});
