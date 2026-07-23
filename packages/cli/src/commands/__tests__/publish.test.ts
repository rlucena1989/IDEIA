import { Command } from 'commander';
import { publishCommand } from '../publish';

describe('publishCommand', () => {
  it('returns a Commander Command with name publish', () => {
    const cmd = publishCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('publish');
  });

  it('has all expected subcommands', () => {
    const cmd = publishCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('plan');
    expect(names).toContain('validate');
    expect(names).toContain('run');
    expect(names).toContain('report');
  });

  it('has description', () => {
    const cmd = publishCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
