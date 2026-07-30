import { getIO } from './index';
import { createLogger } from '@ideia/logger';
import type { IOContainer } from './interfaces';
const logger = createLogger('settings-store');

export interface StoredSettings {
  theme?: 'dark' | 'light' | 'auto';
  language?: string;
  editor?: string;
  llmProvider?: string;
  llmModel?: string;
  autonomyLevel?: number;
  autoAudit?: boolean;
  notifications?: boolean;
  [key: string]: unknown;
}

export class SettingsStore {
  private readonly configDir: string;
  private readonly configFile: string;
  private cache: StoredSettings | null = null;

  constructor(configDir?: string) {
    this.configDir = configDir ?? '~/.ideia';
    this.configFile = this.configDir + '/settings.json';
  }

  private get io(): IOContainer {
    return getIO();
  }

  private resolvePath(p: string): string {
    if (p.startsWith('~/')) {
      const home = process.env['HOME'] || process.env['USERPROFILE'] || '~';
      return home + p.slice(1);
    }
    return p;
  }

  load(): StoredSettings {
    if (this.cache) return this.cache;
    const resolved = this.resolvePath(this.configFile);
    try {
      if (this.io.fs.exists(resolved)) {
        const raw = this.io.fs.read(resolved, 'utf-8');
        this.cache = JSON.parse(raw) as StoredSettings;
        return this.cache as StoredSettings;
      }
    } catch {
      this.cache = {};
    }
    this.cache = {};
    return this.cache;
  }

  save(): void {
    const resolved = this.resolvePath(this.configFile);
    const dir = this.resolvePath(this.configDir);
    this.io.fs.ensureDir(dir);
    this.io.fs.write(resolved, JSON.stringify(this.load(), null, 2));
  }

  get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const settings = this.load();
    return (settings[key] as T) ?? defaultValue;
  }

  set<T = unknown>(key: string, value: T): void {
    const settings = this.load();
    settings[key] = value as unknown;
    this.cache = settings;
    this.save();
  }

  delete(key: string): void {
    const settings = this.load();
    delete settings[key];
    this.cache = settings;
    this.save();
  }

  getAll(): StoredSettings {
    return { ...this.load() };
  }

  clear(): void {
    this.cache = {};
    this.save();
  }
}
