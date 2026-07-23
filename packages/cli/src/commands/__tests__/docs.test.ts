import { Command } from 'commander';
import { docsCommand } from '../docs';

describe('docsCommand', () => {
  it('returns a Commander Command with name docs', () => {
    const cmd = docsCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('docs');
  });

  it('has all expected subcommands', () => {
    const cmd = docsCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('resolve');
    expect(names).toContain('audit');
    expect(names).toContain('sources');
    expect(names).toContain('policy');
    expect(names).toContain('status');
    expect(names).toContain('generate');
    expect(names).toContain('sync');
    expect(names).toContain('publish');
  });

  it('has description', () => {
    const cmd = docsCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
