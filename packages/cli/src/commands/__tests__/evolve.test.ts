import { Command } from 'commander';
import { evolveCommand } from '../evolve';

describe('evolveCommand', () => {
  it('returns a Commander Command with name evolve', () => {
    const cmd = evolveCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('evolve');
  });

  it('has all expected subcommands', () => {
    const cmd = evolveCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('delta');
    expect(names).toContain('decide');
    expect(names).toContain('run');
    expect(names).toContain('audit');
    expect(names).toContain('revalidate');
    expect(names).toContain('report');
    expect(names).toContain('plan');
    expect(names).toContain('apply');
    expect(names).toContain('rollback');
  });

  it('has description', () => {
    const cmd = evolveCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
