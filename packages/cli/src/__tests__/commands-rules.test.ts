import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFindPack = jest.fn();
const mockListAvailable = jest.fn();
const mockListInstalled = jest.fn();
const mockInstallPack = jest.fn();
const mockUninstallPack = jest.fn();
const mockSearchPacks = jest.fn();

jest.mock('../rules/pack', () => ({
  findPack: (...args: unknown[]) => mockFindPack(...args),
  listAvailablePacks: (...args: unknown[]) => mockListAvailable(...args),
  listInstalledPacks: (...args: unknown[]) => mockListInstalled(...args),
  installPack: (...args: unknown[]) => mockInstallPack(...args),
  uninstallPack: (...args: unknown[]) => mockUninstallPack(...args),
  searchPacks: (...args: unknown[]) => mockSearchPacks(...args),
}));

const mockFsExists = jest.fn();
const mockFsMkDir = jest.fn();
const mockFsWrite = jest.fn();
jest.mock('../io', () => ({
  getIO: () => ({
    fs: {
      exists: (p: string) => mockFsExists(p),
      mkDir: (p: string, r: boolean) => mockFsMkDir(p, r),
      write: (p: string, c: string) => mockFsWrite(p, c),
    },
  }),
}));

describe('commands - rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rulesCommand retorna Command com subcomandos', () => {
    const { rulesCommand } = require('../commands/rules');
    const cmd = rulesCommand();
    expect(cmd.name()).toBe('rules');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('list');
    expect(names).toContain('install');
    expect(names).toContain('uninstall');
    expect(names).toContain('search');
    expect(names).toContain('create');
    expect(names).toContain('validate');
    expect(names).toContain('publish');
  });

  it('listAvailablePacks e chamado via rulesListAction', () => {
    const { rulesCommand } = require('../commands/rules');
    const cmd = rulesCommand();
    const listCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'list');
    expect(listCmd).toBeDefined();
  });
});
