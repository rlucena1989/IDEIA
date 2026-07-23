export interface MergedContextField<T = unknown> {
  value: T;
  sourceContextId: string;
  reason: string;
}

export interface MergedContext {
  mergedAt: string;
  sources: string[];
  fields: Record<string, MergedContextField>;
}

export function mergeContexts(contexts: Array<Record<string, unknown>>, sourceIds: string[]): MergedContext {
  const fields: Record<string, MergedContextField> = {};

  for (let i = 0; i < contexts.length; i++) {
    const context = contexts[i]!;
    for (const [key, value] of Object.entries(context)) {
      if (!(key in fields)) {
        fields[key] = {
          value,
          sourceContextId: sourceIds[i] ?? `context-${i + 1}`,
          reason: 'first occurrence',
        };
      }
    }
  }

  return {
    mergedAt: new Date().toISOString(),
    sources: sourceIds,
    fields,
  };
}
