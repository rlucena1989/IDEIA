import { createLogger, LogLevel, getLogger, setLogger, lockLogger } from '../src/index';

describe('Logger', () => {
  it('createLogger returns an object with info, warn, error, debug, fatal, child methods', () => {
    const log = createLogger('test');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.fatal).toBe('function');
    expect(typeof log.child).toBe('function');
  });

  it('each method can be called without throwing', () => {
    const log = createLogger('no-throw');
    expect(() => log.info('info')).not.toThrow();
    expect(() => log.warn('warn')).not.toThrow();
    expect(() => log.error('error')).not.toThrow();
    expect(() => log.debug('debug')).not.toThrow();
    expect(() => log.fatal('fatal')).not.toThrow();
  });

  it('logger formats messages with meta argument', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger('format-test');
    log.info('hello world', { userId: 42, role: 'admin' });
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0];
    expect(output).toContain('hello world');
    expect(output).toContain('userId');
    expect(output).toContain('42');
    spy.mockRestore();
  });

  it('child logger inherits parent context prefix', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const parent = createLogger('parent');
    const child = parent.child('child');
    child.info('child message');
    const output = spy.mock.calls[0][0];
    expect(output).toContain('[parent:child]');
    expect(output).toContain('child message');
    spy.mockRestore();
  });

  it('setLogger and getLogger work correctly', () => {
    const log = createLogger('custom');
    setLogger(log);
    expect(getLogger()).toBe(log);
  });

  it('lockLogger prevents setLogger from replacing', () => {
    const original = getLogger();
    lockLogger();
    const replacement = createLogger('replacement');
    setLogger(replacement);
    expect(getLogger()).toBe(original);
  });
});
