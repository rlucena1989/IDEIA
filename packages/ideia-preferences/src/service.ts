import { Emitter } from '@ideia/core-contributions';
import { PreferenceService, PreferenceScope, PreferenceInspectResult } from './types';
import { DefaultPreferenceSchemaRegistry } from './schema';
import { DefaultPreferenceProviderChain } from './providers';

export class DefaultPreferenceService implements PreferenceService {
  private onChangedEmitter = new Emitter<{ key: string; value: unknown; scope: PreferenceScope }>();

  get onPreferenceChanged() { return this.onChangedEmitter.event; }

  constructor(
    private schemaRegistry: DefaultPreferenceSchemaRegistry,
    private providerChain: DefaultPreferenceProviderChain,
  ) {}

  get<T>(key: string, scope?: PreferenceScope): T | undefined {
    if (scope !== undefined) {
      return this.getByScope<T>(key, scope);
    }
    const effective = this.providerChain.get<T>(key);
    if (effective !== undefined) return effective;
    const prop = this.schemaRegistry.getProperty(key);
    return prop?.default as T | undefined;
  }

  async set<T>(key: string, value: T, scope?: PreferenceScope): Promise<void> {
    const targetScope = scope ?? PreferenceScope.User;
    if (!this.schemaRegistry.validate(key, value)) {
      throw new Error(`Invalid value for preference: ${key}`);
    }
    await this.providerChain.set(key, value, targetScope);
    this.onChangedEmitter.fire({ key, value, scope: targetScope });
  }

  inspect<T>(key: string): PreferenceInspectResult<T> | undefined {
    const prop = this.schemaRegistry.getProperty(key);
    if (!prop) return undefined;

    const chainResult = this.providerChain.inspect<T>(key);
    return {
      default: prop.default as T | undefined,
      user: chainResult.user,
      workspace: chainResult.workspace,
      folder: chainResult.folder,
      effective: chainResult.effective ?? prop.default as T | undefined,
    };
  }

  has(key: string): boolean {
    return this.schemaRegistry.getProperty(key) !== undefined;
  }

  private getByScope<T>(key: string, scope: PreferenceScope): T | undefined {
    const prop = this.schemaRegistry.getProperty(key);
    if (scope === PreferenceScope.Default) {
      return prop?.default as T | undefined;
    }
    return this.providerChain.get<T>(key);
  }
}
