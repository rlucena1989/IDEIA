export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonParseWithSchema<T>(text: string, schema: { parse: (data: unknown) => T }, fallback: T): T {
  try {
    const parsed = JSON.parse(text);
    return schema.parse(parsed);
  } catch {
    return fallback;
  }
}
