import { PreferenceProxy } from './types';
import { createLogger } from '@ideia/logger';
import { DefaultPreferenceService } from './service';
const logger = createLogger('proxy');

export function createPreferenceProxy(service: DefaultPreferenceService): PreferenceProxy {
  const cache = new Map<string, unknown>();

  return new Proxy({} as PreferenceProxy, {
    get(_target, key: string): unknown {
      if (key === 'get') {
        return <T>(k: string) => service.get<T>(k);
      }
      if (key === 'set') {
        return <T>(k: string, v: T) => service.set(k, v);
      }

      if (!cache.has(key)) {
        cache.set(key, service.get(key));
      }
      return cache.get(key);
    },

    set(_target, key: string, value: unknown): boolean {
      service.set(key, value);
      cache.set(key, value);
      return true;
    },
  });
}
