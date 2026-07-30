import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';
import type {
  DevContainerConfig,
  ContainerInfo,
} from './types-remote';

export class DevContainers {
  private containers: Map<string, ContainerInfo> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('theia-cloud:dev-containers');
  }

  async buildFromConfig(config: DevContainerConfig): Promise<ContainerInfo> {
    const id = `dc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const info: ContainerInfo = {
      id,
      name: config.image.replace(/[^a-zA-Z0-9_-]/g, '-'),
      image: config.image,
      status: 'created',
      ports: config.forwardPorts,
      mounts: config.mounts.map((m) => `${m.src}:${m.dest}`),
      startedAt: 0,
    };
    this.containers.set(id, info);
    this.logger.info('Container built from config', { containerId: id, image: config.image });
    return info;
  }

  async start(containerId: string): Promise<boolean> {
    const container = this.containers.get(containerId);
    if (!container) {
      return false;
    }
    container.status = 'running';
    container.startedAt = Date.now();
    this.logger.info('Container started', { containerId });
    return true;
  }

  async stop(containerId: string): Promise<boolean> {
    const container = this.containers.get(containerId);
    if (!container) {
      return false;
    }
    container.status = 'stopped';
    this.logger.info('Container stopped', { containerId });
    return true;
  }

  getStatus(containerId: string): ContainerInfo | undefined {
    return this.containers.get(containerId);
  }

  list(): ContainerInfo[] {
    return Array.from(this.containers.values());
  }

  async destroy(containerId: string): Promise<boolean> {
    const container = this.containers.get(containerId);
    if (!container) {
      return false;
    }
    container.status = 'error';
    this.containers.delete(containerId);
    this.logger.info('Container destroyed', { containerId });
    return true;
  }
}
