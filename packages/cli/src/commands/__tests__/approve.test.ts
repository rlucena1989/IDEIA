import { approveCommand } from '../approve';
import { Command } from 'commander';

describe('approveCommand', () => {
  it('deve retornar um Command com nome approve', () => {
    const cmd = approveCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('approve');
  });

  it('deve ter subcomando request', () => {
    const cmd = approveCommand();
    const requestCmd = cmd.commands.find(c => c.name() === 'request');
    expect(requestCmd).toBeDefined();
    expect(requestCmd!.description()).toContain('Solicita');
  });

  it('deve ter subcomando grant', () => {
    const cmd = approveCommand();
    const grantCmd = cmd.commands.find(c => c.name() === 'grant');
    expect(grantCmd).toBeDefined();
    expect(grantCmd!.description()).toContain('Aprova');
  });

  it('deve ter subcomando deny', () => {
    const cmd = approveCommand();
    const denyCmd = cmd.commands.find(c => c.name() === 'deny');
    expect(denyCmd).toBeDefined();
    expect(denyCmd!.description()).toContain('Rejeita');
  });

  it('deve ter opcao --json em request', () => {
    const cmd = approveCommand();
    const requestCmd = cmd.commands.find(c => c.name() === 'request');
    const opts = requestCmd!.options.map(o => o.attributeName());
    expect(opts).toContain('json');
  });

  it('deve ter opcao --json em grant', () => {
    const cmd = approveCommand();
    const grantCmd = cmd.commands.find(c => c.name() === 'grant');
    const opts = grantCmd!.options.map(o => o.attributeName());
    expect(opts).toContain('json');
  });

  it('deve ter opcao --reason em request', () => {
    const cmd = approveCommand();
    const requestCmd = cmd.commands.find(c => c.name() === 'request');
    const opts = requestCmd!.options.map(o => o.attributeName());
    expect(opts).toContain('reason');
  });
});
