import { success, failure } from '../types/cli-result';
import { createCommandRunner, buildContext } from '../infra/command-runner';
import { sampleResolveDocumentForTask } from '../domain/doc-service';
import type { CommandContext } from '../types/cli-result';

describe('cli-result types', () => {
  it('success returns ok=true with code 0', () => {
    const result = success('all good');
    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.message).toBe('all good');
  });

  it('success includes optional data', () => {
    const result = success('with data', { id: 1 });
    expect(result.data).toEqual({ id: 1 });
  });

  it('failure returns ok=false with code 1', () => {
    const result = failure('something went wrong');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toBe('something went wrong');
  });

  it('failure includes error details', () => {
    const result = failure('error', 42, { detail: 'x' });
    expect(result.code).toBe(42);
    expect(result.error?.details).toEqual({ detail: 'x' });
  });
});

describe('command-runner', () => {
  it('wraps successful handler', async () => {
    const handler = async (_ctx: CommandContext) => success('done');
    const runner = createCommandRunner(handler);
    const result = await runner(buildContext(['test']));
    expect(result.ok).toBe(true);
    expect(result.message).toBe('done');
  });

  it('wraps failing handler', async () => {
    const handler = async (_ctx: CommandContext) => failure('nope');
    const runner = createCommandRunner(handler);
    const result = await runner(buildContext(['test']));
    expect(result.ok).toBe(false);
    expect(result.message).toBe('nope');
  });

  it('catches thrown errors', async () => {
    const handler = async (_ctx: CommandContext) => { throw new Error('crash'); };
    const runner = createCommandRunner(handler);
    const result = await runner(buildContext(['test']));
    expect(result.ok).toBe(false);
    expect(result.message).toBe('crash');
  });

  it('catches non-Error throws', async () => {
    // eslint-disable-next-line no-throw-literal
    const handler = async (_ctx: CommandContext) => { throw 'string error'; };
    const runner = createCommandRunner(handler);
    const result = await runner(buildContext(['test']));
    expect(result.ok).toBe(false);
    expect(result.message).toBe('string error');
  });
});

describe('buildContext', () => {
  it('builds context with args and cwd', () => {
    const ctx = buildContext(['cmd', '--flag']);
    expect(ctx.args).toEqual(['cmd', '--flag']);
    expect(ctx.cwd).toBeTruthy();
    expect(ctx.env).toBeTruthy();
    expect(ctx.dryRun).toBe(false);
  });

  it('builds context with dryRun', () => {
    const ctx = buildContext(['test'], true);
    expect(ctx.dryRun).toBe(true);
  });
});

describe('doc-service sample resolver', () => {
  it('resolves tests task type', () => {
    const result = sampleResolveDocumentForTask('tests');
    expect(result.primary).toBe('coverage-autonomy-procedure.md');
    expect(result.blocked).toBe(false);
  });

  it('resolves strategy task type', () => {
    const result = sampleResolveDocumentForTask('strategy');
    expect(result.primary).toBe('master-plan.md');
    expect(result.blocked).toBe(false);
  });

  it('resolves default task type', () => {
    const result = sampleResolveDocumentForTask('execution');
    expect(result.primary).toBe('current-task.md');
    expect(result.blocked).toBe(false);
  });
});
