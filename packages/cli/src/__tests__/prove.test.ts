import { runProve, ProveDeps } from '../commands/prove';
import path from 'node:path';
import os from 'node:os';

function makeDeps(overrides: Partial<ProveDeps> = {}): ProveDeps {
  const _logOutput = '';
  return {
    cwd: '/test',
    cliBin: '/test/index.js',
    cliDir: '/test/cli',
    existsSync: () => true,
    mkdirSync: () => {},
    statSync: () => ({ size: 100 }),
    writeFileSync: () => {},
    spawnSync: () => ({ status: 0, stdout: 'ok', stderr: '' }),
    platform: 'linux',
    log: (msg) => { logOutput += msg + '\n'; },
    getLogFile: () => path.join(os.tmpdir(), 'prove-test.log'),
    ...overrides,
  };
}

describe('runProve', () => {
  it('returns 0 on full successful run', () => {
    const code = runProve(makeDeps({
      spawnSync: (cmd, args) => {
        const fullCmd = cmd + ' ' + args.join(' ');
        if (fullCmd.includes('status')) return { status: 0, stdout: 'Project Health: 100', stderr: '' };
        if (fullCmd.includes('verify')) return { status: 0, stdout: 'Todos os quality gates passaram', stderr: '' };
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    }));
    expect(code).toBe(0);
  });

  it('returns 1 when build fails', () => {
    const code = runProve(makeDeps({
      spawnSync: () => ({ status: 1, stdout: '', stderr: 'build error' }),
    }));
    expect(code).toBe(1);
  });

  it('returns 1 when CLI help fails', () => {
    let _callCount = 0;
    const code = runProve(makeDeps({
      spawnSync: (_cmd, _args) => {
        _callCount++;
        return { status: _callCount >= 2 ? 1 : 0, stdout: '', stderr: '' };
      },
    }));
    expect(code).toBe(1);
  });

  it('returns 1 when status output lacks Project Health', () => {
    const code = runProve(makeDeps({
      spawnSync: () => ({ status: 0, stdout: 'no health info', stderr: '' }),
    }));
    expect(code).toBe(1);
  });

  it('returns 1 when verify output lacks success message', () => {
    let _callCount = 0;
    const code = runProve(makeDeps({
      spawnSync: (_cmd, _args) => {
        _callCount++;
        const fullCmd = _cmd + ' ' + _args.join(' ');
        if (fullCmd.includes('status')) return { status: 0, stdout: 'Project Health: 100', stderr: '' };
        if (fullCmd.includes('verify')) return { status: 0, stdout: 'something else', stderr: '' };
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    }));
    expect(code).toBe(1);
  });

  it('returns 1 when feature file does not exist', () => {
    const code = runProve(makeDeps({
      existsSync: (p) => !p.toString().includes('feature-brief.md'),
      spawnSync: (cmd, args) => {
        const fullCmd = cmd + ' ' + args.join(' ');
        if (fullCmd.includes('status')) return { status: 0, stdout: 'Project Health: 100', stderr: '' };
        if (fullCmd.includes('verify')) return { status: 0, stdout: 'Todos os quality gates passaram', stderr: '' };
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    }));
    expect(code).toBe(1);
  });

  it('calls ledgerAppend on failure', () => {
    const ledgerAppend = jest.fn();
    runProve(makeDeps({
      spawnSync: () => ({ status: 1, stdout: '', stderr: '' }),
      ledgerAppend,
    }));
    expect(ledgerAppend).toHaveBeenCalledWith('prove', 1, expect.any(String));
  });

  it('handles empty file check', () => {
    const code = runProve(makeDeps({
      statSync: () => ({ size: 0 }),
      spawnSync: (cmd, args) => {
        const fullCmd = cmd + ' ' + args.join(' ');
        if (fullCmd.includes('status')) return { status: 0, stdout: 'Project Health: 100', stderr: '' };
        if (fullCmd.includes('verify')) return { status: 0, stdout: 'Todos os quality gates passaram', stderr: '' };
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    }));
    expect(code).toBe(1);
  });

  it('handles stub check failure', () => {
    let _callCount = 0;
    const code = runProve(makeDeps({
      spawnSync: (cmd, args) => {
        _callCount++;
        const fullCmd = cmd + ' ' + args.join(' ');
        if (fullCmd.includes('status')) return { status: 0, stdout: 'Project Health: 100', stderr: '' };
        if (fullCmd.includes('verify')) return { status: 0, stdout: 'Todos os quality gates passaram', stderr: '' };
        if (fullCmd.includes('check-placeholder')) return { status: 1, stdout: '', stderr: 'stubs found' };
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    }));
    expect(code).toBe(1);
  });
});
