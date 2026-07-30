import { Command } from 'commander';
import { realitySyncCommand } from '../reality-sync';

describe('reality-sync command', () => {
  it('returns a Command instance', () => {
    const cmd = realitySyncCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('reality-sync');
  });

  it('has daemon subcommand', () => {
    const cmd = realitySyncCommand();
    const daemonCmd = cmd.commands.find(c => c.name() === 'daemon');
    expect(daemonCmd).toBeDefined();
  });

  it('has sync subcommand', () => {
    const cmd = realitySyncCommand();
    const syncCmd = cmd.commands.find(c => c.name() === 'sync');
    expect(syncCmd).toBeDefined();
  });

  it('has profile subcommand', () => {
    const cmd = realitySyncCommand();
    const profileCmd = cmd.commands.find(c => c.name() === 'profile');
    expect(profileCmd).toBeDefined();
  });

  it('has intensify subcommand', () => {
    const cmd = realitySyncCommand();
    const intensifyCmd = cmd.commands.find(c => c.name() === 'intensify');
    expect(intensifyCmd).toBeDefined();
  });
});
