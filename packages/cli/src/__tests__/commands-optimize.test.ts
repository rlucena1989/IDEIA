import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

jest.mock('../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  finish: jest.fn(),
}));

jest.mock('../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      exists: jest.fn(() => false),
      read: jest.fn(() => ''),
      write: jest.fn(),
    },
  })),
}));

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
  execFileSync: jest.fn(() => ({ toString: () => 'ok' })),
}));

describe('optimizeCommand', () => {
  it('returns a Command object with name optimize', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    expect(cmd.name()).toBe('optimize');
  });

  it('has description', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has run subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('run');
  });

  it('has status subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('status');
  });

  it('has validate subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('validate');
  });

  it('has classify subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('classify');
  });

  it('has explain subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('explain');
  });

  it('has dry-run subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('dry-run');
  });

  it('has serve subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('serve');
  });

  it('has budget-calculate subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('budget-calculate');
  });

  it('has budget-check subcommand', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('budget-check');
  });

  it('has token-economy subcommand group', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const tokenEconomy = cmd.commands.find((c: { name: () => string }) => c.name() === 'token-economy');
    expect(tokenEconomy).toBeDefined();
  });

  it('run subcommand has --pipeline option', () => {
    const { optimizeCommand } = require('../commands/optimize');
    const cmd = optimizeCommand();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run');
    expect(run.options.some((o: { attributeName: () => string }) => o.attributeName() === 'pipeline')).toBe(true);
  });
});
