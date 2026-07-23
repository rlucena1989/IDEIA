import { workflowCommand } from '../workflow';

describe('workflowCommand', () => {
  it('should be defined', () => {
    expect(workflowCommand).toBeDefined();
  });

  it('should return Command with serve subcommand', () => {
    const cmd = workflowCommand();
    expect(cmd.name()).toBe('workflow');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('serve');
  });
});
