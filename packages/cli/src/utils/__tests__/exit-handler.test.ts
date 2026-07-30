jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ error: jest.fn() }),
}));

describe('exit-handler', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('exitWithError', () => {
    it('should log error message and exit with code 1', () => {
      const { exitWithError } = require('../exit-handler');
      exitWithError('my-context', 'something broke');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('my-context')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should log error from Error instance', () => {
      const { exitWithError } = require('../exit-handler');
      exitWithError('ctx', new Error('fail msg'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('fail msg')
      );
    });

    it('should exit with custom code', () => {
      const { exitWithError } = require('../exit-handler');
      exitWithError('ctx', 'err', { exitCode: 42 });
      expect(processExitSpy).toHaveBeenCalledWith(42);
    });

    it('should output JSON when json option is set', () => {
      const { exitWithError } = require('../exit-handler');
      exitWithError('ctx', 'err msg', { json: true });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"ok": false')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"error": "err msg"')
      );
    });

    it('should output stack in verbose mode', () => {
      const { exitWithError } = require('../exit-handler');
      const err = new Error('verbose err');
      exitWithError('ctx', err, { verbose: true });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error: verbose err')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('at')
      );
    });

    it('should not output stack in non-verbose mode', () => {
      const { exitWithError } = require('../exit-handler');
      const err = new Error('quiet err');
      exitWithError('ctx', err);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/^    at /m)
      );
    });
  });

  describe('captureActionError', () => {
    it('should return a function', () => {
      const { captureActionError } = require('../exit-handler');
      const handler = captureActionError('ctx');
      expect(typeof handler).toBe('function');
    });

    it('should call exitWithError when invoked', () => {
      const { captureActionError } = require('../exit-handler');
      const handler = captureActionError('test-context');
      handler(new Error('handler error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-context')
      );
      expect(processExitSpy).toHaveBeenCalled();
    });
  });
});
