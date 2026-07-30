import { DryRunExecutor, createDryRunExecutor } from '../dry-run';

describe('DryRunExecutor', () => {
  let executor: DryRunExecutor;

  beforeEach(() => {
    executor = createDryRunExecutor(true);
  });

  describe('createDryRunExecutor', () => {
    it('should create a dry-run executor', () => {
      expect(executor).toBeInstanceOf(DryRunExecutor);
    });

    it('should be disabled by default', () => {
      const disabled = createDryRunExecutor(false);
      expect(disabled.isEnabled()).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('should enable dry-run', () => {
      executor.disable();
      executor.enable();
      expect(executor.isEnabled()).toBe(true);
    });

    it('should disable dry-run', () => {
      executor.disable();
      expect(executor.isEnabled()).toBe(false);
    });
  });

  describe('recordFileOperation', () => {
    it('should record file operation when enabled', () => {
      executor.recordFileOperation('write', '/path/to/file.txt');
      const result = executor.getResult();
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].type).toBe('file');
    });

    it('should not record when disabled', () => {
      executor.disable();
      executor.recordFileOperation('write', '/path/to/file.txt');
      const result = executor.getResult();
      expect(result.operations).toHaveLength(0);
    });
  });

  describe('recordCommand', () => {
    it('should record command', () => {
      executor.recordCommand('npm install');
      const result = executor.getResult();
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].type).toBe('command');
    });
  });

  describe('recordNetworkRequest', () => {
    it('should record network request', () => {
      executor.recordNetworkRequest('https://api.example.com', 'GET');
      const result = executor.getResult();
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].type).toBe('network');
    });
  });

  describe('getResult', () => {
    it('should return result with summary', () => {
      executor.recordFileOperation('write', '/path/to/file.txt');
      const result = executor.getResult();
      expect(result.wouldExecute).toBe(true);
      expect(result.summary).toContain('1 file');
    });

    it('should return empty result when no operations', () => {
      const result = executor.getResult();
      expect(result.wouldExecute).toBe(false);
      expect(result.summary).toContain('No operations');
    });
  });

  describe('clear', () => {
    it('should clear operations', () => {
      executor.recordFileOperation('write', '/path/to/file.txt');
      executor.clear();
      const result = executor.getResult();
      expect(result.operations).toHaveLength(0);
    });
  });
});
