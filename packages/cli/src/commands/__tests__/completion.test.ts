import { completionCommand } from '../completion';

jest.mock('../../types/cli-result', () => ({ success: jest.fn((m, d) => ({ ok: true, message: m, data: d })), failure: jest.fn((m) => ({ ok: false, message: m })) }));
jest.mock('@ideia/logger', () => {
  const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
  return { createLogger: jest.fn(() => logger) };
});
jest.mock('node:fs', () => ({ writeFileSync: jest.fn(), existsSync: jest.fn(() => false), mkdirSync: jest.fn() }));
jest.mock('node:os', () => ({ homedir: jest.fn(() => '/home/testuser') }));

function getMockLogger() {
  return require('@ideia/logger').createLogger('');
}

describe('completionCommand', () => {
  const cmd = completionCommand();

  it('should have bash, zsh, powershell, install subcommands', () => {
    const snames = cmd.commands.map(c => c.name());
    expect(snames).toContain('bash');
    expect(snames).toContain('zsh');
    expect(snames).toContain('powershell');
    expect(snames).toContain('install');
  });

  it('bash should generate and log completion script', async () => {
    await cmd.parseAsync(['node', 'test', 'bash']);
    const logger = require('@ideia/logger').createLogger('');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('_ideia_completions'));
  });

  it('zsh should generate and log zsh completion script', async () => {
    await cmd.parseAsync(['node', 'test', 'zsh']);
    const logger = require('@ideia/logger').createLogger('');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('#compdef ideia'));
  });

  it('powershell should generate and log powershell completion', async () => {
    await cmd.parseAsync(['node', 'test', 'powershell']);
    const logger = require('@ideia/logger').createLogger('');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Register-ArgumentCompleter'));
  });

  it('install bash should write bash file', async () => {
    const { writeFileSync } = require('node:fs');
    await cmd.parseAsync(['node', 'test', 'install', '--shell', 'bash']);
    expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.ideia-completion.bash'), expect.any(String), 'utf-8');
  });

  it('install zsh should create zsh dir if not exists', async () => {
    const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
    existsSync.mockReturnValue(false);
    await cmd.parseAsync(['node', 'test', 'install', '--shell', 'zsh']);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringMatching(/[\\/]\.zsh[\\/]completion/), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('_ideia'), expect.any(String), 'utf-8');
  });

  it('install powershell should create powershell dir', async () => {
    const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
    existsSync.mockReturnValue(false);
    await cmd.parseAsync(['node', 'test', 'install', '--shell', 'powershell']);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('WindowsPowerShell'), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('ideia-completion.ps1'), expect.any(String), 'utf-8');
  });

  it('install unsupported shell should return failure', async () => {
    const { failure } = require('../../types/cli-result');
    await cmd.parseAsync(['node', 'test', 'install', '--shell', 'fish']);
    expect(failure).toHaveBeenCalledWith(expect.stringContaining('fish'));
  });

  it('install without shell should use detectShell default', async () => {
    const { writeFileSync } = require('node:fs');
    const orig = process.env.SHELL;
    process.env.SHELL = '/bin/bash';
    await cmd.parseAsync(['node', 'test', 'install']);
    expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.ideia-completion.bash'), expect.any(String), 'utf-8');
    process.env.SHELL = orig;
  });

  it('install with existsync true should not create dirs', async () => {
    const { existsSync } = require('node:fs');
    existsSync.mockReturnValue(true);
    await cmd.parseAsync(['node', 'test', 'install', '--shell', 'bash']);
    expect(require('node:fs').writeFileSync).toHaveBeenCalled();
  });

  it('bash subcommand returns success with shell bash', async () => {
    const { success } = require('../../types/cli-result');
    await cmd.parseAsync(['node', 'test', 'bash']);
    expect(success).toHaveBeenCalledWith({ shell: 'bash' });
  });
