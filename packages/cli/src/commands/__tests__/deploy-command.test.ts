import { Command } from 'commander';
import { ideiaDeployCommand } from '../ideia/deploy-command';

jest.mock('../../utils/output');
jest.mock('node:fs');
jest.mock('node:child_process');

import { printHeader } from '../../utils/output';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (printHeader as jest.Mock).mockImplementation(() => {});
  (execFileSync as jest.Mock).mockImplementation(() => Buffer.from(''));
  (fs.existsSync as jest.Mock).mockReturnValue(false);
  (fs.readFileSync as jest.Mock).mockReturnValue('{"version": "1.0.0"}');
});

describe('ideiaDeployCommand', () => {
  it('should be defined', () => {
    expect(ideiaDeployCommand).toBeDefined();
  });

  it('should return a Command with name deploy', () => {
    const cmd = ideiaDeployCommand();
    expect(cmd.name()).toBe('deploy');
  });

  it('should have description containing Deploy', () => {
    const cmd = ideiaDeployCommand();
    expect(cmd.description()).toContain('Deploy');
  });

  it('should have prepare and status subcommands', () => {
    const cmd = ideiaDeployCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('prepare');
    expect(names).toContain('status');
    expect(names.length).toBe(2);
  });
});

describe('deploy prepare subcommand', () => {
  function getPrepareCmd(): Command {
    const cmd = ideiaDeployCommand();
    const prepare = cmd.commands.find((c: Command) => c.name() === 'prepare');
    return prepare!;
  }

  it('should be registered with required --env option', () => {
    const prepare = getPrepareCmd();
    const envOpt = prepare.options.find(o => o.long === '--env');
    expect(envOpt).toBeDefined();
    expect(envOpt!.required).toBe(true);
  });

  it('should have --approve option', () => {
    const prepare = getPrepareCmd();
    const opt = prepare.options.find(o => o.long === '--approve');
    expect(opt).toBeDefined();
  });

  it('should have --dry-run option', () => {
    const prepare = getPrepareCmd();
    const opt = prepare.options.find(o => o.long === '--dry-run');
    expect(opt).toBeDefined();
  });

  it('should have --json option', () => {
    const prepare = getPrepareCmd();
    const opt = prepare.options.find(o => o.long === '--json');
    expect(opt).toBeDefined();
  });

  it('should have description containing Prepara', () => {
    const prepare = getPrepareCmd();
    expect(prepare.description()).toContain('Prepara');
  });

  it('should accept staging environment', () => {
    const prepare = getPrepareCmd();
    const logSpy = jest.spyOn(console, 'log');
    prepare.parse(['node', 'prepare', '--env', 'staging']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('should accept production environment', () => {
    const prepare = getPrepareCmd();
    const logSpy = jest.spyOn(console, 'log');
    prepare.parse(['node', 'prepare', '--env', 'production']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('should reject invalid environment', () => {
    const prepare = getPrepareCmd();
    const errorSpy = jest.spyOn(console, 'error');
    prepare.parse(['node', 'prepare', '--env', 'invalid']);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Ambiente'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should run pre-deploy checks on prepare', () => {
    const prepare = getPrepareCmd();
    (execFileSync as jest.Mock).mockReturnValue(Buffer.from(''));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('{"version": "1.0.0"}');
    prepare.parse(['node', 'prepare', '--env', 'staging']);
    expect(execFileSync).toHaveBeenCalled();
  });

  it('should output when --json flag is set', () => {
    const prepare = getPrepareCmd();
    const logSpy = jest.spyOn(console, 'log');
    prepare.parse(['node', 'prepare', '--env', 'staging', '--json']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('should output plan in dry-run mode', () => {
    const prepare = getPrepareCmd();
    const logSpy = jest.spyOn(console, 'log');
    prepare.parse(['node', 'prepare', '--env', 'staging', '--dry-run']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DRY-RUN'));
  });

  it('should not call process.exit in dry-run mode', () => {
    const prepare = getPrepareCmd();
    prepare.parse(['node', 'prepare', '--env', 'staging', '--dry-run']);
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should handle execFileSync errors gracefully', () => {
    (execFileSync as jest.Mock).mockImplementation(() => { throw new Error('command failed'); });
    const prepare = getPrepareCmd();
    const logSpy = jest.spyOn(console, 'log');
    prepare.parse(['node', 'prepare', '--env', 'staging']);
    expect(logSpy).toHaveBeenCalled();
  });

  it('should show failed checks when --approve is not given', () => {
    (execFileSync as jest.Mock).mockImplementation(() => { throw new Error('failed'); });
    const prepare = getPrepareCmd();
    const logSpy = jest.spyOn(console, 'log');
    prepare.parse(['node', 'prepare', '--env', 'staging']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('falhou'));
  });
});

describe('deploy status subcommand', () => {
  function getStatusCmd(): Command {
    const cmd = ideiaDeployCommand();
    const status = cmd.commands.find((c: Command) => c.name() === 'status');
    return status!;
  }

  it('should be registered', () => {
    const status = getStatusCmd();
    expect(status).toBeDefined();
  });

  it('should have description contendo status', () => {
    const status = getStatusCmd();
    expect(status.description()).toContain('status');
  });

  it('should have --json option', () => {
    const status = getStatusCmd();
    const opt = status.options.find(o => o.long === '--json');
    expect(opt).toBeDefined();
  });

  it('should show no deploys message when history is empty', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const status = getStatusCmd();
    const logSpy = jest.spyOn(console, 'log');
    status.parse(['node', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum deploy'));
  });

  it('should show last deploy info when history exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([{
      version: '2026.07.22',
      environment: 'staging',
      timestamp: '2026-07-22T10:00:00.000Z',
      approved: true,
      artifacts: ['build', 'docker-image'],
      checks: [{ name: 'TypeScript compila', passed: true }],
    }]));
    const status = getStatusCmd();
    const logSpy = jest.spyOn(console, 'log');
    status.parse(['node', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('staging'));
  });

  it('should output JSON when --json flag is set', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([{
      version: '2026.07.22',
      environment: 'production',
      timestamp: '2026-07-22T10:00:00.000Z',
      approved: true,
      artifacts: [],
      checks: [],
    }]));
    const status = getStatusCmd();
    const logSpy = jest.spyOn(console, 'log');
    status.parse(['node', 'status', '--json']);
    const jsonCalls = logSpy.mock.calls.filter(c => {
      if (typeof c[0] !== 'string') return false;
      try { JSON.parse(c[0]); return true; }
      catch { return false; }
    });
    expect(jsonCalls.length).toBeGreaterThan(0);
  });

  it('should handle corrupt history file gracefully', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('parse error'); });
    const status = getStatusCmd();
    const logSpy = jest.spyOn(console, 'log');
    status.parse(['node', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum deploy'));
  });

  it('should show not approved status for pending deploys', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([{
      version: '2026.07.22',
      environment: 'production',
      timestamp: '2026-07-22T10:00:00.000Z',
      approved: false,
      artifacts: [],
      checks: [],
    }]));
    const status = getStatusCmd();
    const logSpy = jest.spyOn(console, 'log');
    status.parse(['node', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Pendente'));
  });
});
