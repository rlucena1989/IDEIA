import { createLogger } from '@ideia/logger';
import { DeepLinkConfig } from './types';

const logger = createLogger('deep-link-manager');

export class DeepLinkManager {
  private configs: DeepLinkConfig[];
  private registered: boolean;

  constructor(configs?: DeepLinkConfig[]) {
    this.configs = configs ?? [];
    this.registered = false;
  }

  register(): void {
    if (this.configs.length === 0) {
      logger.info('No deep links to register');
      return;
    }
    this.registered = true;
    const protocols = this.configs.map((c) => c.protocol).join(', ');
    logger.info('Deep links registered', { protocols });
  }

  handle(url: string): boolean {
    for (const config of this.configs) {
      if (url.startsWith(`${config.protocol}://`)) {
        logger.info('Deep link handled', { protocol: config.protocol, url });
        return true;
      }
    }
    logger.warn('No handler for deep link', { url });
    return false;
  }

  unregister(): void {
    this.registered = false;
    logger.info('Deep links unregistered');
  }

  getProtocols(): string[] {
    return this.configs.map((c) => c.protocol);
  }

  addConfig(config: DeepLinkConfig): void {
    this.configs.push(config);
    logger.info('Deep link config added', { protocol: config.protocol });
  }

  removeConfig(protocol: string): boolean {
    const index = this.configs.findIndex((c) => c.protocol === protocol);
    if (index === -1) return false;
    this.configs.splice(index, 1);
    logger.info('Deep link config removed', { protocol });
    return true;
  }

  isRegistered(): boolean {
    return this.registered;
  }

  getConfigs(): DeepLinkConfig[] {
    return this.configs.map((c) => ({ ...c }));
  }
}
