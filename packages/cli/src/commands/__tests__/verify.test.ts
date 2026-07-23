import { Command } from 'commander';
import { verifyCommand, runVerify, type VerifyDeps } from '../verify';

function makeDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    cwd: '/test',
    existsSync: () => true,
    spawnSync: () => ({ status: 0, stdout: '', stderr: '' }),
    getMode: () => ({ mode: 'development' }),
    isLLMMode: false,
    noRecursion: true,
    ...overrides,
  };
}

describe('runVerify', () => {
  it('returns 0 when all gates pass', () => {
    const result = runVerify(makeDeps());
    expect(result).toBe(0);
  });

  it('returns 1 when required files are missing', () => {
    const deps = makeDeps({ existsSync: () => false });
    const result = runVerify(deps);
    expect(result).toBe(1);
  });

  it('returns 1 when status check fails', () => {
    const deps = makeDeps({
      spawnSync: () => ({ status: 1, stdout: '', stderr: '' }),
    });
    const result = runVerify(deps);
    expect(result).toBe(1);
  });

  it('handles LLM mode without crashing', () => {
    const deps = makeDeps({ isLLMMode: true });
    expect(() => runVerify(deps)).not.toThrow();
  });

  it('skips prevention suite in debugging mode', () => {
    const deps = makeDeps({ getMode: () => ({ mode: 'debugging' }) });
    const result = runVerify(deps);
    expect(result).toBe(0);
  });
});

describe('verifyCommand', () => {
  it('returns a Commander Command with name verify', () => {
    const cmd = verifyCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('verify');
  });
});
