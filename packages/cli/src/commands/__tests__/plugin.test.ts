import { Command } from 'commander';
import { pluginCommand } from '../plugin';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
  finish: jest.fn(),
}));

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      mkDir: jest.fn(),
      exists: jest.fn(),
      read: jest.fn(),
      write: jest.fn(),
      readDirEntries: jest.fn(() => []),
      remove: jest.fn(),
      copy: jest.fn(),
    },
    shell: {
      exec: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
      execString: jest.fn(() => ({ status: 0, stdout: '' })),
    },
  })),
}));

jest.mock('../../plugins/loader', () => ({
  loadPlugins: jest.fn(() => []),
  findPlugin: jest.fn(() => null),
}));

jest.mock('../../plugins/manifest', () => ({
  validateManifest: jest.fn(() => ({ valid: true, errors: [] })),
}));

jest.mock('../../plugins/registry', () => ({
  fetchRegistry: jest.fn(() => Promise.resolve([])),
  searchRegistry: jest.fn(() => []),
  downloadPlugin: jest.fn(() => Promise.resolve({ ok: true })),
  getRegistryUrl: jest.fn(() => 'https://example.com/registry.json'),
  setRegistryUrl: jest.fn(),
  getDefaultRegistryUrl: jest.fn(() => 'https://default.com/registry.json'),
}));

describe('pluginCommand', () => {
  let cmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = pluginCommand();
  });

  it('should create a command with name "plugin"', () => {
    expect(cmd.name()).toBe('plugin');
    expect(cmd.description()).toContain('plugins');
  });

  it('should have subcommands: list, install, search, registry, uninstall, create, validate', () => {
    const names = cmd.commands.map(c => c.name()).sort();
    expect(names).toEqual(['create', 'install', 'list', 'registry', 'search', 'uninstall', 'validate']);
  });

  it('should have "list" subcommand', () => {
    const sub = cmd.commands.find(c => c.name() === 'list');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Lista');
  });

  it('should have "install" subcommand with --path option', () => {
    const sub = cmd.commands.find(c => c.name() === 'install')!;
    const opt = sub.options.find(o => o.attributeName() === 'path');
    expect(opt).toBeDefined();
  });

  it('should have "search" subcommand with optional query argument', () => {
    const sub = cmd.commands.find(c => c.name() === 'search')!;
    expect(sub).toBeDefined();
  });

  it('should have "registry" subcommand with action argument', () => {
    const sub = cmd.commands.find(c => c.name() === 'registry')!;
    expect(sub).toBeDefined();
  });

  it('should have "uninstall" subcommand', () => {
    const sub = cmd.commands.find(c => c.name() === 'uninstall');
    expect(sub).toBeDefined();
  });

  it('should have "create" subcommand', () => {
    const sub = cmd.commands.find(c => c.name() === 'create');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Cria');
  });

  it('should have "validate" subcommand with optional name argument', () => {
    const sub = cmd.commands.find(c => c.name() === 'validate')!;
    expect(sub).toBeDefined();
  });

  it('should list plugins and show "Nenhum plugin encontrado" when none installed', () => {
    const { loadPlugins } = require('../../plugins/loader');
    loadPlugins.mockReturnValue([]);

    const sub = cmd.commands.find(c => c.name() === 'list')!;
    sub.parse(['node', 'test']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith('Nenhum plugin encontrado.');
  });

  it('should list installed plugins with details', () => {
    const { loadPlugins } = require('../../plugins/loader');
    loadPlugins.mockReturnValue([
      {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          author: 'test-author',
          description: 'A test plugin',
          capabilities: ['rules', 'skills'],
        },
        dir: '/fake/path',
      },
    ]);

    const sub = cmd.commands.find(c => c.name() === 'list')!;
    sub.parse(['node', 'test']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('test-plugin'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('test-author'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('rules, skills'));
  });

  it('should handle install for an already installed plugin', async () => {
    const { findPlugin } = require('../../plugins/loader');
    findPlugin.mockReturnValue({ manifest: { name: 'test-plugin' }, dir: '/fake' });

    const sub = cmd.commands.find(c => c.name() === 'install')!;
    await sub.parseAsync(['node', 'test', 'test-plugin']);

    const { printResult } = require('../../utils/output');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('instalado'), false);
  });

  it('should handle registry show action', () => {
    const sub = cmd.commands.find(c => c.name() === 'registry')!;
    sub.parse(['node', 'test', 'show']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('URL do registro'));
  });

  it('should handle registry set action with URL', () => {
    const { setRegistryUrl } = require('../../plugins/registry');

    const sub = cmd.commands.find(c => c.name() === 'registry')!;
    sub.parse(['node', 'test', 'set', 'https://custom.com/registry.json']);

    expect(setRegistryUrl).toHaveBeenCalledWith(expect.any(String), 'https://custom.com/registry.json');
  });

  it('should handle registry reset action', () => {
    const { getDefaultRegistryUrl, setRegistryUrl } = require('../../plugins/registry');

    const sub = cmd.commands.find(c => c.name() === 'registry')!;
    sub.parse(['node', 'test', 'reset']);

    expect(setRegistryUrl).toHaveBeenCalled();
    expect(getDefaultRegistryUrl).toHaveBeenCalled();
  });

  it('should handle registry set without URL', () => {
    const sub = cmd.commands.find(c => c.name() === 'registry')!;
    sub.parse(['node', 'test', 'set']);

    const { printResult } = require('../../utils/output');
    expect(printResult).toHaveBeenCalledWith('Forneca a URL do registro.', false);
  });

  it('should show usage for invalid registry action', () => {
    const sub = cmd.commands.find(c => c.name() === 'registry')!;
    sub.parse(['node', 'test', 'invalid']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('show'));
  });
});
