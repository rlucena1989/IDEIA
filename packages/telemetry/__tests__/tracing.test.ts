import { withTrace, traceSync, wrapAsyncFn, measure, getTraceContext } from '../src/tracing';
import { resetTelemetry } from '../src/opentelemetry';

beforeEach(() => {
  resetTelemetry();
});

describe('traceSync', () => {
  it('returns the result of the sync function', () => {
    const result = traceSync('test', () => 42);
    expect(result).toBe(42);
  });

  it('re-throws errors from the sync function', () => {
    expect(() => traceSync('error', () => { throw new Error('boom'); })).toThrow('boom');
  });
});

describe('withTrace', () => {
  it('returns the result of the async function', async () => {
    const result = await withTrace('test', async () => 'done');
    expect(result).toBe('done');
  });

  it('re-throws errors from the async function', async () => {
    await expect(withTrace('error', async () => { throw new Error('async fail'); })).rejects.toThrow('async fail');
  });

  it('accepts optional trace context', async () => {
    const result = await withTrace('child', async (span) => {
      span.setAttribute('key', 'value');
      return 'ok';
    }, { traceId: 'parent-1', parentSpanId: 'span-0' });
    expect(result).toBe('ok');
  });
});

describe('wrapAsyncFn', () => {
  it('wraps an async function with tracing', async () => {
    const wrapped = wrapAsyncFn('wrapped', async (x: number) => x * 2);
    const result = await wrapped(21);
    expect(result).toBe(42);
  });
});

describe('measure', () => {
  it('returns result and duration', async () => {
    const { result, durationMs } = await measure('test', async () => 'fast');
    expect(result).toBe('fast');
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('getTraceContext', () => {
  it('returns undefined when no active spans', () => {
    expect(getTraceContext()).toBeUndefined();
  });

  it('returns context during active trace', async () => {
    await withTrace('parent', async () => {
      const ctx = getTraceContext();
      expect(ctx).toBeDefined();
      expect(ctx!.traceId).toBeDefined();
    });
  });
});
