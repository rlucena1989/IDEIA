import { DefaultCLICommandRegistry } from '../registry';
import { CLICommand } from '../types';

describe('DefaultCLICommandRegistry', () => {
  let registry: DefaultCLICommandRegistry;

  beforeEach(() => {
    registry = new DefaultCLICommandRegistry();
  });

  it('should register and retrieve a command', () => {
    const command: CLICommand = {
      id: 'test.greet',
      name: 'greet',
      description: 'Greet someone',
      handler: jest.fn().mockResolvedValue(0),
    };
    registry.registerCommand(command);
    expect(registry.getCommand('greet')).toBe(command);
  });

  it('should return undefined for unknown command', () => {
    expect(registry.getCommand('nonexistent')).toBeUndefined();
  });

  it('should list all registered commands', () => {
    const cmd1: CLICommand = { id: 'test.hello', name: 'hello', description: '', handler: jest.fn().mockResolvedValue(0) };
    const cmd2: CLICommand = { id: 'test.bye', name: 'bye', description: '', handler: jest.fn().mockResolvedValue(0) };
    registry.registerCommand(cmd1);
    registry.registerCommand(cmd2);
    expect(registry.getCommands()).toHaveLength(2);
    expect(registry.getCommands()).toContainEqual(cmd1);
    expect(registry.getCommands()).toContainEqual(cmd2);
  });

  it('should execute a registered command with args and options', async () => {
    const handler = jest.fn().mockResolvedValue(0);
    const command: CLICommand = { id: 'test.exec', name: 'exec', description: '', handler };
    registry.registerCommand(command);

    const result = await registry.execute('exec', { name: 'world' }, { verbose: true });
    expect(handler).toHaveBeenCalledWith({ name: 'world' }, { verbose: true });
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it('should return error result for unknown command', async () => {
    const result = await registry.execute('unknown');
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('Unknown command');
  });

  it('should handle command handler errors gracefully', async () => {
    const command: CLICommand = {
      id: 'test.fail',
      name: 'fail',
      description: '',
      handler: jest.fn().mockRejectedValue(new Error('Something went wrong')),
    };
    registry.registerCommand(command);
    const result = await registry.execute('fail');
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Something went wrong');
  });

  it('should execute with empty args and options by default', async () => {
    const handler = jest.fn().mockResolvedValue(0);
    const command: CLICommand = { id: 'test.noargs', name: 'noargs', description: '', handler };
    registry.registerCommand(command);
    await registry.execute('noargs');
    expect(handler).toHaveBeenCalledWith({}, {});
  });

  it('should measure execution duration', async () => {
    const handler = jest.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 10));
      return 0;
    });
    const command: CLICommand = { id: 'test.slow', name: 'slow', description: '', handler };
    registry.registerCommand(command);
    const result = await registry.execute('slow');
    expect(result.duration).toBeGreaterThanOrEqual(10);
  });
});
