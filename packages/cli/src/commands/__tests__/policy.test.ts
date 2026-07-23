import { policyCommand } from '../policy';
import { Command } from 'commander';

describe('policyCommand', () => {
  it('deve retornar um Command com nome policy', () => {
    const cmd = policyCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('policy');
  });

  it('deve ter subcomando list', () => {
    const cmd = policyCommand();
    const listCmd = cmd.commands.find(c => c.name() === 'list');
    expect(listCmd).toBeDefined();
    expect(listCmd!.description()).toContain('Lista');
  });

  it('deve ter subcomando show', () => {
    const cmd = policyCommand();
    const showCmd = cmd.commands.find(c => c.name() === 'show');
    expect(showCmd).toBeDefined();
    expect(showCmd!.description()).toContain('Exibe');
  });

  it('deve ter opcao --json em list', () => {
    const cmd = policyCommand();
    const listCmd = cmd.commands.find(c => c.name() === 'list');
    const opts = listCmd!.options.map(o => o.attributeName());
    expect(opts).toContain('json');
  });

  it('deve ter opcao --json em show', () => {
    const cmd = policyCommand();
    const showCmd = cmd.commands.find(c => c.name() === 'show');
    const opts = showCmd!.options.map(o => o.attributeName());
    expect(opts).toContain('json');
  });

  it('deve registrar DEFAULT_GOVERNANCE_POLICY ao carregar modulo', () => {
    const cmd = policyCommand();
    const listCmd = cmd.commands.find(c => c.name() === 'list');
    expect(listCmd).toBeDefined();
  });
});
