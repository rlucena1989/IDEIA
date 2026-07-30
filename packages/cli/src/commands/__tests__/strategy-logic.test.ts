import { Command } from 'commander';
import { strategyCommand } from '../strategy';

describe('strategy command', () => {
  it('returns a Command instance', () => {
    const cmd = strategyCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('strategy');
  });

  it('has target subcommand', () => {
    const cmd = strategyCommand();
    const targetCmd = cmd.commands.find(c => c.name() === 'target');
    expect(targetCmd).toBeDefined();
  });

  it('has roadmap subcommand', () => {
    const cmd = strategyCommand();
    const roadmapCmd = cmd.commands.find(c => c.name() === 'roadmap');
    expect(roadmapCmd).toBeDefined();
  });

  it('has gap subcommand', () => {
    const cmd = strategyCommand();
    const gapCmd = cmd.commands.find(c => c.name() === 'gap');
    expect(gapCmd).toBeDefined();
  });

  it('has prioritize subcommand', () => {
    const cmd = strategyCommand();
    const prioCmd = cmd.commands.find(c => c.name() === 'prioritize');
    expect(prioCmd).toBeDefined();
  });

  it('has evolution subcommand', () => {
    const cmd = strategyCommand();
    const evoCmd = cmd.commands.find(c => c.name() === 'evolution');
    expect(evoCmd).toBeDefined();
  });

  it('has report subcommand', () => {
    const cmd = strategyCommand();
    const reportCmd = cmd.commands.find(c => c.name() === 'report');
    expect(reportCmd).toBeDefined();
  });
});
