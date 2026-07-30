import { Command } from 'commander';
import { CLIAdapter } from '../cli-adapter';
import type { CommandHandler} from '../../types/cli-result';

describe('CLIAdapter', () => {
  let program: Command;
  let adapter: CLIAdapter;

  beforeEach(() => {
    program = new Command();
    adapter = new CLIAdapter(program);
  });

  it('should register and handle a command', async () => {
    const handler: CommandHandler = async () => ({
      ok: true, code: 0, message: 'done', data: { value: 42 },
    });
    adapter.register('test', handler);
    const result = await adapter.handle(['node', 'cli.js', 'test']);
    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.message).toBe('OK');
  });

  it('should return error for unknown command', async () => {
    const result = await adapter.handle(['node', 'cli.js', 'unknown']);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toContain('Unknown command');
  });

  it('should return error when handler throws', async () => {
    const handler: CommandHandler = async () => {
      throw new Error('runtime error');
    };
    adapter.register('fail', handler);
    const result = await adapter.handle(['node', 'cli.js', 'fail']);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.error?.message).toBe('runtime error');
  });

  it('should output JSON when --json flag is present', async () => {
    const handler: CommandHandler = async () => ({
      ok: true, code: 0, message: 'done', data: { x: 1 },
    });
    adapter.register('json-test', handler);
    const result = await adapter.handle(['node', 'cli.js', 'json-test', '--json']);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ x: 1 });
  });

  it('should include verbose message when --verbose flag is present', async () => {
    const handler: CommandHandler = async () => ({
      ok: true, code: 0, message: 'Verbose details here', data: {},
    });
    adapter.register('verbose-test', handler);
    const result = await adapter.handle(['node', 'cli.js', 'verbose-test', '--verbose']);
    expect(result.message).toBe('Verbose details here');
  });
});
