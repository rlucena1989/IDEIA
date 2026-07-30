import { ApiProxy } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('proxy');

export class DefaultApiProxy implements ApiProxy {
  private apis = new Map<string, unknown>();

  getProxy<T>(namespace: string): T {
    const api = this.apis.get(namespace);
    if (!api) {
      throw new Error(`API namespace not registered: ${namespace}`);
    }
    return api as T;
  }

  registerApi<T>(namespace: string, api: T): void {
    this.apis.set(namespace, api);
  }

  hasApi(namespace: string): boolean {
    return this.apis.has(namespace);
  }
}
