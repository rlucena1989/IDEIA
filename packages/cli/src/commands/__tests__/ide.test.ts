jest.mock('../../ide/ide-server', () => ({
  startIdeServer: jest.fn().mockResolvedValue({
    stop: jest.fn().mockResolvedValue(undefined),
  }),
}));

import { Command } from 'commander';
import { ideCommand } from '../ide';

describe('ideCommand', () => {
  it('returns a Commander Command with name ide', () => {
    const cmd = ideCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('ide');
  });

  it('has description', () => {
    const cmd = ideCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has --port option with default 3001', () => {
    const cmd = ideCommand();
    const opt = cmd.options.find(o => o.long === '--port');
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe('3001');
  });

  it('has --root option', () => {
    const cmd = ideCommand();
    const opt = cmd.options.find(o => o.long === '--root');
    expect(opt).toBeDefined();
  });

  it('has --host option with default 127.0.0.1', () => {
    const cmd = ideCommand();
    const opt = cmd.options.find(o => o.long === '--host');
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe('127.0.0.1');
  });

  it('has --daemon option', () => {
    const cmd = ideCommand();
    const opt = cmd.options.find(o => o.long === '--daemon');
    expect(opt).toBeDefined();
  });
});
