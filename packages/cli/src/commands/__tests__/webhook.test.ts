import { webhookCommand } from '../webhook';

describe('webhookCommand', () => {
  it('should return a Command object', () => {
    const cmd = webhookCommand();
    expect(cmd.name()).toBe('webhook');
  });

  it('should have subcommands', () => {
    const cmd = webhookCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('test');
    expect(names).toContain('list');
    expect(names).toContain('simulate');
  });

  it('should have description', () => {
    const cmd = webhookCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
