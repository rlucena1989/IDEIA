import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';

export enum PreferenceScope {
  Default = 0,
  User = 1,
  Workspace = 2,
  Folder = 3,
}

export interface PreferenceProperty {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  description?: string;
  enum?: string[];
  scope?: PreferenceScope;
  minimum?: number;
  maximum?: number;
}

export interface PreferenceSchema {
  id: string;
  properties: PreferenceProperty[];
  title?: string;
  description?: string;
}

export interface PreferenceSchemaRegistry {
  register(schema: PreferenceSchema): Disposable;
  getSchema(id: string): PreferenceSchema | undefined;
  getProperty(key: string): PreferenceProperty | undefined;
  getAllProperties(): PreferenceProperty[];
  validate(key: string, value: unknown): boolean;
}

export interface PreferenceProvider {
  readonly scope: PreferenceScope;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): Promise<void>;
  has(key: string): boolean;
  keys(): string[];
  onPreferenceChanged: Event<{ key: string; value: unknown }>;
}

export interface PreferenceService {
  get<T>(key: string, scope?: PreferenceScope): T | undefined;
  set<T>(key: string, value: T, scope?: PreferenceScope): Promise<void>;
  inspect<T>(key: string): PreferenceInspectResult<T> | undefined;
  has(key: string): boolean;
  onPreferenceChanged: Event<{ key: string; value: unknown; scope: PreferenceScope }>;
}

export interface PreferenceInspectResult<T> {
  default: T | undefined;
  user: T | undefined;
  workspace: T | undefined;
  folder: T | undefined;
  effective: T | undefined;
}

export interface PreferenceProxy {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

export interface PreferenceFileWatcher {
  watch(preferenceFile: string): Disposable;
  onFileChanged: Event<string>;
}

export interface PreferenceMigration {
  fromVersion: number;
  toVersion: number;
  migrate(data: Record<string, unknown>): Record<string, unknown>;
}

export interface PreferenceMigrationManager {
  register(migration: PreferenceMigration): Disposable;
  migrate(fromVersion: number, toVersion: number, data: Record<string, unknown>): Record<string, unknown>;
  getCurrentVersion(): number;
}
