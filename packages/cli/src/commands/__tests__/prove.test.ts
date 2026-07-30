import { Command } from 'commander';
import { proveCommand, runProve, ProveDeps } from '../prove';

function makeDeps(overrides: Partial<ProveDeps> = {}): ProveDeps {
  return {
    cwd: '/test',
    cliBin: '/test/cli.js',
    cliDir: '/test',
    existsSync: () => true,
    mkdirSync: () => {},
    statSync: () => ({ size: 100 }),
    writeFileSync: () => {},
    spawnSync: () => ({ status: 0, stdout: '', stderr: '' }),
    platform: 'linux',
    log: () => {},
    getLogFile: () => '/test/prove.log',
    ...overrides,
  };
}

describe('proveCommand', () => {
  it('returns a Commander Command with name prove', () => {
    const cmd = proveCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('prove');
  });

  it('has description', () => {
    const cmd = proveCommand();
    expect(cmd.description()).toBeTruthy();
  });
});

describe('runProve', () => {
  it('returns 0 on successful run', () => {
    const spawnSync = jest.fn()
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: 'Project Health: OK', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: 'Todos os quality gates passaram', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const deps = makeDeps({ spawnSync });
    const result = runProve(deps);
    expect(result).toBe(0);
  });

  it('returns 1 when build step fails', () => {
    const spawnSync = jest.fn().mockReturnValue({ status: 1, stdout: '', stderr: '' });
    const deps = makeDeps({ spawnSync });
    const result = runProve(deps);
    expect(result).toBe(1);
  });

  it('returns 1 when --help step fails', () => {
    const spawnSync = jest.fn()
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValue({ status: 1, stdout: '', stderr: '' });

    const deps = makeDeps({ spawnSync });
    const result = runProve(deps);
    expect(result).toBe(1);
  });

  it('returns 1 when status output does not include Project Health', () => {
    const spawnSync = jest.fn()
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValue({ status: 0, stdout: 'Something else', stderr: '' });

    const deps = makeDeps({ spawnSync });
    const result = runProve(deps);
    expect(result).toBe(1);
  });

  it('returns 1 when verify output does not include quality gates message', () => {
    const spawnSync = jest.fn()
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: 'Project Health: OK', stderr: '' })
      .mockReturnValue({ status: 0, stdout: 'Sem verificacao', stderr: '' });

    const deps = makeDeps({ spawnSync });
    const result = runProve(deps);
    expect(result).toBe(1);
  });

  it('handles win32 platform and returns 0 on success', () => {
    const spawnSync = jest.fn()
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: 'Project Health: OK', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: 'Todos os quality gates passaram', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const deps = makeDeps({ platform: 'win32', spawnSync });
    const result = runProve(deps);
    expect(result).toBe(0);
  });

  it('calls spawnSync with correct arguments for build step on linux', () => {
    const spawnSync = jest.fn().mockReturnValue({ status: 0, stdout: '', stderr: '' });
    const deps = makeDeps({ spawnSync });
    runProve(deps);

    expect(spawnSync).toHaveBeenNthCalledWith(
      1,
      'npm',
      ['run', 'build'],
      { cwd: '/test', encoding: 'utf8', shell: false },
    );
  });

  it('calls spawnSync with correct arguments for --help step on linux', () => {
    const spawnSync = jest.fn().mockReturnValue({ status: 0, stdout: '', stderr: '' });
    const deps = makeDeps({ spawnSync });
    runProve(deps);

    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      'node',
      ['/test/cli.js', '--help'],
      { cwd: '/test', encoding: 'utf8', shell: false },
    );
  });

  it('calls spawnSync on win32 with combined command string', () => {
    const spawnSync = jest.fn().mockReturnValue({ status: 0, stdout: '', stderr: '' });
    const deps = makeDeps({ platform: 'win32', spawnSync });
    runProve(deps);

    expect(spawnSync).toHaveBeenNthCalledWith(
      1,
      'npm run build',
      [],
      { cwd: '/test', encoding: 'utf8', shell: true },
    );
  });

  it('calls ledgerAppend and writeFileSync on failure', () => {
    const ledgerAppend = jest.fn();
    const writeFileSync = jest.fn();
    const spawnSync = jest.fn().mockReturnValue({ status: 1, stdout: '', stderr: '' });

    const deps = makeDeps({ spawnSync, ledgerAppend, writeFileSync });
    const result = runProve(deps);

    expect(result).toBe(1);
    expect(ledgerAppend).toHaveBeenCalledWith('prove', 1, expect.any(String));
    expect(writeFileSync).toHaveBeenCalledWith('/test/prove.log', expect.any(String));
  });
});
