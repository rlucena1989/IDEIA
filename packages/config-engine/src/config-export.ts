import { createLogger } from '@ideia/logger';
import type { FullConfig, ConfigDiff, ImportResult, ConfigValue } from './types';
import type { ConfigEngine } from './config-engine';

const _log = createLogger('config-export');

interface ExportPayload {
  version: number;
  exportedAt: string;
  scope: string;
  anonymized: boolean;
  config: FullConfig;
  metadata?: Record<string, unknown>;
}

function anonymizeConfig(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['token', 'secret', 'password', 'key', 'credential', 'apiKey', 'auth'];
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = anonymizeConfig(value as Record<string, unknown>);
    } else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '***ANONYMIZED***';
    } else {
      result[key] = value;
    }
  }
  return result;
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, ConfigValue> {
  const result: Record<string, ConfigValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value as ConfigValue;
    }
  }
  return result;
}

function computeConfigDiff(existing: Record<string, unknown>, incoming: Record<string, unknown>): ConfigDiff[] {
  const flatExisting = flattenKeys(existing);
  const flatIncoming = flattenKeys(incoming);
  const changes: ConfigDiff[] = [];
  const allKeys = new Set([...Object.keys(flatExisting), ...Object.keys(flatIncoming)]);
  for (const key of allKeys) {
    const oldVal = flatExisting[key];
    const newVal = flatIncoming[key];
    if (oldVal === undefined && newVal !== undefined) {
      changes.push({ path: key, oldValue: undefined, newValue: newVal, operation: 'added' });
    } else if (oldVal !== undefined && newVal === undefined) {
      changes.push({ path: key, oldValue: oldVal, newValue: undefined, operation: 'removed' });
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ path: key, oldValue: oldVal, newValue: newVal, operation: 'modified' });
    }
  }
  return changes;
}

export function exportConfig(
  engine: ConfigEngine,
  scope: 'global' | 'project' | 'all',
  anonymized = false,
): string {
  let config: FullConfig;
  switch (scope) {
    case 'global':
      config = engine.getGlobal();
      break;
    case 'project':
      config = engine.getProject();
      break;
    case 'all':
      config = engine.getFull();
      break;
  }

  let payloadConfig = config;
  if (anonymized) {
    payloadConfig = anonymizeConfig(config as Record<string, unknown>) as FullConfig;
  }

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope,
    anonymized,
    config: payloadConfig,
  };

  return JSON.stringify(payload, null, 2);
}

export async function importConfig(
  engine: ConfigEngine,
  data: string,
  dryRun = false,
  validateOnly = false,
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    applied: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    changes: [],
  };

  let payload: ExportPayload;
  try {
    payload = JSON.parse(data) as ExportPayload;
  } catch (_err) {
    result.errors.push(`Invalid JSON: ${String(err)}`);
    return result;
  }

  if (payload.version !== 1) {
    result.errors.push(`Unsupported export version: ${payload.version}`);
    return result;
  }

  const incomingConfig = payload.config as Record<string, unknown>;
  const existingConfig = engine.getFull() as Record<string, unknown>;
  const changes = computeConfigDiff(existingConfig, incomingConfig);

  result.changes = changes;

  if (changes.length === 0) {
    result.success = true;
    result.warnings.push('No changes detected — config is identical');
    return result;
  }

  if (validateOnly || dryRun) {
    for (const change of changes) {
      if (change.operation === 'removed') {
        result.warnings.push(`Skipping removal of '${change.path}' — import does not delete existing keys`);
        result.skipped++;
      } else {
        try {
          if (change.operation === 'modified') {
            engine.set(change.path, change.newValue ?? '');
          } else {
            engine.set(change.path, change.newValue ?? '');
          }
          result.applied++;
        } catch (_err) {
          result.errors.push(`Failed to set '${change.path}': ${String(err)}`);
          result.skipped++;
        }
      }
    }
    result.success = result.errors.length === 0;
    return result;
  }

  for (const change of changes) {
    if (change.operation === 'removed') {
      result.warnings.push(`Skipping removal of '${change.path}' — import does not delete existing keys`);
      result.skipped++;
      continue;
    }
    try {
      await engine.set(change.path, change.newValue ?? '');
      result.applied++;
    } catch (_err) {
      result.errors.push(`Failed to set '${change.path}': ${String(err)}`);
      result.skipped++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}
