import { describe, it, expect } from '@jest/globals';
import { workflowCommand } from '../workflow';

describe('workflowCommand', () => {
  it('should create a command with correct name and description', () => {
    const cmd = workflowCommand();
    expect(cmd.name()).toBe('workflow');
    expect(cmd.description).toBe('Start the IDEIA IDE (alias for `ide` command)');
  });

  it('should have serve subcommand', () => {
    const cmd = workflowCommand();
    const serveCmd = cmd.commands.find(c => c.name() === 'serve');
    expect(serveCmd).toBeDefined();
    expect(serveCmd?.description).toBe('Start the IDE server');
  });

  it('should have port option on serve command', () => {
    const cmd = workflowCommand();
    const serveCmd = cmd.commands.find(c => c.name() === 'serve');
    const portOption = serveCmd?.options.find(o => o.long === '--port');
    expect(portOption).toBeDefined();
    expect(portOption?.defaultValue).toBe('3001');
  });
});
