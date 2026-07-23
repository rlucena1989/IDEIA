import { runVerify, VerifyDeps } from '../commands/verify';

function makeDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  const files: Record<string, boolean> = {};
  return {
    cwd: '/test',
    existsSync: (p: string) => files[p] !== false,
    spawnSync: () => ({ status: 0, stdout: '', stderr: '' }),
    getMode: () => ({ mode: 'default' }),
    isLLMMode: true,
    noRecursion: true,
    ...overrides,
  };
}

describe('runVerify', () => {
  it('returns 0 when all required files exist', () => {
    const code = runVerify(makeDeps());
    expect(code).toBe(0);
  });

  it('returns 1 when a required file is missing', () => {
    const deps = makeDeps({
      existsSync: () => false,
    });
    const code = runVerify(deps);
    expect(code).toBe(1);
  });

  it('skips prevention suite in debugging mode', () => {
    const deps = makeDeps({
      getMode: () => ({ mode: 'debugging' }),
    });
    const code = runVerify(deps);
    expect(code).toBe(0);
  });

  it('skips prevention suite in documentation mode', () => {
    const deps = makeDeps({
      getMode: () => ({ mode: 'documentation' }),
    });
    const code = runVerify(deps);
    expect(code).toBe(0);
  });

  it('skips quality agent in performance mode', () => {
    const deps = makeDeps({
      getMode: () => ({ mode: 'performance' }),
      noRecursion: false,
    });
    const code = runVerify(deps);
    expect(code).toBe(0);
  });

  it('returns 1 when spawnSync fails', () => {
    const deps = makeDeps({
      spawnSync: () => ({ status: 1, stdout: '', stderr: 'error' }),
    });
    const code = runVerify(deps);
    expect(code).toBe(1);
  });

  it('calls ledgerAppend when provided', () => {
    const ledgerAppend = jest.fn();
    runVerify(makeDeps({ ledgerAppend }));
    expect(ledgerAppend).toHaveBeenCalledWith('verify', 0, expect.any(String));
  });

  it('runs prevention suite when noRecursion is false', () => {
    const spawnSync = jest.fn(() => ({ status: 1, stdout: 'fail', stderr: '' }));
    const deps = makeDeps({
      noRecursion: false,
      spawnSync,
    });
    const code = runVerify(deps);
    expect(code).toBe(1);
    expect(spawnSync).toHaveBeenCalled();
  });

  it('outputs JSON in LLM mode', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    runVerify(makeDeps({ isLLMMode: true }));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"ok": true'));
    logSpy.mockRestore();
  });
});
