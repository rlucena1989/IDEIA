import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
import { SettingsStore } from '../io/settings-store';
const logger = createLogger('config-use-case');

export interface ConfigOutput {
  key: string;
  value: unknown;
  scope: 'global' | 'project' | 'local';
}

export interface ConfigListOutput {
  entries: Record<string, unknown>;
  count: number;
}

export class ConfigUseCase {
  private store: SettingsStore;

  constructor() {
    this.store = new SettingsStore();
  }

  get(key: string): CliCommandResult<ConfigOutput> {
    const value = this.store.get(key);
    if (value === undefined) {
      return failure(`Config key not found: "${key}"`, 1) as CliCommandResult<ConfigOutput>;
    }
    return success(`Config "${key}" = ${JSON.stringify(value)}`, {
      key,
      value,
      scope: 'project',
    });
  }

  set(key: string, value: unknown): CliCommandResult<ConfigOutput> {
    this.store.set(key, value);
    return success(`Config "${key}" set to ${JSON.stringify(value)}`, {
      key,
      value,
      scope: 'project',
    });
  }

  delete(key: string): CliCommandResult<ConfigOutput> {
    const existing = this.store.get(key);
    if (existing === undefined) {
      return failure(`Config key not found: "${key}"`, 1) as CliCommandResult<ConfigOutput>;
    }
    this.store.delete(key);
    return success(`Config "${key}" deleted`, {
      key,
      value: existing,
      scope: 'project',
    });
  }

  list(prefix?: string): CliCommandResult<ConfigListOutput> {
    const all = this.store.getAll();
    const entries = prefix
      ? Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith(prefix)))
      : all;
    return success(`${Object.keys(entries).length} config entries`, {
      entries,
      count: Object.keys(entries).length,
    });
  }

  validate(input: unknown): CliCommandResult<{ valid: boolean; errors: string[] }> {
    if (typeof input !== 'object' || input === null) {
      return failure('Config must be a non-null object', 1, { valid: false, errors: ['Must be a non-null object'] }) as CliCommandResult<{ valid: boolean; errors: string[] }>;
    }
    const errors: string[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (typeof key !== 'string' || key.length === 0) {
        errors.push('All keys must be non-empty strings');
      }
      if (key.startsWith('_')) {
        errors.push(`Key "${key}" starts with underscore (reserved)`);
      }
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const nested = Object.keys(value as Record<string, unknown>);
        if (nested.some(n => n.startsWith('_'))) {
          errors.push(`Nested config in "${key}" contains reserved keys`);
        }
      }
    }
    const valid = errors.length === 0;
    if (valid) {
      return success('Config is valid', { valid: true, errors: [] });
    }
    return failure('Config validation failed', 1, { valid: false, errors }) as CliCommandResult<{ valid: boolean; errors: string[] }>;
  }
}
