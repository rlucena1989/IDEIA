import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

jest.mock('../utils/output', () => ({
  printLine: jest.fn(),
  printHeader: jest.fn(),
  printResult: jest.fn(),
}));

describe('complexityCommand', () => {
  it('returns a Command object with name complexity', () => {
    const { complexityCommand } = jest.requireActual('../commands/complexity') as { complexityCommand: () => { name: () => string; description: () => string; commands: Array<{ name: () => string }> } };
    const cmd = complexityCommand();
    expect(cmd.name()).toBe('complexity');
  });

  it('has description', () => {
    const { complexityCommand } = jest.requireActual('../commands/complexity') as { complexityCommand: () => { name: () => string; description: () => string; commands: Array<{ name: () => string }> } };
    const cmd = complexityCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has scan subcommand', () => {
    const { complexityCommand } = jest.requireActual('../commands/complexity') as { complexityCommand: () => { name: () => string; description: () => string; commands: Array<{ name: () => string }> } };
    const cmd = complexityCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('scan');
  });

  it('has report subcommand', () => {
    const { complexityCommand } = jest.requireActual('../commands/complexity') as { complexityCommand: () => { name: () => string; description: () => string; commands: Array<{ name: () => string }> } };
    const cmd = complexityCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('report');
  });
});
