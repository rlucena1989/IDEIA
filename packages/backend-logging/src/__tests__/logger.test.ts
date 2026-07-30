import { LogLevel, LOG_LEVEL_NAMES } from '../types';
import { DefaultLogger } from '../logger';

describe('LogLevel', () => {
  it('should have correct enum values', () => {
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
    expect(LogLevel.FATAL).toBe(4);
  });

  it('should have correct level names', () => {
    expect(LOG_LEVEL_NAMES[LogLevel.DEBUG]).toBe('DEBUG');
    expect(LOG_LEVEL_NAMES[LogLevel.INFO]).toBe('INFO');
    expect(LOG_LEVEL_NAMES[LogLevel.WARN]).toBe('WARN');
    expect(LOG_LEVEL_NAMES[LogLevel.ERROR]).toBe('ERROR');
    expect(LOG_LEVEL_NAMES[LogLevel.FATAL]).toBe('FATAL');
  });
});

describe('DefaultLogger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should create with default config', () => {
    const logger = new DefaultLogger();
    expect(logger).toBeDefined();
    expect(logger.getCorrelationId()).toBeUndefined();
  });

  it('should log at INFO level by default', () => {
    const logger = new DefaultLogger();
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    logger.fatal('fatal message');
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('DEBUG'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[FATAL]'));
  });

  it('should log all levels when set to DEBUG', () => {
    const logger = new DefaultLogger({ level: LogLevel.DEBUG });
    logger.debug('debug msg');
    logger.info('info msg');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
  });

  it('should filter levels below threshold', () => {
    const logger = new DefaultLogger({ level: LogLevel.ERROR });
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
  });

  it('should exclude correlation ID when not set', () => {
    const logger = new DefaultLogger();
    logger.info('test');
    expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] test');
  });

  it('should include correlation ID when set', () => {
    const logger = new DefaultLogger();
    logger.setCorrelationId('corr-123');
    logger.info('test');
    expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] [corr-123] test');
  });

  it('should return correlation ID', () => {
    const logger = new DefaultLogger({ correlationId: 'abc' });
    expect(logger.getCorrelationId()).toBe('abc');
  });

  it('should enable and disable console output', () => {
    const logger = new DefaultLogger({ level: LogLevel.DEBUG });
    logger.info('visible');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    const disabled = new DefaultLogger({ level: LogLevel.DEBUG, enableConsole: false });
    disabled.info('hidden');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  it('should include metadata in output', () => {
    const logger = new DefaultLogger({ level: LogLevel.DEBUG });
    logger.info('with meta', { key: 'value', num: 42 });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('{"key":"value","num":42}'));
  });

  it('should use console.error for ERROR and FATAL', () => {
    const logger = new DefaultLogger({ level: LogLevel.DEBUG });
    logger.error('err');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] err');
    logger.fatal('fatal');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[FATAL] fatal');
  });

  it('should use console.warn for WARN', () => {
    const logger = new DefaultLogger({ level: LogLevel.DEBUG });
    logger.warn('warn');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn');
  });
});
