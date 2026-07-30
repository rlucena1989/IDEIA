import type { AdapterBase } from './adapter-base';
import { createLogger } from '@ideia/logger';
const logger = createLogger('registry');

export interface AdapterRegistration {
  name: string;
  language: string;
  adapter: AdapterBase;
}

export class AdapterRegistry {
  private adapters = new Map<string, AdapterRegistration>();

  register(adapter: AdapterBase): void {
    this.adapters.set(adapter.name, {
      name: adapter.name,
      language: adapter.language,
      adapter,
    });
  }

  get(name: string): AdapterBase | undefined {
    return this.adapters.get(name)?.adapter;
  }

  getByLanguage(language: string): AdapterBase | undefined {
    for (const entry of this.adapters.values()) {
      if (entry.language === language) return entry.adapter;
    }
    return undefined;
  }

  getAll(): AdapterRegistration[] {
    return Array.from(this.adapters.values());
  }

  getLanguages(): string[] {
    return Array.from(this.adapters.values()).map((e) => e.language);
  }

  detect(projectRoot: string): AdapterBase[] {
    const detected: AdapterBase[] = [];
    for (const entry of this.adapters.values()) {
      if (entry.adapter.detect(projectRoot)) detected.push(entry.adapter);
    }
    return detected;
  }
}

export const adapterRegistry = new AdapterRegistry();
