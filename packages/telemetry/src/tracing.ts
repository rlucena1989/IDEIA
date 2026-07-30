import { performance } from 'node:perf_hooks';
import { createLogger } from '@ideia/logger';
import { getTelemetry } from './opentelemetry';

export interface TraceContext {
  traceId: string;
  parentSpanId?: string;
}

export function withTrace<T>(
  name: string,
  fn: (span: { end: (status?: 'ok' | 'error', error?: string) => void; setAttribute: (key: string, value: string | number | boolean) => void }) => Promise<T>,
  context?: TraceContext,
): Promise<T> {
  const telemetry = getTelemetry();
  const span = telemetry.startSpan(name, {
    parentSpanId: context?.parentSpanId,
  });

  const spanHandle = {
    end: (status?: 'ok' | 'error', error?: string) => {
      telemetry.endSpan(span.spanId, status, error);
    },
    setAttribute: (key: string, value: string | number | boolean) => {
      span.attributes[key] = value;
    },
  };

  return fn(spanHandle).then(
    (result) => {
      telemetry.endSpan(span.spanId, 'ok');
      return result;
    },
    (error) => {
      telemetry.endSpan(span.spanId, 'error', error instanceof Error ? error.message : String(error));
      throw error;
    },
  );
}

export function traceSync<T>(
  name: string,
  fn: () => T,
  context?: TraceContext,
): T {
  const telemetry = getTelemetry();
  const span = telemetry.startSpan(name, {
    parentSpanId: context?.parentSpanId,
  });

  try {
    const result = fn();
    telemetry.endSpan(span.spanId, 'ok');
    return result;
  } catch (_error) {
    telemetry.endSpan(span.spanId, 'error', _error instanceof Error ? _error.message : String(_error));
    throw _error;
  }
}

export function wrapAsyncFn<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    return withTrace(name, async () => fn(...args));
  };
}

export function getTraceContext(): TraceContext | undefined {
  const telemetry = getTelemetry();
  const active = telemetry.getActiveSpans();
  if (active.length === 0) return undefined;
  const last = active[active.length - 1];
  return { traceId: last.traceId, parentSpanId: last.spanId };
}

export async function measure<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  getTelemetry().recordHistogram(`duration.${name}`, durationMs);
  return { result, durationMs };
}
