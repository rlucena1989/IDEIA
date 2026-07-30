import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('config-service');

export interface ConfigValue {
  value: unknown;
  timestamp: string;
  source: 'default' | 'env' | 'file' | 'runtime';
}

export interface ConfigChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
}

export class ConfigService {
  private config: Map<string, ConfigValue> = new Map();
  private onConfigChangedEmitter = new Emitter<ConfigChange>();

  get onConfigChanged() {
    return this.onConfigChangedEmitter.event;
  }

  constructor(defaults?: Record<string, unknown>) {
    if (defaults) {
      for (const [key, value] of Object.entries(defaults)) {
        this.config.set(key, {
          value,
          timestamp: new Date().toISOString(),
          source: 'default',
        });
      }
    }
    this.loadFromEnv();
  }

  get<T>(key: string, defaultValue?: T): T {
    const entry = this.config.get(key);
    return entry !== undefined ? (entry.value as T) : (defaultValue as T);
  }

  set(key: string, value: unknown, source: 'runtime' = 'runtime'): void {
    const oldValue = this.config.get(key)?.value;
    this.config.set(key, {
      value,
      timestamp: new Date().toISOString(),
      source,
    });

    this.onConfigChangedEmitter.fire({
      key,
      oldValue,
      newValue: value,
      timestamp: new Date().toISOString(),
    });
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  delete(key: string): boolean {
    const oldValue = this.config.get(key)?.value;
    const deleted = this.config.delete(key);
    
    if (deleted) {
      this.onConfigChangedEmitter.fire({
        key,
        oldValue,
        newValue: undefined,
        timestamp: new Date().toISOString(),
      });
    }
    
    return deleted;
  }

  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of this.config) {
      result[key] = entry.value;
    }
    return result;
  }

  clear(): void {
    this.config.clear();
  }

  private loadFromEnv(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.config.set(key, {
          value,
          timestamp: new Date().toISOString(),
          source: 'env',
        });
      }
    }
  }

  reloadFromEnv(): void {
    this.loadFromEnv();
  }
}

export function createConfigService(defaults?: Record<string, unknown>): ConfigService {
  return new ConfigService(defaults);
}
