jest.mock('../../io');

describe('Utils - output', () => {
  it('should not throw on printHeader', () => {
    const { printHeader } = require('../output');
    expect(() => printHeader('Test')).not.toThrow();
  });

  it('should not throw on printLine', () => {
    const { printLine } = require('../output');
    expect(() => printLine('test')).not.toThrow();
  });

  it('should not throw on printResult', () => {
    const { printResult } = require('../output');
    expect(() => printResult('label', true)).not.toThrow();
  });

  it('should have finish function', () => {
    const { finish } = require('../output');
    expect(typeof finish).toBe('function');
  });
});

describe('Utils - exit-handler', () => {
  it('should export exitWithError', () => {
    const mod = require('../exit-handler');
    expect(typeof mod.exitWithError).toBe('function');
  });

  it('should export captureActionError', () => {
    const mod = require('../exit-handler');
    expect(typeof mod.captureActionError).toBe('function');
  });
});

describe('Utils - safe-json', () => {
  it('should parse valid JSON', () => {
    const { safeJsonParse } = require('../safe-json');
    const result = safeJsonParse('{"a":1}', { fallback: true });
    expect(result).toEqual({ a: 1 });
  });

  it('should return fallback for invalid JSON', () => {
    const { safeJsonParse } = require('../safe-json');
    const result = safeJsonParse('invalid', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });
});
