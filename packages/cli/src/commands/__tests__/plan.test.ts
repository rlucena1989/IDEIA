import { Command } from 'commander';
import { planCommand } from '../plan';

describe('planCommand', () => {
  it('returns a Commander Command with name plan', () => {
    const cmd = planCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('plan');
  });

  it('has subcommands', () => {
    const cmd = planCommand();
    const subCommands = cmd.commands.map(c => c.name());
    expect(subCommands).toContain('create');
    expect(subCommands).toContain('validate');
    expect(subCommands).toContain('status');
  });

  it('has description', () => {
    const cmd = planCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
