import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { PreferenceProvider, PreferenceScope } from './types';

export class DefaultPreferenceProvider implements PreferenceProvider {
  readonly scope: PreferenceScope;
  protected storage = new Map<string, unknown>();
  protected onChangedEmitter = new Emitter<{ key: string; value: unknown }>();

  get onPreferenceChanged() { return this.onChangedEmitter.event; }

  constructor(scope: PreferenceScope) {
    this.scope = scope;
  }

  get<T>(key: string): T | undefined {
    return this.storage.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
    this.onChangedEmitter.fire({ key, value });
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }

  keys(): string[] {
    return Array.from(this.storage.keys());
  }
}

export class DefaultPreferenceProviderChain {
  private providers: PreferenceProvider[] = [];

  constructor(providers: PreferenceProvider[]) {
    this.providers = providers.sort((a, b) => b.scope - a.scope);
  }

  get<T>(key: string): T | undefined {
    for (const provider of this.providers) {
      if (provider.has(key)) {
        return provider.get<T>(key);
      }
    }
    return undefined;
  }

  async set<T>(key: string, value: T, scope: PreferenceScope): Promise<void> {
    const provider = this.providers.find(p => p.scope === scope);
    if (provider) {
      await provider.set(key, value);
    }
  }

  inspect<T>(key: string): {
    default: T | undefined;
    user: T | undefined;
    workspace: T | undefined;
    folder: T | undefined;
    effective: T | undefined;
  } {
    const result: Record<string, T | undefined> = {
      default: undefined,
      user: undefined,
      workspace: undefined,
      folder: undefined,
    };
    for (const provider of this.providers) {
      if (provider.has(key)) {
        result[PreferenceScope[provider.scope].toLowerCase()] = provider.get<T>(key);
      }
    }
    return {
      default: result.default,
      user: result.user,
      workspace: result.workspace,
      folder: result.folder,
      effective: this.get<T>(key),
    };
  }
}
