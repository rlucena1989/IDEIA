import { runInSandbox} from '../sandbox';

let mockWorker: any;
let workerOnMessage: (...args: unknown[]) => void;
let workerOnError: (...args: unknown[]) => void;
let workerOnExit: (...args: unknown[]) => void;

jest.mock('node:worker_threads', () => ({
  Worker: jest.fn(() => {
    mockWorker = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'message') workerOnMessage = cb;
        if (event === 'error') workerOnError = cb;
        if (event === 'exit') workerOnExit = cb;
      }),
    };
    return mockWorker;
  }),
}));

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockWorker = undefined;
  workerOnMessage = () => {};
  workerOnError = () => {};
  workerOnExit = () => {};
});

describe('runInSandbox', () => {
  it('should execute JavaScript code and return result', async () => {
    const promise = runInSandbox('/tmp/test', { code: '1 + 1', language: 'javascript' });

    setTimeout(() => {
      workerOnMessage({
        ok: true,
        output: '2',
        error: '',
        durationMs: 5,
        memoryMb: 0.5,
      });
    }, 10);

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.output).toBe('2');
  });

  it('should execute shell code and return output', async () => {
    const promise = runInSandbox('/tmp/test', {
      code: 'echo hello',
      language: 'shell',
      timeout: 5000,
    });

    setTimeout(() => {
      workerOnMessage({
        ok: true,
        output: 'hello',
        error: '',
        durationMs: 10,
        memoryMb: 1.2,
      });
    }, 10);

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.output).toBe('hello');
  });

  it('should handle worker errors gracefully', async () => {
    const promise = runInSandbox('/tmp/test', { code: 'throw new Error("test error")' });

    setTimeout(() => {
      workerOnError(new Error('Worker crashed'));
    }, 10);

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should handle worker exit with non-zero code', async () => {
    const promise = runInSandbox('/tmp/test', { code: 'process.exit(1)' });

    setTimeout(() => {
      workerOnExit(1);
    }, 10);

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error).toContain('exit');
  });

  it('should timeout worker execution after specified timeout', async () => {
    const promise = runInSandbox('/tmp/test', {
      code: 'while(true) {}',
      timeout: 100,
    });

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error).toContain('timeout');
  }, 20000);

  it('should use default 10s timeout when not specified', () => {
    runInSandbox('/tmp/test', { code: 'true' });
    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 10000 })
    );
  });

  it('should pass language parameter to worker', () => {
    runInSandbox('/tmp/test', { code: 'ls -la', language: 'shell', timeout: 5000 });

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'shell' })
    );
  });

  it('should create worker with resource limits', () => {
    runInSandbox('/tmp/test', { code: 'true' });

    const Worker = require('node:worker_threads').Worker;
    expect(Worker).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        resourceLimits: expect.objectContaining({
          maxOldGenerationSizeMb: 64,
          maxYoungGenerationSizeMb: 16,
          codeRangeSizeMb: 8,
        }),
      })
    );
  });

  it('should create sandbox directory and worker file on disk', () => {
    runInSandbox('/tmp/test', { code: 'true' });

    expect(require('node:fs').mkdirSync).toHaveBeenCalled();
    expect(require('node:fs').writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('sandbox-worker.js'),
      expect.any(String),
      'utf8',
    );
  });

  it('should handle worker message even after exit code 0', async () => {
    const promise = runInSandbox('/tmp/test', { code: 'true', timeout: 5000 });

    setTimeout(() => {
      workerOnExit(0);
      workerOnMessage({
        ok: true,
        output: 'done',
        error: '',
        durationMs: 5,
        memoryMb: 0.1,
      });
    }, 10);

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.output).toBe('done');
  });

  it('should return result shape with all fields', async () => {
    const promise = runInSandbox('/tmp/test', { code: '42' });

    setTimeout(() => {
      workerOnMessage({
        ok: true,
        output: '42',
        error: '',
        durationMs: 3,
        memoryMb: 0.1,
      });
    }, 10);

    const result = await promise;
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('durationMs');
    expect(result).toHaveProperty('memoryMb');
  });

  it('should pass the correct code to worker', () => {
    runInSandbox('/tmp/test', { code: 'const x = 10; x * 2;', timeout: 5000 });

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'const x = 10; x * 2;' })
    );
  });

  it('should default to javascript language when not specified', () => {
    runInSandbox('/tmp/test', { code: 'true' });

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'javascript' })
    );
  });
});
