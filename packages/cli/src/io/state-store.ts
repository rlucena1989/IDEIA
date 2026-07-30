import { getIO } from './index';
import { createLogger } from '@ideia/logger';
import type { IOContainer } from './interfaces';
const logger = createLogger('state-store');

export interface StoredState {
  currentProject?: string;
  lastCommand?: string;
  lastAuditTimestamp?: string;
  phase?: string;
  autonomyLevel?: number;
  coverageScore?: number;
  gapsResolved?: number;
  [key: string]: unknown;
}

export class StateStore {
  private readonly stateDir: string;
  private readonly stateFile: string;
  private cache: StoredState | null = null;

  constructor(stateDir?: string) {
    this.stateDir = stateDir ?? '~/.ideia';
    this.stateFile = this.stateDir + '/state.json';
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

  load(): StoredState {
    if (this.cache) return this.cache;
    const resolved = this.resolvePath(this.stateFile);
    try {
      if (this.io.fs.exists(resolved)) {
        const raw = this.io.fs.read(resolved, 'utf-8');
        this.cache = JSON.parse(raw) as StoredState;
        return this.cache as StoredState;
      }
    } catch {
      this.cache = {};
    }
    this.cache = {};
    return this.cache;
  }

  save(): void {
    const resolved = this.resolvePath(this.stateFile);
    const dir = this.resolvePath(this.stateDir);
    this.io.fs.ensureDir(dir);
    this.io.fs.write(resolved, JSON.stringify(this.load(), null, 2));
  }

  getState<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const state = this.load();
    return (state[key] as T) ?? defaultValue;
  }

  setState(key: string, value: unknown): void {
    const state = this.load();
    state[key] = value;
    this.cache = state;
    this.save();
  }

  delete(key: string): void {
    const state = this.load();
    delete state[key];
    this.cache = state;
    this.save();
  }

  getAll(): StoredState {
    return { ...this.load() };
  }

  clear(): void {
    this.cache = {};
    this.save();
  }
}
