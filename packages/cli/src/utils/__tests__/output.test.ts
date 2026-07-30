describe('output', () => {
  let consoleLogSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.AI_LLM_MODE;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    process.env = OLD_ENV;
  });

  describe('printHeader', () => {
    it('should log header to console', () => {
      const { printHeader } = require('../output');
      printHeader('My Title');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nMy Title\n');
    });

    it('should skip output in LLM mode', () => {
      process.env.AI_LLM_MODE = '1';
      const { printHeader } = require('../output');
      printHeader('My Title');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('printLine', () => {
    it('should log line to console', () => {
      const { printLine } = require('../output');
      printLine('hello');
      expect(consoleLogSpy).toHaveBeenCalledWith('hello');
    });

    it('should skip output in LLM mode', () => {
      process.env.AI_LLM_MODE = '1';
      const { printLine } = require('../output');
      printLine('hello');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('printResult', () => {
    it('should log success result', () => {
      const { printResult } = require('../output');
      printResult('Check', true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Check'));
    });

    it('should log failure result', () => {
      const { printResult } = require('../output');
      printResult('Check', false);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Check'));
    });

    it('should include detail when provided', () => {
      const { printResult } = require('../output');
      printResult('Check', true, 'all good');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('all good'));
    });

    it('should skip output in LLM mode', () => {
      process.env.AI_LLM_MODE = '1';
      const { printResult } = require('../output');
      printResult('Check', true);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('printSummary', () => {
    it('should log high score with checkmark', () => {
      const { printSummary } = require('../output');
      printSummary(90, 100, 'Quality');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Quality: 90/100')
      );
    });

    it('should log medium score with warning', () => {
      const { printSummary } = require('../output');
      printSummary(70, 100, 'Quality');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Quality: 70/100')
      );
    });

    it('should log low score with cross', () => {
      const { printSummary } = require('../output');
      printSummary(30, 100, 'Quality');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Quality: 30/100')
      );
    });

    it('should skip output in LLM mode', () => {
      process.env.AI_LLM_MODE = '1';
      const { printSummary } = require('../output');
      printSummary(90, 100, 'Quality');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('finish', () => {
    it('should call process.exit with 0 for ok', () => {
      const { finish } = require('../output');
      finish({ checkpoint: 'c1', ok: true, status: 'done', context_summary: 'ok' });
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should call process.exit with 1 for not ok', () => {
      const { finish } = require('../output');
      finish({ checkpoint: 'c1', ok: false, status: 'fail', context_summary: 'fail' });
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should not exit when exit is false', () => {
      const { finish } = require('../output');
      finish({ checkpoint: 'c1', ok: true, status: 'done', context_summary: 'ok', exit: false });
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should output JSON in LLM mode', () => {
      process.env.AI_LLM_MODE = '1';
      const { finish } = require('../output');
      finish({ checkpoint: 'c1', ok: true, status: 'done', context_summary: 'works', exit: false });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"ok": true')
      );
    });
  });
});
