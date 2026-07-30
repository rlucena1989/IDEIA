function sanitizeUnknown(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(sanitizeUnknown);
  }
  if (input !== null && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeUnknown(value);
    }
    return sanitized;
  }
  return input;
}

export function sanitizeIpcParams<T>(input: T): T {
  return sanitizeUnknown(input) as T;
}

export function deepFreeze<T extends object>(obj: T): T {
  for (const value of Object.values(obj)) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}
