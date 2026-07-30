import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../core/health/required-files', () => ({ REQUIRED_FILE_GROUPS: [{ required: ['file1.md', 'file2.ts'] }] }));

const mockExistsSync = jest.fn();
const mockSpawnSync = jest.fn();
const mockGetMode = jest.fn();

function getVerifyDeps(overrides: Record<string, unknown> = {}) {
  const { runVerify } = require('../verify');
  const deps: Record<string, unknown> = { cwd: '/test', existsSync: mockExistsSync, spawnSync: mockSpawnSync, getMode: mockGetMode, isLLMMode: true, noRecursion: true, ...overrides };
  return runVerify(deps);
}

describe('runVerify', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockExistsSync.mockReturnValue(true);
    mockSpawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
    mockGetMode.mockReturnValue({ mode: 'default' });
  });

  afterEach(() => { logSpy.mockRestore(); });

  it('returns 0 when all required files exist', () => {
    expect(getVerifyDeps()).toBe(0);
  });

  it('returns 1 when a required file is missing', () => {
    mockExistsSync.mockReturnValue(false);
    expect(getVerifyDeps()).toBe(1);
  });

  it('logs missing file message', () => {
    mockExistsSync.mockReturnValue(false);
    getVerifyDeps({ isLLMMode: false });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Arquivo obrigatorio ausente'));
  });

  it('logs found file message', () => {
    getVerifyDeps({ isLLMMode: false });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Encontrado'));
  });

  it('skips status check when files are missing', () => {
    mockExistsSync.mockReturnValue(false);
    getVerifyDeps();
    expect(mockSpawnSync).not.toHaveBeenCalledWith('node', expect.arrayContaining([expect.stringContaining('status')]), expect.any(Object));
  });

  it('runs status check when all files present', () => {
    getVerifyDeps();
    expect(mockSpawnSync).toHaveBeenCalledWith('node', expect.arrayContaining([expect.stringContaining('status')]), expect.any(Object));
  });

  it('fails when status check fails', () => {
    mockSpawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'status error' });
    expect(getVerifyDeps()).toBe(1);
  });

  it('calls ledgerAppend when provided', () => {
    const ledgerAppend = jest.fn();
    getVerifyDeps({ ledgerAppend });
    expect(ledgerAppend).toHaveBeenCalledWith('verify', 0, expect.any(String));
  });

  it('outputs JSON in LLM mode when successful', () => {
    getVerifyDeps({ isLLMMode: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"ok": true'));
  });

  it('outputs JSON in LLM mode when failed', () => {
    mockExistsSync.mockReturnValue(false);
    getVerifyDeps({ isLLMMode: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"ok": false'));
  });
});

describe('verifyCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns a Command with name verify', () => {
    const { verifyCommand } = require('../verify');
    const cmd = verifyCommand();
    expect(cmd.name()).toBe('verify');
    expect(cmd.description()).toContain('quality gates');
  });
});
