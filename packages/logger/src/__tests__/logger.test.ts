import { createLogger, LogLevel, setLogger, getLogger } from '../index';

describe('Logger', () => {
  it('should create logger and log at various levels', () => {
    const log = createLogger('test');
    expect(() => log.info('test message')).not.toThrow();
    expect(() => log.warn('warning')).not.toThrow();
    expect(() => log.error('error')).not.toThrow();
    expect(() => log.debug('debug')).not.toThrow();
    expect(() => log.fatal('fatal')).not.toThrow();
  });

  it('should support child loggers', () => {
    const parent = createLogger('parent');
    const child = parent.child('child');
    expect(() => child.info('child message')).not.toThrow();
  });

  it('should support setLogger/getLogger', () => {
    const custom = createLogger('custom');
    setLogger(custom);
    expect(getLogger()).toBe(custom);
  });
});
