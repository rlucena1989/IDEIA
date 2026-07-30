import { Command } from 'commander';
import { memoryCommand } from '../memory';

jest.mock('@ideia/memory-store', () => ({
  MemoryStore: jest.fn().mockImplementation(() => ({
    list: jest.fn().mockReturnValue([]),
    findByCategory: jest.fn().mockReturnValue([]),
    findBySeverity: jest.fn().mockReturnValue([]),
    search: jest.fn().mockReturnValue([]),
  })),
  createMemoryRecord: jest.fn(),
}));

jest.mock('../../memory/memory-index', () => ({
  buildMemoryIndex: jest.fn().mockReturnValue({}),
}));

jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn().mockReturnValue({ ok: true }),
}));

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('memoryCommand', () => {
  it('returns a Commander Command with name memory', () => {
    const cmd = memoryCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('memory');
  });

  it('has description', () => {
    const cmd = memoryCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-command list', () => {
    const cmd = memoryCommand();
    const sub = cmd.commands.find((c) => c.name() === 'list');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command query', () => {
    const cmd = memoryCommand();
    const sub = cmd.commands.find((c) => c.name() === 'query');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command export', () => {
    const cmd = memoryCommand();
    const sub = cmd.commands.find((c) => c.name() === 'export');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });
});
