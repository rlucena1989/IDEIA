import type { CommandContext } from '../../types/cli-result';
import { createCommandRunner, buildContext } from '../command-runner';

describe('createCommandRunner', () => {
  it('returns handler result on success', async () => {
    const handler = jest.fn().mockResolvedValue({ ok: true, code: 0, message: 'ok' });
    const runner = createCommandRunner(handler);
    const ctx: CommandContext = { args: [], cwd: '/', env: {}, dryRun: false };
    const result = await runner(ctx);
    expect(result).toEqual({ ok: true, code: 0, message: 'ok' });
    expect(handler).toHaveBeenCalledWith(ctx);
  });

  it('wraps thrown Error with code 1', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('something broke'));
    const runner = createCommandRunner(handler);
    const ctx: CommandContext = { args: [], cwd: '/', env: {} };
    const result = await runner(ctx);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toBe('something broke');
    expect(result.error!.name).toBe('Error');
  });

  it('wraps non-Error throws as string', async () => {
    const handler = jest.fn().mockRejectedValue('string error');
    const runner = createCommandRunner(handler);
    const ctx: CommandContext = { args: [], cwd: '/', env: {} };
    const result = await runner(ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('string error');
  });
});

describe('buildContext', () => {
  it('sets args and dryRun from parameters', () => {
    const ctx = buildContext(['deploy', '--env=prod'], true);
    expect(ctx.args).toEqual(['deploy', '--env=prod']);
    expect(ctx.dryRun).toBe(true);
  });

  it('uses process.cwd() for cwd', () => {
    const ctx = buildContext([]);
    expect(ctx.cwd).toBe(process.cwd());
  });

  it('spreads process.env', () => {
    const ctx = buildContext([]);
    expect(ctx.env).toEqual(process.env);
  });

  it('defaults dryRun to false', () => {
    const ctx = buildContext([]);
    expect(ctx.dryRun).toBe(false);
  });
});
