// Inlined from @ideia/diff-engine to avoid rootDir boundary issues
import { createLogger } from '@ideia/logger';
import { readFileSync } from 'node:fs';
const logger = createLogger('differ');

export interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DiffResult {
  specType: string;
  total: number;
  breaking: { field: string; change: string }[];
  nonBreaking: { field: string; change: string }[];
  entries: DiffEntry[];
}

export function deepDiff(oldObj: Record<string, unknown>, newObj: Record<string, unknown>, path = ''): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    if (!(key in oldObj)) {
      entries.push({ path: keyPath, type: 'added', newValue: newObj[key] });
    } else if (!(key in newObj)) {
      entries.push({ path: keyPath, type: 'removed', oldValue: oldObj[key] });
    } else if (typeof oldObj[key] === 'object' && typeof newObj[key] === 'object' && oldObj[key] !== null && newObj[key] !== null) {
      entries.push(...deepDiff(oldObj[key] as Record<string, unknown>, newObj[key] as Record<string, unknown>, keyPath));
    } else if (oldObj[key] !== newObj[key]) {
      entries.push({ path: keyPath, type: 'changed', oldValue: oldObj[key], newValue: newObj[key] });
    }
  }
  return entries;
}

function parseSpec(filePath: string): Record<string, unknown> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    logger.warn('Could not parse spec file: ${filePath}');
    return {};
  }
}

export function diffSpecs(oldPath: string, newPath: string): DiffResult {
  const oldSpec = parseSpec(oldPath);
  const newSpec = parseSpec(newPath);
  const entries = deepDiff(oldSpec, newSpec);
  const breaking = entries.filter(e => e.type === 'removed' || e.type === 'changed').map(e => ({ field: e.path, change: e.type === 'removed' ? 'removed' : 'modified' }));
  const nonBreaking = entries.filter(e => e.type === 'added').map(e => ({ field: e.path, change: 'added' }));
  return {
    specType: 'contract',
    total: entries.length,
    breaking,
    nonBreaking,
    entries,
  };
}
