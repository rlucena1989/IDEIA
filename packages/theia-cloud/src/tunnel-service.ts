import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';
import type {
  Tunnel,
  TunnelConfig,
} from './types-remote';

export class TunnelService {
  private tunnels: Map<string, Tunnel> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('theia-cloud:tunnel-service');
  }

  createTunnel(config: TunnelConfig): Tunnel {
    const id = `tun-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tunnel: Tunnel = {
      id,
      config,
      status: 'active',
      createdAt: Date.now(),
      bytesTransferred: 0,
    };
    this.tunnels.set(id, tunnel);
    this.logger.info('Tunnel created', { tunnelId: id, name: config.name, type: config.type });
    return tunnel;
  }

  closeTunnel(tunnelId: string): boolean {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      return false;
    }
    tunnel.status = 'closed';
    this.logger.info('Tunnel closed', { tunnelId });
    return true;
  }

  listTunnels(filter?: { status?: Tunnel['status']; type?: TunnelConfig['type'] }): Tunnel[] {
    let result = Array.from(this.tunnels.values());
    if (filter) {
      if (filter.status) {
        result = result.filter((t) => t.status === filter.status);
      }
      if (filter.type) {
        result = result.filter((t) => t.config.type === filter.type);
      }
    }
    return result;
  }

  getTunnel(tunnelId: string): Tunnel | undefined {
    return this.tunnels.get(tunnelId);
  }

  getTunnelStatus(tunnelId: string): Tunnel['status'] | undefined {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      return undefined;
    }
    return tunnel.status;
  }
}
